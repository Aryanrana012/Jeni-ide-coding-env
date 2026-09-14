import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { AgentOrchestrator } from '../llm/agent';
import { LLMClient } from '../llm/client';
import type { LLMResponse } from '../types/llm';
import type { AgentLoopOptions } from '../types/tools';
import type { AgentRunObserver } from '../types/telemetry';
import type { BenchmarkExecutionStatus, BenchmarkResult, BenchmarkTask, BenchmarkTrajectory } from '../types/benchmark';

export interface BenchmarkRunnerOptions {
  llmResponseProvider: (request: unknown) => Promise<LLMResponse>;
  agentOptions?: Omit<Partial<AgentLoopOptions>, 'observer' | 'llmResponseProvider'>;
  onWorkspaceCreated?: (workspaceRoot: string) => void;
}

function resolveSetupPath(workspaceRoot: string, relativePath: string): string {
  const resolved = path.resolve(workspaceRoot, relativePath);
  const relative = path.relative(workspaceRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Benchmark setup path is outside the workspace: ${relativePath}`);
  }
  return resolved;
}

function setupWorkspace(task: BenchmarkTask, workspaceRoot: string): void {
  for (const directory of task.setup.directories ?? []) {
    fs.mkdirSync(resolveSetupPath(workspaceRoot, directory), { recursive: true });
  }

  for (const [relativePath, content] of Object.entries(task.setup.files)) {
    const filePath = resolveSetupPath(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function createBenchmarkClient(): LLMClient {
  return new LLMClient({
    apiKey: 'benchmark-only',
    baseUrl: 'http://benchmark.invalid',
    model: 'benchmark-only',
    timeoutMs: 1000
  });
}

function classifyAgentResponse(response: string): BenchmarkExecutionStatus {
  if (/^(❌|⏱️|⚠️ Reached maximum iterations)/.test(response)) return 'agent_failed';
  return 'completed';
}

export async function runBenchmarkTask(
  task: BenchmarkTask,
  options: BenchmarkRunnerOptions
): Promise<BenchmarkResult> {
  const startedAt = Date.now();
  const trajectory: BenchmarkTrajectory = {
    iterations: [],
    toolCalls: [],
    recoveries: []
  };
  let finalResponse = '';
  let workspaceRoot = '';
  let setupComplete = false;

  const observer: AgentRunObserver = {
    onIterationStart: (event) => trajectory.iterations.push(event),
    onToolComplete: (event) => trajectory.toolCalls.push(event),
    onRecovery: (event) => trajectory.recoveries.push(event),
    onComplete: (event) => {
      trajectory.completion = event;
      finalResponse = event.finalResponse;
    }
  };

  try {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jeni-benchmark-'));
    options.onWorkspaceCreated?.(workspaceRoot);
    setupWorkspace(task, workspaceRoot);
    setupComplete = true;

    const agent = new AgentOrchestrator(createBenchmarkClient(), workspaceRoot, {
      ...options.agentOptions,
      observer,
      llmResponseProvider: options.llmResponseProvider
    });
    finalResponse = await agent.sendMessage(task.prompt);

    return {
      taskId: task.id,
      executionStatus: classifyAgentResponse(finalResponse),
      success: false,
      durationMs: Date.now() - startedAt,
      trajectory,
      criterionResults: [],
      finalResponse
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const setupFailed = !setupComplete;
    finalResponse = finalResponse || `${setupFailed ? 'Benchmark setup failed' : 'Benchmark execution failed'}: ${message}`;
    return {
      taskId: task.id,
      executionStatus: setupFailed ? 'setup_failed' : 'runner_failed',
      success: false,
      durationMs: Date.now() - startedAt,
      trajectory,
      criterionResults: [],
      finalResponse,
      error: message
    };
  } finally {
    if (workspaceRoot) {
      try {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      } catch (error) {
        console.warn('[Jeni Benchmark] Workspace cleanup failed:', error);
      }
    }
  }
}
