/**
 * Progress event tracker and emitter for Jeni agent.
 * Handles phase grouping, batching of related operations,
 * and emitting progress events to listeners.
 */

import {
  AnyProgressEvent,
  ProgressEventCallback,
  PhaseGroupConfig,
  getDefaultPhaseGroupConfig,
  classifyToolPhase,
  PhaseStartEvent,
  PhaseCompleteEvent,
  ToolCompleteEvent,
  ToolErrorEvent,
  AgentCompleteEvent
} from '../types/agentProgress';

interface TrackedTool {
  name: string;
  phase: string | null;
  startTime: number;
  status: 'pending' | 'success' | 'error';
}

/**
 * Tracks and emits agent progress events.
 * Implements smart phase grouping to avoid showing every single tool call.
 */
export class AgentProgressTracker {
  private callbacks: ProgressEventCallback[] = [];
  private phaseConfig: PhaseGroupConfig;
  private messageId: string;
  private trackedTools: TrackedTool[] = [];
  private currentPhase: string | null = null;
  private phaseStartTime: number = 0;
  private phaseToolCount: number = 0;
  private phaseStatus: 'success' | 'failed' = 'success';
  private agentStartTime: number = 0;
  private totalToolsExecuted: number = 0;

  constructor(
    messageId: string,
    phaseConfig?: PhaseGroupConfig
  ) {
    this.messageId = messageId;
    this.phaseConfig = phaseConfig ?? getDefaultPhaseGroupConfig();
    this.agentStartTime = Date.now();
  }

  /**
   * Subscribe to progress events.
   */
  subscribe(callback: ProgressEventCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const idx = this.callbacks.indexOf(callback);
      if (idx >= 0) this.callbacks.splice(idx, 1);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  private emit(event: AnyProgressEvent): void {
    const eventWithId = {
      ...event,
      messageId: this.messageId,
      timestamp: Date.now()
    };
    this.callbacks.forEach(cb => {
      try {
        cb(eventWithId);
      } catch (err) {
        console.error('[AgentProgressTracker] Callback error:', err);
      }
    });
  }

  /**
   * Track the start of a tool execution.
   * May start a new phase if the tool belongs to a different phase than current.
   */
  startTool(toolName: string, args?: Record<string, unknown>): void {
    const toolPhase = classifyToolPhase(toolName, this.phaseConfig);

    // Check if we need to end the current phase and start a new one
    if (toolPhase && toolPhase !== this.currentPhase) {
      // End previous phase if it exists
      if (this.currentPhase) {
        this.endPhase();
      }

      // Start new phase
      this.currentPhase = toolPhase;
      this.phaseStartTime = Date.now();
      this.phaseToolCount = 0;
      this.phaseStatus = 'success';

      const phaseMsg = this.buildPhaseMessage(toolPhase);
      this.emit({
        type: 'phase_start',
        phase: phaseMsg,
        messageId: this.messageId,
        timestamp: Date.now()
      } as PhaseStartEvent);
    }

    // Track the individual tool
    this.trackedTools.push({
      name: toolName,
      phase: toolPhase,
      startTime: Date.now(),
      status: 'pending'
    });

    if (toolPhase) {
      this.phaseToolCount++;
    }

    // Emit tool start event (can be used for detailed logging if needed)
    // Note: We don't emit this by default to avoid UI clutter; tools are grouped into phases
  }

  /**
   * Mark a tool execution as successful.
   */
  completeTool(toolName: string, message?: string, duration?: number): void {
    const tool = this.trackedTools[this.trackedTools.length - 1];
    if (tool) {
      tool.status = 'success';
    }
    this.totalToolsExecuted++;

    // Optional: emit detailed tool completion (can be toggled)
    // This is mainly for debugging; UI typically shows phases, not individual tools
  }

  /**
   * Mark a tool execution as failed.
   */
  failTool(toolName: string, error: string, duration?: number): void {
    const tool = this.trackedTools[this.trackedTools.length - 1];
    if (tool) {
      tool.status = 'error';
      this.phaseStatus = 'failed';
    }
    this.totalToolsExecuted++;

    // Optional: emit detailed tool error event
    // this.emit({
    //   type: 'tool_error',
    //   tool: toolName,
    //   error,
    //   duration,
    //   messageId: this.messageId,
    //   timestamp: Date.now()
    // } as ToolErrorEvent);
  }

  /**
   * End the current phase and emit completion event.
   */
  private endPhase(): void {
    if (!this.currentPhase) return;

    const duration = Date.now() - this.phaseStartTime;
    const phaseMsg = this.buildPhaseMessage(this.currentPhase);

    this.emit({
      type: 'phase_complete',
      phase: phaseMsg,
      status: this.phaseStatus,
      toolsExecuted: this.phaseToolCount,
      duration,
      messageId: this.messageId,
      timestamp: Date.now()
    } as PhaseCompleteEvent);
  }

  /**
   * Finalize and emit completion event.
   */
  finish(): void {
    // End current phase if any
    if (this.currentPhase) {
      this.endPhase();
      this.currentPhase = null;
    }

    const totalDuration = Date.now() - this.agentStartTime;

    this.emit({
      type: 'agent_complete',
      totalToolsCalled: this.totalToolsExecuted,
      totalDuration,
      messageId: this.messageId,
      timestamp: Date.now()
    } as AgentCompleteEvent);
  }

  /**
   * Build a human-readable phase message.
   */
  private buildPhaseMessage(phase: string): string {
    switch (phase) {
      case 'Inspecting':
        return '🔍 Inspecting the project';
      case 'Updating':
        return '✏️ Updating files';
      case 'Executing':
        return '▶️ Running commands';
      default:
        return `⚙️ ${phase}`;
    }
  }

  /**
   * Get tracking summary.
   */
  getSummary() {
    return {
      totalToolsCalled: this.totalToolsExecuted,
      trackedTools: this.trackedTools,
      currentPhase: this.currentPhase,
      agentDuration: Date.now() - this.agentStartTime
    };
  }
}
