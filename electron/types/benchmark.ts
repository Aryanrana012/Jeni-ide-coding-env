import type {
  AgentIterationEvent,
  AgentRecoveryEvent,
  AgentRunCompleteEvent,
  AgentToolEvent
} from './telemetry';

export interface BenchmarkWorkspaceSetup {
  files: Record<string, string>;
  directories?: string[];
}

export type BenchmarkSuccessCriterion =
  | {
      id: string;
      type: 'file_exists';
      path: string;
      description: string;
    }
  | {
      id: string;
      type: 'file_contains';
      path: string;
      text: string;
      description: string;
    }
  | {
      id: string;
      type: 'file_not_exists';
      path: string;
      description: string;
    }
  | {
      id: string;
      type: 'command_exit_code';
      command: string;
      exitCode: number;
      description: string;
    }
  | {
      id: string;
      type: 'workspace_unchanged';
      description: string;
    };

export interface BenchmarkTask {
  id: string;
  name: string;
  description: string;
  prompt: string;
  setup: BenchmarkWorkspaceSetup;
  successCriteria: BenchmarkSuccessCriterion[];
}

export interface BenchmarkTrajectory {
  iterations: AgentIterationEvent[];
  toolCalls: AgentToolEvent[];
  recoveries: AgentRecoveryEvent[];
  completion?: AgentRunCompleteEvent;
}

export interface BenchmarkCriterionResult {
  criterionId: string;
  passed: boolean;
  reason: string;
  observed?: unknown;
}

export type BenchmarkExecutionStatus = 'completed' | 'agent_failed' | 'setup_failed' | 'runner_failed';

export interface BenchmarkResult {
  taskId: string;
  executionStatus: BenchmarkExecutionStatus;
  success: boolean;
  durationMs: number;
  trajectory: BenchmarkTrajectory;
  criterionResults: BenchmarkCriterionResult[];
  finalResponse: string;
  error?: string;
}
