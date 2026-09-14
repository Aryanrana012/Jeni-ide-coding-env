import { FileNode, FileReadResponse, OperationResponse, RecentProject } from './ide';

export interface AgentProgressEvent {
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

export interface IJeniAPI {
  // Workspace / Directory operations
  selectFolder: () => Promise<string | null>;
  readDirectory: (dirPath: string, workspaceRoot: string) => Promise<{ success: boolean; nodes?: FileNode[]; error?: string }>;
  
  // File operations
  readFile: (filePath: string, workspaceRoot: string) => Promise<FileReadResponse>;
  writeFile: (filePath: string, content: string, workspaceRoot: string) => Promise<OperationResponse>;
  createFile: (filePath: string, workspaceRoot: string) => Promise<OperationResponse>;
  createFolder: (folderPath: string, workspaceRoot: string) => Promise<OperationResponse>;
  renameItem: (oldPath: string, newPath: string, workspaceRoot: string) => Promise<OperationResponse>;
  deleteItem: (itemPath: string, workspaceRoot: string) => Promise<OperationResponse>;
  
  // Terminal API
  createTerminal: (cwd: string) => Promise<{ success: boolean; isTruePty: boolean; error?: string }>;
  sendTerminalData: (data: string) => void;
  resizeTerminal: (cols: number, rows: number) => void;
  restartTerminal: (cwd: string) => Promise<{ success: boolean; isTruePty: boolean; error?: string }>;
  onTerminalData: (callback: (data: string) => void) => () => void;

  // Recent Projects API
  getRecentProjects: () => Promise<RecentProject[]>;
  addRecentProject: (projectPath: string) => Promise<RecentProject[]>;
  removeRecentProject: (projectPath: string) => Promise<RecentProject[]>;

  // Jeni AI Agent API
  sendAgentMessage: (userMessage: string, ideContext?: any) => Promise<{ success: boolean; response?: string; error?: string }>;
  createAgentPlan: (userMessage: string, ideContext?: any) => Promise<{ success: boolean; plan?: unknown; error?: string }>;
  syncIDEContext: (ideContext: any) => Promise<{ success: boolean; error?: string }>;
  setAgentWorkspaceRoot: (workspaceRoot: string) => Promise<{ success: boolean; error?: string }>;
  onAgentProgress: (callback: (event: AgentProgressEvent) => void) => () => void;

  // Native App Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    jeniAPI: IJeniAPI;
  }
}
