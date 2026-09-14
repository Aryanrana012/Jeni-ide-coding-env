import { LLMClient } from './client';
import { PLANNER_RETRIEVAL_MAX_RESULTS, retrieveRelevantContext } from '../retrieval';
import { IDEContext } from '../../src/types/ide';
import { LLMMessage, LLMResponse } from '../types/llm';
import { Plan, PlanStep } from '../types/plan';
import path from 'node:path';

const PLANNER_PROMPT = `You are Jeni's planning-only mode. Produce a JSON object with exactly these fields: goal, summary, assumptions, relevantFiles, steps, status.
Each step must contain: id, description, reason, status, relevantFiles, and optional notes.
Use only files in the verified retrieval evidence or current IDE context. If verified retrieval evidence is empty, produce one or two concise inspection steps only. State that the subsystem and relevant files were not identified. Do not assume a web app, database, routes, JWT, sessions, or any other architecture.
If a needed location is not verified, use status "needs_inspection", set relevantFiles to [], and explain the gap in notes.
Use status "ready" only when the plan is grounded enough to present. Use "blocked" only when user input is required.
Do not execute tools, write files, run commands, or return tool_calls. Return JSON only.`;

export interface PlanningInput {
  request: string;
  workspaceRoot: string;
  ideContext?: IDEContext | any;
}

export interface PlannerClient {
  sendCompletion(request: {
    model?: string;
    messages: LLMMessage[];
    tools?: unknown[];
    temperature?: number;
    max_tokens?: number;
  }): Promise<LLMResponse>;
}

export function buildPlanningRequest(input: PlanningInput, retrievalEvidence: unknown): Parameters<PlannerClient['sendCompletion']>[0] {
  return {
    messages: [
      { role: 'system', content: PLANNER_PROMPT },
      { role: 'system', content: `Workspace root: ${input.workspaceRoot}` },
      { role: 'system', content: `IDE context (authoritative):\n${JSON.stringify(input.ideContext ?? null, null, 2)}` },
      { role: 'system', content: `Verified retrieval evidence (not full files):\n${JSON.stringify(retrievalEvidence, null, 2)}` },
      { role: 'user', content: input.request }
    ],
    tools: [],
    temperature: 0.2,
    max_tokens: 2000
  };
}

function parsePlanContent(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(normalized);
}

function isToolCallResponse(response: LLMResponse): boolean {
  return response.choices.some((choice) => {
    const message = choice.message as any;
    return (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) || Boolean(message.function_call);
  });
}

function normalizeFile(file: string): string {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

function normalizeContextFile(file: string, workspaceRoot: string): string {
  if (path.isAbsolute(file)) {
    return normalizeFile(path.relative(workspaceRoot, file));
  }
  return normalizeFile(file);
}

function isImplementationEvidence(file: string): boolean {
  const normalized = normalizeFile(file).toLowerCase();
  return !normalized.startsWith('tests/')
    && !normalized.startsWith('test/')
    && !normalized.startsWith('docs/')
    && !normalized.endsWith('/readme.md')
    && normalized !== 'readme.md';
}

export function validatePlan(candidate: unknown, verifiedFiles: Set<string>): Plan {
  if (!candidate || typeof candidate !== 'object') throw new Error('Planner returned a non-object response.');
  const value = candidate as Record<string, unknown>;
  if (typeof value.goal !== 'string' || typeof value.summary !== 'string' || !Array.isArray(value.steps)) {
    throw new Error('Planner response is missing required plan fields.');
  }

  if (verifiedFiles.size === 0) {
    return {
      id: `plan-${Date.now()}`,
      goal: value.goal,
      summary: 'The relevant subsystem and files were not identified from the current IDE context or retrieval results.',
      assumptions: [],
      relevantFiles: [],
      steps: [{
        id: 'step-1',
        description: 'Inspect and retrieve the relevant subsystem before proposing implementation changes.',
        reason: 'No grounded files or subsystem location were found for this request.',
        status: 'needs_inspection',
        relevantFiles: [],
        notes: ['No verified retrieval matches were available.']
      }],
      status: 'blocked'
    };
  }

  const planFiles = Array.isArray(value.relevantFiles) ? value.relevantFiles.filter((file): file is string => typeof file === 'string').map(normalizeFile) : [];
  const assumptions = Array.isArray(value.assumptions) ? value.assumptions.filter((item): item is string => typeof item === 'string') : [];
  const steps: PlanStep[] = value.steps.map((rawStep, index) => {
    if (!rawStep || typeof rawStep !== 'object') throw new Error(`Plan step ${index + 1} is invalid.`);
    const step = rawStep as Record<string, unknown>;
    if (typeof step.description !== 'string' || typeof step.reason !== 'string') {
      throw new Error(`Plan step ${index + 1} is missing description or reason.`);
    }
    const requestedFiles = Array.isArray(step.relevantFiles)
      ? step.relevantFiles.filter((file): file is string => typeof file === 'string').map(normalizeFile)
      : [];
    const invalidFiles = requestedFiles.filter((file) => !verifiedFiles.has(file));
    const notes = Array.isArray(step.notes) ? step.notes.filter((note): note is string => typeof note === 'string') : [];
    if (invalidFiles.length > 0) {
      notes.push(`Unverified files downgraded to inspection: ${invalidFiles.join(', ')}`);
    }
    return {
      id: typeof step.id === 'string' && step.id ? step.id : `step-${index + 1}`,
      description: step.description,
      reason: step.reason,
      status: invalidFiles.length > 0 ? 'needs_inspection' : 'pending',
      relevantFiles: requestedFiles.filter((file) => verifiedFiles.has(file)),
      ...(notes.length > 0 ? { notes } : {})
    };
  });

  const invalidPlanFiles = planFiles.filter((file) => !verifiedFiles.has(file));
  const finalSteps = invalidPlanFiles.length > 0
    ? [...steps, {
        id: `step-${steps.length + 1}`,
        description: 'Inspect the unverified files or subsystem locations before editing.',
        reason: 'The planner referenced locations that were not present in verified retrieval or IDE context.',
        status: 'needs_inspection' as const,
        relevantFiles: [],
        notes: [`Unverified plan files: ${invalidPlanFiles.join(', ')}`]
      }]
    : steps;

  return {
    id: `plan-${Date.now()}`,
    goal: value.goal,
    summary: value.summary,
    assumptions,
    relevantFiles: planFiles.filter((file) => verifiedFiles.has(file)),
    steps: finalSteps,
    status: value.status === 'blocked' ? 'blocked' : 'ready'
  };
}

export async function createPlan(client: PlannerClient, input: PlanningInput): Promise<Plan> {
  const retrieval = retrieveRelevantContext(input.workspaceRoot, input.request, {
    activeFile: input.ideContext?.activeFile?.path,
    maxResults: PLANNER_RETRIEVAL_MAX_RESULTS
  });
  const verifiedFiles = new Set<string>([
    ...retrieval.matches.map((match) => normalizeFile(match.file.relativePath)).filter(isImplementationEvidence),
    ...(input.ideContext?.activeFile?.path ? [normalizeContextFile(input.ideContext.activeFile.path, input.workspaceRoot)] : []),
    ...(input.ideContext?.openTabs?.paths ?? []).map((file: string) => normalizeContextFile(file, input.workspaceRoot))
  ]);
  const response = await client.sendCompletion(buildPlanningRequest(input, retrieval));
  if (isToolCallResponse(response)) {
    throw new Error('Planning response attempted tool execution; plan rejected.');
  }
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Planner returned no content.');
  return validatePlan(parsePlanContent(content), verifiedFiles);
}

export function shouldPlanRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length < 40) return false;
  return /\b(add|build|implement|refactor|migrate|integrate|redesign|upgrade|create)\b/.test(normalized)
    && /\b(and|then|with|support|authentication|authorization|workflow|system|feature|multiple|several)\b/.test(normalized);
}

export function formatPlanForMessage(plan: Plan): string {
  const stepsText = plan.steps.map((step, idx) => {
    const files = step.relevantFiles.length > 0 ? ` (Files: ${step.relevantFiles.join(', ')})` : '';
    const notes = step.notes ? ` [Note: ${step.notes.join('; ')}]` : '';
    return `${idx + 1}. [${step.status.toUpperCase()}] ${step.description} - Reason: ${step.reason}${files}${notes}`;
  }).join('\n');

  return `GROUNDED TASK PLAN (Goal: ${plan.goal})\nSummary: ${plan.summary}\nRelevant Verified Files: ${plan.relevantFiles.join(', ') || 'None'}\nSteps:\n${stepsText}\n\nInstructions for Execution:\nFollow the steps above to execute this task. Use available tools (read_file, edit_file, write_file, run_command, etc.) to complete each step and verify success.`;
}

