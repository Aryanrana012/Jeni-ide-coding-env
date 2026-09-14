/**
 * Agent progress event types.
 * Used to stream agent activity to the UI as work progresses.
 */

export type ProgressEventType =
  | 'phase_start'      // Starting a new logical phase (e.g., "Inspecting project")
  | 'phase_complete'   // Completed a phase
  | 'tool_start'       // Starting a tool call
  | 'tool_complete'    // Tool call finished
  | 'tool_error'       // Tool failed
  | 'agent_complete';  // Entire agent loop finished

/**
 * Base progress event structure.
 */
export interface AgentProgressEvent {
  type: ProgressEventType;
  timestamp: number;
  messageId?: string;  // Unique ID for this conversation message
}

/**
 * Phase events group related operations (e.g., multiple file reads).
 */
export interface PhaseStartEvent extends AgentProgressEvent {
  type: 'phase_start';
  phase: string;        // Human-readable phase name (e.g., "Inspecting the project")
  toolCount?: number;   // Expected number of tools in this phase (optional)
}

export interface PhaseCompleteEvent extends AgentProgressEvent {
  type: 'phase_complete';
  phase: string;
  status: 'success' | 'failed';
  summary?: string;     // Optional summary of what was accomplished
  toolsExecuted?: number;
}

/**
 * Individual tool execution events.
 */
export interface ToolStartEvent extends AgentProgressEvent {
  type: 'tool_start';
  tool: string;
  args?: Record<string, unknown>;
}

export interface ToolCompleteEvent extends AgentProgressEvent {
  type: 'tool_complete';
  tool: string;
  success: boolean;
  message?: string;     // Brief success/failure message
  duration?: number;    // Execution time in ms
}

export interface ToolErrorEvent extends AgentProgressEvent {
  type: 'tool_error';
  tool: string;
  error: string;
  duration?: number;
}

/**
 * Final completion event when agent finishes.
 */
export interface AgentCompleteEvent extends AgentProgressEvent {
  type: 'agent_complete';
  totalToolsCalled: number;
  totalDuration: number;
}

export type AnyProgressEvent =
  | PhaseStartEvent
  | PhaseCompleteEvent
  | ToolStartEvent
  | ToolCompleteEvent
  | ToolErrorEvent
  | AgentCompleteEvent;

/**
 * Callback for progress events.
 */
export type ProgressEventCallback = (event: AnyProgressEvent) => void;

/**
 * Configuration for phase grouping logic.
 */
export interface PhaseGroupConfig {
  // Tools that should be grouped into a "reading/inspecting" phase
  readTools: Set<string>;
  // Tools that should be grouped into a "writing/updating" phase
  writeTools: Set<string>;
  // Tools that should be grouped into a "running/executing" phase
  executeTools: Set<string>;
}

/**
 * Get default phase grouping configuration.
 */
export function getDefaultPhaseGroupConfig(): PhaseGroupConfig {
  return {
    readTools: new Set([
      'read_file',
      'read_directory',
      'grep_search',
      'file_search',
      'list_dir'
    ]),
    writeTools: new Set([
      'create_file',
      'write_file',
      'replace_string_in_file',
      'edit_file',
      'delete_file',
      'create_directory'
    ]),
    executeTools: new Set([
      'run_command',
      'run_in_terminal',
      'execute_script'
    ])
  };
}

/**
 * Classify a tool into a phase category.
 */
export function classifyToolPhase(toolName: string, config: PhaseGroupConfig): string | null {
  if (config.readTools.has(toolName)) return 'Inspecting';
  if (config.writeTools.has(toolName)) return 'Updating';
  if (config.executeTools.has(toolName)) return 'Executing';
  return null;
}
