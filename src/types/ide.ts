export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
  size?: number;
}

export interface TabItem {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  isReadOnly?: boolean;
  bannerMessage?: string;
  isBinary?: boolean;
  isOversized?: boolean;
}

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: number;
}

export interface TerminalOutputLine {
  id: string;
  text: string;
  type: 'stdout' | 'stderr' | 'system';
  timestamp: number;
}

export interface FileReadResponse {
  success: boolean;
  content?: string;
  error?: string;
  size?: number;
  isBinary?: boolean;
  isOversized?: boolean;
  mode?: 'normal' | 'reduced' | 'oversized' | 'binary';
  bannerMessage?: string;
}

export interface OperationResponse {
  success: boolean;
  error?: string;
}

export interface CommandResult {
  command: string;
  cwd?: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;
  success: boolean;
  timedOut?: boolean;
}

/**
 * Diagnostic — represents a code issue detected in the IDE.
 * Only includes diagnostics that can be reliably obtained from the current Jeni architecture.
 */
export interface Diagnostic {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string; // Relative path from workspace root
  line?: number; // 1-indexed
  column?: number; // 1-indexed
  source: 'terminal' | 'editor' | 'build' | 'custom';
  timestamp: number;
}

/**
 * IDEContext — the current state of the IDE.
 * Serializable, minimal representation used by AI agent to understand IDE state.
 */
export interface IDEContext {
  workspace: {
    root: string | null;
    name: string | null;
  };

  activeFile: {
    path: string | null;
    language: string | null;
    isDirty: boolean;
    isBinary: boolean;
    isOversized: boolean;
  };

  cursor: {
    line: number | null;
    column: number | null;
  };

  selection: {
    start: { line: number; column: number } | null;
    end: { line: number; column: number } | null;
    text: string;
  };

  openTabs: {
    count: number;
    paths: string[];
  };

  diagnostics: {
    count: number;
    list: Diagnostic[];
  };

  terminal: {
    lastCommandExitCode: number | null;
    lastCommandResult?: CommandResult | null;
  };

  timestamp: number;
}
