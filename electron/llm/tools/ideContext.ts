/**
 * IDE Context Tool
 * 
 * Provides the AI agent with access to the current IDE state.
 */

import { ToolResult, ToolContext } from '../../types/tools';

/**
 * Get current IDE context.
 * Returns structured information about the current development environment.
 */
export async function getIDEContextTool(_params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  try {
    // Receive IDE context from ToolContext (provided by AgentOrchestrator)
    if (!context.ideContext) {
      return {
        success: true,
        output: 'IDE context: No folder currently open. Open a workspace to begin development.',
        data: {
          workspace: { root: null, name: null },
          activeFile: { path: null, language: null, isDirty: false, isBinary: false, isOversized: false },
          cursor: { line: null, column: null },
          selection: { start: null, end: null, text: '' },
          openTabs: { count: 0, paths: [] },
          diagnostics: { count: 0, list: [] },
          terminal: { lastCommandExitCode: null, lastCommandResult: null }
        }
      };
    }

    // Format context for LLM consumption
    const contextSummary = formatContextForLLM(context.ideContext);

    return {
      success: true,
      output: contextSummary,
      data: context.ideContext
    };
  } catch (err: any) {
    return {
      success: false,
      output: `Failed to retrieve IDE context: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * Format IDE context for display in LLM responses.
 */
function formatContextForLLM(ideContext: any): string {
  const lines: string[] = [];

  lines.push('Current IDE State:');
  lines.push('');

  // Workspace
  if (ideContext.workspace?.root) {
    lines.push(`Workspace: ${ideContext.workspace.name || 'Unknown'}`);
    lines.push(`Root: ${ideContext.workspace.root}`);
  } else {
    lines.push('Workspace: None (no folder open)');
  }
  lines.push('');

  // Active file
  if (ideContext.activeFile?.path) {
    lines.push(`Current file: ${ideContext.activeFile.path}`);
    lines.push(`Language: ${ideContext.activeFile.language || 'unknown'}`);
    if (ideContext.activeFile.isDirty) {
      lines.push('Status: Unsaved changes');
    }
  } else {
    lines.push('Current file: None');
  }
  lines.push('');

  // Cursor
  if (ideContext.cursor?.line !== null) {
    lines.push(`Cursor: Line ${ideContext.cursor.line}, Column ${ideContext.cursor.column}`);
  }

  // Selection
  if (ideContext.selection?.text) {
    lines.push(`Selection: ${ideContext.selection.text.slice(0, 120)}${ideContext.selection.text.length > 120 ? '...' : ''}`);
  } else {
    lines.push('Selection: none');
  }

  // Open files
  if (ideContext.openTabs?.count > 0) {
    lines.push(`Open tabs: ${ideContext.openTabs.count}`);
  }

  // Terminal result
  if (ideContext.terminal?.lastCommandResult) {
    const last = ideContext.terminal.lastCommandResult;
    lines.push(`Last command: ${last.command}`);
    lines.push(`Last command exit: ${last.exitCode} (${last.success ? 'success' : 'failed'})`);
    if (last.stdout.trim()) {
      lines.push(`Last command stdout: ${last.stdout.trim().slice(0, 200)}${last.stdout.trim().length > 200 ? '...' : ''}`);
    }
    if (last.stderr.trim()) {
      lines.push(`Last command stderr: ${last.stderr.trim().slice(0, 200)}${last.stderr.trim().length > 200 ? '...' : ''}`);
    }
  }

  // Diagnostics
  if (ideContext.diagnostics?.count > 0) {
    lines.push(`Issues: ${ideContext.diagnostics.count}`);
  }

  return lines.join('\n');
}
