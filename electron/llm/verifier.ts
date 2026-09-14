/**
 * Verifier module for Jeni AI — Milestone 2.5 (Execution + Verification).
 * Evaluates observable tool execution evidence (exit code, timedOut, diagnostics, tool success)
 * and assigns a deterministic VerificationResult status.
 */

import { ToolCall, ToolResult, ToolContext, VerificationResult } from '../types/tools';

export function verifyToolExecution(
  toolCall: ToolCall,
  result: ToolResult,
  context: ToolContext
): VerificationResult {
  const toolName = toolCall.name;

  // 1. Terminal / Shell Command Execution Tool
  if (toolName === 'run_command') {
    const data = (result.data as Record<string, any>) || {};
    const exitCode = data.exitCode !== undefined ? data.exitCode : (result.success ? 0 : -1);
    const timedOut = Boolean(data.timedOut);
    const diagnosticsList = Array.isArray(context.ideContext?.diagnostics)
      ? context.ideContext.diagnostics
      : (context.ideContext?.diagnostics?.list ?? []);

    const errorDiagnostics = diagnosticsList.filter((diag: any) => diag.severity === 'error');

    if (!result.success || timedOut || (exitCode !== null && exitCode !== 0)) {
      const failureReason = timedOut
        ? 'Command timed out before completion'
        : exitCode !== 0 && exitCode !== null
        ? `Command exited with non-zero code (${exitCode})`
        : result.error || 'Command execution failed';

      return {
        status: 'verified_failure',
        reason: failureReason,
        evidence: {
          exitCode,
          timedOut,
          diagnosticsCount: diagnosticsList.length,
          errorMessages: [failureReason, ...(result.error ? [result.error] : [])]
        }
      };
    }

    if (errorDiagnostics.length > 0) {
      const diagMessages = errorDiagnostics.map((d: any) => `${d.file}:${d.line ?? 0} - ${d.message}`);
      return {
        status: 'verified_failure',
        reason: `Command completed with exit code 0 but generated ${errorDiagnostics.length} error diagnostic(s)`,
        evidence: {
          exitCode,
          timedOut,
          diagnosticsCount: errorDiagnostics.length,
          errorMessages: diagMessages
        }
      };
    }

    if (result.success && exitCode === 0) {
      return {
        status: 'verified_success',
        reason: 'Command executed cleanly with exit code 0 and zero error diagnostics',
        evidence: {
          exitCode: 0,
          timedOut: false,
          diagnosticsCount: 0
        }
      };
    }

    return {
      status: 'unable_to_verify',
      reason: 'Command output provided insufficient structured evidence for verification',
      evidence: {
        exitCode,
        timedOut
      }
    };
  }

  // 2. File Mutation Tools (create_file, write_file, edit_file, delete_file)
  if (['create_file', 'write_file', 'edit_file', 'delete_file'].includes(toolName)) {
    if (!result.success) {
      return {
        status: 'verified_failure',
        reason: result.error || `File operation '${toolName}' failed`,
        evidence: {
          fileCheck: {
            path: (toolCall.arguments.path as string) || '',
            verified: false
          },
          errorMessages: result.error ? [result.error] : []
        }
      };
    }

    // Per Milestone 2.5 V1 specification:
    // A file mutation by itself without a follow-up read or diagnostic check MUST be classified as unable_to_verify.
    return {
      status: 'unable_to_verify',
      reason: `File operation '${toolName}' succeeded, but follow-up verification (read-back or diagnostic build check) has not been performed yet`,
      evidence: {
        fileCheck: {
          path: (toolCall.arguments.path as string) || '',
          verified: true
        }
      }
    };
  }

  // 3. Retrieval and Read Tools (read_file, list_directory, search_code, get_ide_context, etc.)
  if (result.success) {
    return {
      status: 'verified_success',
      reason: `Tool '${toolName}' executed successfully`,
      evidence: {}
    };
  } else {
    return {
      status: 'verified_failure',
      reason: result.error || `Tool '${toolName}' failed`,
      evidence: {
        errorMessages: result.error ? [result.error] : []
      }
    };
  }
}
