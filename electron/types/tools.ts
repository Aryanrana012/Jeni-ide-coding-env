/**
 * Tool system types for Jeni agent.
 * Defines the structure of tools, their parameters, results, and execution context.
 */

import type { LLMResponse } from './llm';

/**
 * Parameter definition for a tool parameter.
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  enum?: string[];
}

/**
 * Tool definition for OpenAI-compatible API function calling.
 * Sent to LLM so it knows what tools are available.
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameter>;
      required: string[];
    };
  };
}

/**
 * Execution context provided to tool executors.
 * Contains workspace info and terminal session for agent operations.
 */
export interface ToolContext {
  workspaceRoot: string;
  agentTerminalSession?: TerminalSession;
  ideContext?: any; // IDEContext from renderer - optional for now
}

/**
 * Terminal session for agent command execution.
 * Separate from user's interactive terminal.
 */
export interface TerminalSession {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  isTruePty: boolean;
}

export type VerificationStatus = 'verified_success' | 'verified_failure' | 'unable_to_verify';

export interface VerificationResult {
  status: VerificationStatus;
  reason: string;
  evidence: {
    exitCode?: number | null;
    timedOut?: boolean;
    diagnosticsCount?: number;
    errorMessages?: string[];
    fileCheck?: { path: string; verified: boolean };
  };
}

/**
 * Result returned by a tool after execution.
 * Contains success flag, human-readable output, structured data, and error info.
 */
export interface ToolResult {
  success: boolean;
  output: string; // Human-readable summary for LLM
  data?: unknown; // Structured data (file content, exit code, etc.)
  error?: string; // Error message if failed
  verification?: VerificationResult;
}

/**
 * Tool call requested by LLM.
 * Parsed from LLM response to execute the requested tool.
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Configured tool with both definition and executor.
 */
export interface ConfiguredTool {
  definition: ToolDefinition;
  executor: (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

/**
 * Agent loop iteration result.
 * Tracks what happened during one iteration of the agent loop.
 */
export interface AgentLoopIteration {
  iterationNumber: number;
  llmResponse: string;
  toolCalls: ToolCall[];
  toolResults: Map<string, ToolResult>;
  hasMoreWork: boolean; // true if LLM wants to call more tools
}

/**
 * Agent loop options for safeguards.
 */
export interface AgentLoopOptions {
  maxIterations: number; // Default 15
  maxTotalTimeMs: number; // Default 5 minutes
  toolTimeoutMs: number; // Default 30 seconds
  observer?: import('./telemetry').AgentRunObserver;
  llmResponseProvider?: (request: unknown) => Promise<LLMResponse>;
}
