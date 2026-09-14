import { ToolCall, ToolResult, VerificationResult } from './tools';

export type AgentToolCategory = 'INVESTIGATIVE' | 'RECOVERY_ACTION';

export interface AgentIterationEvent {
  iteration: number;
}

export interface AgentToolEvent {
  iteration: number;
  toolCall: ToolCall;
  result: ToolResult;
  durationMs: number;
  verification: VerificationResult;
}

export interface AgentRecoveryEvent {
  iteration: number;
  toolCall: ToolCall;
  category: AgentToolCategory;
  attemptNumber: number;
  maxAttempts: number;
  inRecovery: boolean;
  repeatedAction: boolean;
  limitReached: boolean;
  verification: VerificationResult;
}

export interface AgentRunCompleteEvent {
  totalIterations: number;
  totalDurationMs: number;
  finalResponse: string;
}

export interface AgentRunObserver {
  onIterationStart?: (event: AgentIterationEvent) => void;
  onToolComplete?: (event: AgentToolEvent) => void;
  onRecovery?: (event: AgentRecoveryEvent) => void;
  onComplete?: (event: AgentRunCompleteEvent) => void;
}
