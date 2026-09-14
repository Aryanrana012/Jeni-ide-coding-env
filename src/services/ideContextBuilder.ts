/**
 * IDE Context Builder
 * 
 * Constructs a serializable IDEContext from the current IDE state.
 * Keeps context building logic separate from Zustand state management.
 */

import { IDEContext, Diagnostic } from '../types/ide';
import { IDEState } from '../store/ideStore';

/**
 * Build current IDE context from IDE state.
 * Called when AI needs to understand the current development environment.
 * 
 * @param ideState Current IDEState from Zustand store
 * @returns Serializable IDEContext
 */
export function buildIDEContext(ideState: IDEState): IDEContext {
  // Find active file information
  const activeTab = ideState.activeTabId
    ? ideState.openTabs.find((tab) => tab.id === ideState.activeTabId)
    : null;

  return {
    workspace: {
      root: ideState.workspaceRoot || null,
      name: ideState.workspaceName || null,
    },

    activeFile: {
      path: activeTab?.path || null,
      language: activeTab?.language || null,
      isDirty: activeTab?.isDirty || false,
      isBinary: activeTab?.isBinary || false,
      isOversized: activeTab?.isOversized || false,
    },

    cursor: {
      line: ideState.cursorLine || null,
      column: ideState.cursorColumn || null,
    },

    selection: {
      start: ideState.selectionStart || null,
      end: ideState.selectionEnd || null,
      text: ideState.selectedText || '',
    },

    openTabs: {
      count: ideState.openTabs.length,
      paths: ideState.openTabs.map((tab) => tab.path),
    },

    diagnostics: {
      count: ideState.diagnostics?.length || 0,
      list: ideState.diagnostics || [],
    },

    terminal: {
      lastCommandExitCode: ideState.lastCommandExitCode || null,
      lastCommandResult: ideState.lastCommandResult || null,
    },

    timestamp: Date.now(),
  };
}

/**
 * Format IDEContext for display in agent messages.
 * Used to present context to the AI in a readable format.
 * 
 * @param context The IDEContext to format
 * @returns Human-readable string representation
 */
export function formatIDEContext(context: IDEContext): string {
  const lines: string[] = [];

  lines.push('## IDE Context');
  lines.push('');

  // Workspace
  if (context.workspace.root) {
    lines.push(`**Workspace:** ${context.workspace.name || 'Unknown'}`);
    lines.push(`**Root:** ${context.workspace.root}`);
  } else {
    lines.push('**Workspace:** None (no folder open)');
  }
  lines.push('');

  // Active file
  if (context.activeFile.path) {
    lines.push(`**Active File:** ${context.activeFile.path}`);
    lines.push(`**Language:** ${context.activeFile.language || 'unknown'}`);
    if (context.activeFile.isDirty) {
      lines.push('**Status:** Unsaved changes');
    }
    if (context.activeFile.isBinary) {
      lines.push('**Note:** Binary file (cannot edit)');
    }
    if (context.activeFile.isOversized) {
      lines.push('**Note:** Oversized file (limited view)');
    }
  } else {
    lines.push('**Active File:** None');
  }
  lines.push('');

  // Cursor
  if (context.cursor.line !== null && context.cursor.column !== null) {
    lines.push(`**Cursor:** Line ${context.cursor.line}, Column ${context.cursor.column}`);
  } else {
    lines.push('**Cursor:** Unknown');
  }
  lines.push('');

  // Selection
  if (context.selection.text) {
    lines.push(`**Selection:** ${Math.min(context.selection.text.length, 100)} chars selected`);
    if (context.selection.text.length <= 100) {
      lines.push(`\`\`\`\n${context.selection.text}\n\`\`\``);
    }
  } else {
    lines.push('**Selection:** None');
  }
  lines.push('');

  // Open tabs
  lines.push(`**Open Tabs:** ${context.openTabs.count}`);
  if (context.openTabs.paths.length > 0 && context.openTabs.paths.length <= 10) {
    context.openTabs.paths.forEach((path) => {
      lines.push(`  - ${path}`);
    });
  }
  lines.push('');

  // Diagnostics
  if (context.diagnostics.count > 0) {
    lines.push(`**Diagnostics:** ${context.diagnostics.count} issue${context.diagnostics.count !== 1 ? 's' : ''}`);
    context.diagnostics.list.slice(0, 5).forEach((diag) => {
      const location = diag.line ? `:${diag.line}` : '';
      const badge = diag.severity === 'error' ? '❌' : diag.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`  ${badge} ${diag.file}${location}: ${diag.message}`);
    });
    if (context.diagnostics.count > 5) {
      lines.push(`  ... and ${context.diagnostics.count - 5} more`);
    }
  } else {
    lines.push('**Diagnostics:** None');
  }

  return lines.join('\n');
}
