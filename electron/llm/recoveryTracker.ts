/**
 * Recovery Tracker for Jeni AI — Milestone 2.6 (Error Recovery).
 * Manages deterministic recovery state, counts actual recovery attempts (excluding read-only investigation),
 * detects exact repeated actions, and enforces the hard recovery limit (maxRecoveryAttempts = 3).
 */

import { ToolCall, ToolResult, VerificationResult } from '../types/tools';

export type ToolCategory = 'INVESTIGATIVE' | 'RECOVERY_ACTION';

export interface ActionRecord {
  toolName: string;
  argsString: string;
  timestamp: number;
  verificationStatus?: string;
}

export interface RecoveryAttemptRecord {
  attemptNumber: number;
  action: ActionRecord;
  verification: VerificationResult;
}

export class RecoveryTracker {
  private inRecovery: boolean = false;
  private recoveryAttemptCount: number = 0;
  private readonly maxRecoveryAttempts: number = 3;
  private lastFailureReason: string = '';
  private history: ActionRecord[] = [];
  private recoveryAttempts: RecoveryAttemptRecord[] = [];

  public getInRecovery(): boolean {
    return this.inRecovery;
  }

  public getRecoveryAttemptCount(): number {
    return this.recoveryAttemptCount;
  }

  public getMaxRecoveryAttempts(): number {
    return this.maxRecoveryAttempts;
  }

  public getLastFailureReason(): string {
    return this.lastFailureReason;
  }

  public isLimitReached(): boolean {
    return this.recoveryAttemptCount >= this.maxRecoveryAttempts;
  }

  /**
   * Classify tool call into INVESTIGATIVE (read-only) vs RECOVERY_ACTION (corrective/mutation/retry).
   */
  public classifyToolCall(toolName: string): ToolCategory {
    const investigativeTools = [
      'read_file',
      'list_directory',
      'search_code',
      'discover_files',
      'search_files',
      'search_regex',
      'search_filenames',
      'retrieve_relevant_context',
      'get_ide_context'
    ];

    if (investigativeTools.includes(toolName)) {
      return 'INVESTIGATIVE';
    }
    return 'RECOVERY_ACTION';
  }

  /**
   * Check if exact same tool name + exact serialized arguments were already executed in current recovery task.
   */
  public isRepeatedAction(toolCall: ToolCall): boolean {
    if (!this.inRecovery) return false;

    const argsString = JSON.stringify(toolCall.arguments ?? {});
    return this.history.some(
      (record) => record.toolName === toolCall.name && record.argsString === argsString
    );
  }

  /**
   * Record tool execution result and update recovery state.
   */
  public recordToolExecution(
    toolCall: ToolCall,
    result: ToolResult
  ): { category: ToolCategory; isRepeated: boolean; limitExceeded: boolean } {
    const toolName = toolCall.name;
    const argsString = JSON.stringify(toolCall.arguments ?? {});
    const category = this.classifyToolCall(toolName);
    const verificationStatus = result.verification?.status ?? 'unable_to_verify';

    // Record in history
    this.history.push({
      toolName,
      argsString,
      timestamp: Date.now(),
      verificationStatus
    });

    // Enter recovery mode if verification status is verified_failure
    if (verificationStatus === 'verified_failure') {
      this.inRecovery = true;
      if (result.verification?.reason) {
        this.lastFailureReason = result.verification.reason;
      }
    }

    let isRepeated = false;
    let limitExceeded = false;

    // A successful mutation may be unable_to_verify until a later read-back. It still
    // completed the requested action and must not consume recovery attempts.
    if (this.inRecovery && category === 'RECOVERY_ACTION' && result.success && verificationStatus === 'unable_to_verify') {
      this.inRecovery = false;
      return { category, isRepeated, limitExceeded };
    }

    // Increment recovery attempt counter ONLY for actual recovery actions when in recovery
    if (this.inRecovery && category === 'RECOVERY_ACTION') {
      this.recoveryAttemptCount++;

      if (result.verification) {
        this.recoveryAttempts.push({
          attemptNumber: this.recoveryAttemptCount,
          action: { toolName, argsString, timestamp: Date.now(), verificationStatus },
          verification: result.verification
        });
      }

      if (verificationStatus === 'verified_success') {
        // Successful corrective action resolves recovery mode
        this.inRecovery = false;
      }

      if (this.recoveryAttemptCount >= this.maxRecoveryAttempts) {
        limitExceeded = true;
      }
    }

    return { category, isRepeated, limitExceeded };
  }

  /**
   * Get history of recovery attempts.
   */
  public getRecoveryHistory(): RecoveryAttemptRecord[] {
    return [...this.recoveryAttempts];
  }

  /**
   * Reset recovery state for a new request.
   */
  public reset(): void {
    this.inRecovery = false;
    this.recoveryAttemptCount = 0;
    this.lastFailureReason = '';
    this.history = [];
    this.recoveryAttempts = [];
  }
}
