/**
 * Interface definition for Jeni AI tools.
 * Phase 1 includes standard interface definitions so Phase 2 agentic tools
 * can seamlessly plug into the IDE tool execution registry.
 */
export interface AgentToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: AgentToolParam[];
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<AgentToolResult>;
}

export interface AgentToolResult {
  success: boolean;
  output: string;
  data?: unknown;
  error?: string;
}

/**
 * Progress event for streaming agent activity.
 */
export interface ProgressEvent {
  type: 'phase_start' | 'phase_complete' | 'tool_start' | 'tool_complete' | 'tool_error' | 'agent_complete';
  timestamp: number;
  messageId?: string;
  phase?: string;
  tool?: string;
  status?: string;
  success?: boolean;
  error?: string;
  message?: string;
  duration?: number;
  totalToolsCalled?: number;
  totalDuration?: number;
  toolsExecuted?: number;
  summary?: string;
}

/**
 * Message that can be a user/assistant message or an activity event.
 */
export interface AgentMessage {
  id: string;
  sender: 'user' | 'jeni' | 'system' | 'activity';
  text: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
  toolCalls?: {
    toolName: string;
    arguments: Record<string, unknown>;
    result?: AgentToolResult;
  }[];
  // For activity messages
  progressEvent?: ProgressEvent;
}

export interface AgentContext {
  workspacePath: string | null;
  activeFilePath: string | null;
  openFiles: string[];
}
