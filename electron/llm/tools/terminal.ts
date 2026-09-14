/**
 * Terminal tools for Jeni agent.
 * Implements: run_command
 * Creates separate terminal session for agent (not user's interactive terminal)
 */

import { spawn } from 'child_process';
import { ToolResult, ToolContext } from '../../types/tools';
import { normalizeCommandDiagnostics } from '../../../src/utils/commandDiagnostics';

export { normalizeCommandDiagnostics } from '../../../src/utils/commandDiagnostics';

/** Adapt common POSIX command composition to the Windows PowerShell 5 host. */
export function normalizeWindowsCommand(command: string): string {
  if (process.platform !== 'win32') return command;

  return command
    .replace(/\s*&&\s*/g, '; ')
    .replace(/\bls\s+-la\b/g, 'Get-ChildItem -Force');
}

function updateContextCommandState(context: ToolContext | undefined, result: any): void {
  if (!context?.ideContext) return;

  const terminal = context.ideContext.terminal ?? { lastCommandExitCode: null, lastCommandResult: null };
  terminal.lastCommandExitCode = result.exitCode ?? null;
  terminal.lastCommandResult = result;
  context.ideContext.terminal = terminal;

  const priorDiagnostics = Array.isArray(context.ideContext.diagnostics)
    ? context.ideContext.diagnostics
    : (context.ideContext.diagnostics?.list ?? []);

  const retained = priorDiagnostics.filter((diag: any) => diag.source !== 'terminal' && diag.source !== 'build');
  const commandDiagnostics = normalizeCommandDiagnostics(result.command, result.stdout || '', result.stderr || '', result.cwd);
  context.ideContext.diagnostics = [...retained, ...commandDiagnostics.map((diag) => ({
    id: `${diag.source}-${Date.now()}-${diag.file}-${diag.line ?? '0'}-${diag.column ?? '0'}`,
    ...diag,
    timestamp: Date.now()
  }))];
}

/**
 * Run a shell command in the agent's terminal session.
 * Separate from the user's interactive terminal in TerminalPanel.
 * Captures stdout, stderr, and exit code.
 */
export async function runCommandTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const command = params.command as string;
  const cwd = (params.cwd as string) || context.workspaceRoot;
  const timeoutMs = (params.timeout as number) || 30000; // Default 30 seconds

  if (!command) {
    return {
      success: false,
      output: 'Error: command parameter is required',
      error: 'Missing command parameter'
    };
  }

  if (timeoutMs < 0 || timeoutMs > 300000) {
    return {
      success: false,
      output: 'Error: timeout must be between 0 and 300000 ms',
      error: 'Invalid timeout'
    };
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const startedAt = Date.now();

    try {
      const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
      const shellArgs = process.platform === 'win32' ? ['-NoProfile', '-Command'] : ['-c'];

      const proc = spawn(shell, [...shellArgs, normalizeWindowsCommand(command)], {
        cwd: cwd || process.cwd(),
        timeout: timeoutMs,
        shell: false
      });

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 1000);
      }, timeoutMs);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timeoutHandle);

        const maxOutputSize = 50000;
        if (stdout.length > maxOutputSize) {
          stdout = stdout.substring(0, maxOutputSize) + '\n... (output truncated)';
        }
        if (stderr.length > maxOutputSize) {
          stderr = stderr.substring(0, maxOutputSize) + '\n... (output truncated)';
        }

        const effectiveExitCode = exitCode ?? (timedOut ? -1 : 0);
        const success = !timedOut && effectiveExitCode === 0;
        const duration = Date.now() - startedAt;
        const result = {
          command,
          cwd,
          exitCode: effectiveExitCode,
          stdout,
          stderr,
          duration,
          success,
          timedOut
        };

        updateContextCommandState(context, result);

        const output = `Executed: ${command}\nExit code: ${effectiveExitCode}${timedOut ? ' (TIMEOUT)' : ''}\nDuration: ${duration}ms\n\nSTDOUT:\n${stdout || '(empty)'}\n\nSTDERR:\n${stderr || '(empty)'}`;

        resolve({
          success,
          output,
          data: result
        });
      });

      proc.on('error', (err: any) => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startedAt;
        const result = {
          command,
          cwd,
          exitCode: -1,
          stdout: '',
          stderr: err.message,
          duration,
          success: false,
          timedOut: false
        };

        updateContextCommandState(context, result);

        resolve({
          success: false,
          output: `Error executing command: ${err.message}`,
          error: err.message,
          data: result
        });
      });
    } catch (err: any) {
      const duration = Date.now() - startedAt;
      const result = {
        command,
        cwd,
        exitCode: -1,
        stdout: '',
        stderr: err.message,
        duration,
        success: false,
        timedOut: false
      };

      updateContextCommandState(context, result);

      resolve({
        success: false,
        output: `Error spawning process: ${err.message}`,
        error: err.message,
        data: result
      });
    }
  });
}
