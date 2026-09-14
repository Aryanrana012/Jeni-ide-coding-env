import { create } from 'zustand';
import { FileNode, TabItem, RecentProject, TerminalOutputLine, Diagnostic, IDEContext, CommandResult } from '../types/ide';
import { AgentMessage } from '../types/aiAgent';
import { buildIDEContext } from '../services/ideContextBuilder';
import { buildDiagnosticsForCommandResult } from '../utils/commandDiagnostics';

export type SidebarSection = 'explorer' | 'search' | 'sourceControl' | 'extensions' | 'jeni';

export interface IDEState {
  // Workspace & Navigation
  workspaceRoot: string | null;
  workspaceName: string | null;
  isOpeningFolder: boolean;
  workspaceError: string | null;
  recentProjects: RecentProject[];
  fileTree: FileNode[];
  selectedNodePath: string | null;

  // Editor Tabs & Files
  openTabs: TabItem[];
  activeTabId: string | null;
  pendingCloseTabId: string | null;

  // Sidebar & Panes
  sidebarSection: SidebarSection;
  isSidebarCollapsed: boolean;
  sidebarWidth: number;

  // Terminal State
  isTerminalOpen: boolean;
  terminalHeight: number;
  terminalOutput: TerminalOutputLine[];
  isTruePty: boolean;
  lastCommandExitCode: number | null;
  lastCommandResult: CommandResult | null;

  // Editor State (Cursor & Selection)
  cursorLine: number | null;
  cursorColumn: number | null;
  selectionStart: { line: number; column: number } | null;
  selectionEnd: { line: number; column: number } | null;
  selectedText: string;

  // Diagnostics
  diagnostics: Diagnostic[];

  // Jeni AI Panel State
  isJeniPanelOpen: boolean;
  jeniPanelWidth: number;
  jeniMessages: AgentMessage[];
  isJeniLoading: boolean;

  // Dialog Overlays
  isCommandPaletteOpen: boolean;
  isQuickOpenOpen: boolean;

  // Actions
  loadRecentProjects: () => Promise<void>;
  openFolder: () => Promise<void>;
  openFolderByPath: (path: string) => Promise<void>;
  loadDirectory: (dirPath?: string) => Promise<void>;
  toggleFolderNode: (nodeId: string) => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string, force?: boolean) => Promise<boolean>;
  setPendingCloseTabId: (tabId: string | null) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveActiveFile: () => Promise<boolean>;
  saveFile: (tabId: string) => Promise<boolean>;
  createNewFile: (parentPath: string, fileName: string) => Promise<boolean>;
  createNewFolder: (parentPath: string, folderName: string) => Promise<boolean>;
  renameItem: (oldPath: string, newName: string) => Promise<boolean>;
  deleteItem: (targetPath: string) => Promise<boolean>;

  // UI Toggle Actions
  setSidebarSection: (section: SidebarSection) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;
  clearTerminal: () => void;
  restartTerminal: () => Promise<void>;
  appendTerminalOutput: (text: string, type?: 'stdout' | 'stderr' | 'system') => void;
  toggleJeniPanel: () => void;
  setJeniPanelWidth: (width: number) => void;
  sendJeniMessage: (text: string) => void;
  clearJeniConversation: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickOpenOpen: (open: boolean) => void;
  setSelectedNodePath: (path: string | null) => void;

  // Editor State Actions
  updateCursorPosition: (line: number, column: number) => void;
  updateSelection: (start: { line: number; column: number } | null, end: { line: number; column: number } | null, text: string) => void;
  clearSelection: () => void;

  // Diagnostics Actions
  updateDiagnostics: (diagnostics: Diagnostic[]) => void;
  addDiagnostic: (diagnostic: Diagnostic) => void;
  clearDiagnostics: () => void;

  // Terminal Actions
  setLastCommandExitCode: (exitCode: number | null) => void;
  setLastCommandResult: (result: CommandResult | null) => void;
}

// Map extensions to Monaco supported language strings
export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'cpp':
    case 'hpp':
    case 'c':
    case 'h':
      return 'cpp';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'xml':
    case 'svg':
      return 'xml';
    case 'sql':
      return 'sql';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

/**
 * Format a progress event into human-readable text for display.
 */
function formatProgressEventText(event: any): string {
  switch (event.type) {
    case 'phase_start':
      return `${event.phase}...`;
    case 'phase_complete':
      return `✓ ${event.phase}`;
    case 'tool_start':
      return `⚙️ ${event.tool}`;
    case 'tool_complete':
      return `✓ ${event.tool}`;
    case 'tool_error':
      return `✗ ${event.tool}: ${event.error}`;
    case 'agent_complete':
      return `Done — executed ${event.totalToolsCalled} tool${event.totalToolsCalled !== 1 ? 's' : ''} in ${Math.round(event.totalDuration / 1000)}s`;
    default:
      return 'Agent activity...';
  }
}

export function shouldPlanRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length < 40) return false;
  return /\b(add|build|implement|refactor|migrate|integrate|redesign|upgrade|create)\b/.test(normalized)
    && /\b(and|then|with|support|authentication|authorization|workflow|system|feature|multiple|several)\b/.test(normalized);
}

function formatPlanForMessage(plan: any): string {
  const lines = [
    `Plan: ${plan.goal}`,
    '',
    plan.summary,
    '',
    `Status: ${plan.status}`,
    `Relevant files: ${plan.relevantFiles?.length ? plan.relevantFiles.join(', ') : 'None verified'}`,
    '',
    'Steps:'
  ];

  for (const [index, step] of (plan.steps ?? []).entries()) {
    lines.push(`${index + 1}. ${step.description} [${step.status}]`);
    lines.push(`   Reason: ${step.reason}`);
    if (step.relevantFiles?.length) lines.push(`   Files: ${step.relevantFiles.join(', ')}`);
    for (const note of step.notes ?? []) lines.push(`   Note: ${note}`);
  }

  return lines.join('\n');
}

export const useIDEStore = create<IDEState>((set, get) => ({
  workspaceRoot: null,
  workspaceName: null,
  isOpeningFolder: false,
  workspaceError: null,
  recentProjects: [],
  fileTree: [],
  selectedNodePath: null,

  openTabs: [],
  activeTabId: null,
  pendingCloseTabId: null,

  sidebarSection: 'explorer',
  isSidebarCollapsed: false,
  sidebarWidth: 260,

  isTerminalOpen: false,
  terminalHeight: 220,
  terminalOutput: [],
  isTruePty: true,
  lastCommandExitCode: null,
  lastCommandResult: null,

  cursorLine: null,
  cursorColumn: null,
  selectionStart: null,
  selectionEnd: null,
  selectedText: '',

  diagnostics: [],
  isJeniPanelOpen: true,
  jeniPanelWidth: 320,
  jeniMessages: [
    {
      id: 'welcome-msg',
      sender: 'jeni',
      text: "Hello! I'm Jeni, your AI development assistant. Ask me anything or explore the project.",
      timestamp: Date.now()
    }
  ],
  isJeniLoading: false,

  isCommandPaletteOpen: false,
  isQuickOpenOpen: false,

  loadRecentProjects: async () => {
    if (window.jeniAPI?.getRecentProjects) {
      const recent = await window.jeniAPI.getRecentProjects();
      set({ recentProjects: recent });
    }
  },

  openFolder: async () => {
    if (!window.jeniAPI?.selectFolder || get().isOpeningFolder) return;
    set({ isOpeningFolder: true, workspaceError: null });
    try {
      const folderPath = await window.jeniAPI.selectFolder();
      if (folderPath) {
        await get().openFolderByPath(folderPath);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[Jeni Workspace] Failed to open folder:', error);
      set({ workspaceError: `Could not open that folder: ${message}` });
    } finally {
      set({ isOpeningFolder: false });
    }
  },

  openFolderByPath: async (folderPath: string) => {
    set({ workspaceError: null });
    const folderName = folderPath.split(/[/\\]/).pop() || folderPath;
    set({
      workspaceRoot: folderPath,
      workspaceName: folderName,
      openTabs: [],
      activeTabId: null,
      fileTree: [],
      terminalOutput: []
    });

    if (window.jeniAPI?.addRecentProject) {
      const updatedRecent = await window.jeniAPI.addRecentProject(folderPath);
      set({ recentProjects: updatedRecent });
    }

    if (window.jeniAPI?.setAgentWorkspaceRoot) {
      await window.jeniAPI.setAgentWorkspaceRoot(folderPath);
    }

    // Initialize root directory tree
    await get().loadDirectory(folderPath);

    // Initialize Terminal session for the folder
    if (window.jeniAPI?.createTerminal) {
      const termRes = await window.jeniAPI.createTerminal(folderPath);
      set({ isTruePty: termRes.isTruePty });
      get().appendTerminalOutput(`[Jeni Terminal Initialized in ${folderPath}]\n`, 'system');
      if (!termRes.isTruePty) {
        get().appendTerminalOutput(
          `[Note: Running in degraded terminal runner mode (node-pty native module build required for interactive TTY)]\n`,
          'system'
        );
      }
    }
  },

  loadDirectory: async (dirPath?: string) => {
    const root = get().workspaceRoot;
    if (!root || !window.jeniAPI?.readDirectory) return;

    const targetDir = dirPath || root;
    const res = await window.jeniAPI.readDirectory(targetDir, root);

    if (res.success && res.nodes) {
      if (targetDir === root) {
        set({ fileTree: res.nodes });
      } else {
        // Recursively insert nodes into parent folder node
        const updateChildren = (nodes: FileNode[]): FileNode[] => {
          return nodes.map((node) => {
            if (node.path === targetDir) {
              return { ...node, children: res.nodes, isExpanded: true };
            }
            if (node.children && node.children.length > 0) {
              return { ...node, children: updateChildren(node.children) };
            }
            return node;
          });
        };
        set((state) => ({ fileTree: updateChildren(state.fileTree) }));
      }
    } else if (res.error) {
      console.error('Failed to load directory:', res.error);
    }
  },

  toggleFolderNode: async (nodeId: string) => {
    const findAndToggle = (nodes: FileNode[]): { updated: FileNode[]; target?: FileNode } => {
      let found: FileNode | undefined;
      const updated = nodes.map((node) => {
        if (node.id === nodeId) {
          found = node;
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children && node.children.length > 0) {
          const res = findAndToggle(node.children);
          if (res.target) found = res.target;
          return { ...node, children: res.updated };
        }
        return node;
      });
      return { updated, target: found };
    };

    const { updated, target } = findAndToggle(get().fileTree);
    set({ fileTree: updated });

    if (target && !target.isExpanded && target.isDirectory) {
      // Lazy load children on expanding
      await get().loadDirectory(target.path);
    }
  },

  openFile: async (filePath: string) => {
    const root = get().workspaceRoot;
    if (!root || !window.jeniAPI?.readFile) return;

    // Check if file tab is already open
    const existingTab = get().openTabs.find((t) => t.path === filePath);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const res = await window.jeniAPI.readFile(filePath, root);
    if (!res.success) {
      console.error('Failed to open file:', res.error);
      return;
    }

    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    const tabId = filePath;

    const newTab: TabItem = {
      id: tabId,
      name: fileName,
      path: filePath,
      language: detectLanguage(filePath),
      content: res.content || '',
      originalContent: res.content || '',
      isDirty: false,
      bannerMessage: res.bannerMessage,
      isBinary: res.isBinary,
      isOversized: res.isOversized,
      isReadOnly: res.mode === 'oversized' || res.isBinary
    };

    set((state) => ({
      openTabs: [...state.openTabs, newTab],
      activeTabId: tabId
    }));
  },

  selectTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  closeTab: async (tabId: string, force = false): Promise<boolean> => {
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!tab) return true;

    if (tab.isDirty && !force) {
      set({ pendingCloseTabId: tabId });
      return false;
    }

    set((state) => {
      const filtered = state.openTabs.filter((t) => t.id !== tabId);
      let nextActiveId = state.activeTabId;

      if (state.activeTabId === tabId) {
        if (filtered.length > 0) {
          nextActiveId = filtered[filtered.length - 1].id;
        } else {
          nextActiveId = null;
        }
      }

      return {
        openTabs: filtered,
        activeTabId: nextActiveId,
        pendingCloseTabId: state.pendingCloseTabId === tabId ? null : state.pendingCloseTabId
      };
    });

    return true;
  },

  setPendingCloseTabId: (tabId: string | null) => {
    set({ pendingCloseTabId: tabId });
  },

  updateTabContent: (tabId: string, newContent: string) => {
    set((state) => ({
      openTabs: state.openTabs.map((tab) => {
        if (tab.id === tabId) {
          const isDirty = newContent !== tab.originalContent;
          return { ...tab, content: newContent, isDirty };
        }
        return tab;
      })
    }));
  },

  saveActiveFile: async (): Promise<boolean> => {
    const { activeTabId } = get();
    if (!activeTabId) return false;
    return get().saveFile(activeTabId);
  },

  saveFile: async (tabId: string): Promise<boolean> => {
    const root = get().workspaceRoot;
    const tab = get().openTabs.find((t) => t.id === tabId);
    if (!root || !tab || tab.isReadOnly || !window.jeniAPI?.writeFile) return false;

    const res = await window.jeniAPI.writeFile(tab.path, tab.content, root);
    if (res.success) {
      set((state) => ({
        openTabs: state.openTabs.map((t) => (t.id === tabId ? { ...t, originalContent: t.content, isDirty: false } : t))
      }));
      return true;
    } else {
      console.error('Failed to save file:', res.error);
      return false;
    }
  },

  createNewFile: async (parentPath: string, fileName: string): Promise<boolean> => {
    const root = get().workspaceRoot;
    if (!root || !window.jeniAPI?.createFile) return false;

    // Resolve the correct directory to create the file in (parentPath may be a file)
    const resolveCreationDirectory = async (selectedPath: string): Promise<string> => {
      // If selection is empty or equals workspace root, use workspace root
      if (!selectedPath) return root;

      // Try to read as directory first
      if (window.jeniAPI?.readDirectory) {
        try {
          const dirRes: any = await window.jeniAPI.readDirectory(selectedPath, root);
          if (dirRes && dirRes.success) {
            return selectedPath;
          }
        } catch (err) {
          // ignore
        }
      }

      // If not a directory, try reading as a file
      if (window.jeniAPI?.readFile) {
        try {
          const fileRes: any = await window.jeniAPI.readFile(selectedPath, root);
          if (fileRes && fileRes.success) {
            // selectedPath is a file — return its parent directory
            const idx = Math.max(selectedPath.lastIndexOf('/'), selectedPath.lastIndexOf('\\'));
            if (idx > -1) return selectedPath.substring(0, idx);
            return root;
          }
        } catch (err) {
          // ignore
        }
      }

      // Fallback: treat selectedPath as directory-like — but normalize and ensure it's within workspace
      const idx = Math.max(selectedPath.lastIndexOf('/'), selectedPath.lastIndexOf('\\'));
      if (idx > -1) return selectedPath.substring(0, idx + 0);
      return root;
    };

    const creationDir = await resolveCreationDirectory(parentPath);
    const fullPath = `${creationDir}/${fileName}`.replace(/\/+/g, '/');
    const res = await window.jeniAPI.createFile(fullPath, root);
    if (res.success) {
      await get().loadDirectory(creationDir);
      await get().openFile(fullPath);
      return true;
    } else {
      console.error('Failed to create file:', res.error);
      return false;
    }
  },

  createNewFolder: async (parentPath: string, folderName: string): Promise<boolean> => {
    const root = get().workspaceRoot;
    if (!root || !window.jeniAPI?.createFolder) return false;

    // Reuse same resolution logic: if parentPath is a file, use its parent dir
    const resolveCreationDirectory = async (selectedPath: string): Promise<string> => {
      if (!selectedPath) return root;
      if (window.jeniAPI?.readDirectory) {
        try {
          const dirRes: any = await window.jeniAPI.readDirectory(selectedPath, root);
          if (dirRes && dirRes.success) return selectedPath;
        } catch {}
      }
      const idx = Math.max(selectedPath.lastIndexOf('/'), selectedPath.lastIndexOf('\\'));
      if (idx > -1) return selectedPath.substring(0, idx);
      return root;
    };

    const creationDir = await resolveCreationDirectory(parentPath);
    const fullPath = `${creationDir}/${folderName}`.replace(/\/+/g, '/');
    const res = await window.jeniAPI.createFolder(fullPath, root);
    if (res.success) {
      await get().loadDirectory(creationDir);
      return true;
    } else {
      console.error('Failed to create folder:', res.error);
      return false;
    }
  },

  renameItem: async (oldPath: string, newName: string): Promise<boolean> => {
    const root = get().workspaceRoot;
    if (!root || !window.jeniAPI?.renameItem) return false;

    const idxOld = Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\'));
    const parentDir = idxOld > -1 ? oldPath.substring(0, idxOld) : '';
    const newPath = `${parentDir}/${newName}`;

    const res = await window.jeniAPI.renameItem(oldPath, newPath, root);
    if (res.success) {
      // Update open tabs if path changed
      set((state) => ({
        openTabs: state.openTabs.map((tab) => {
          if (tab.path === oldPath) {
            return {
              ...tab,
              id: newPath,
              path: newPath,
              name: newName,
              language: detectLanguage(newPath)
            };
          }
          return tab;
        }),
        activeTabId: state.activeTabId === oldPath ? newPath : state.activeTabId
      }));

      await get().loadDirectory(parentDir || root);
      return true;
    } else {
      console.error('Failed to rename item:', res.error);
      return false;
    }
  },

  deleteItem: async (targetPath: string): Promise<boolean> => {
    const root = get().workspaceRoot;
    if (!root || !window.jeniAPI?.deleteItem) return false;

    const idxTarget = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'));
    const parentDir = idxTarget > -1 ? targetPath.substring(0, idxTarget) : '';
    const res = await window.jeniAPI.deleteItem(targetPath, root);
    if (res.success) {
      // Close tabs for deleted file
      set((state) => {
        const remainingTabs = state.openTabs.filter((t) => t.path !== targetPath);
        return {
          openTabs: remainingTabs,
          activeTabId: state.activeTabId === targetPath ? (remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null) : state.activeTabId
        };
      });

      await get().loadDirectory(parentDir || root);
      return true;
    } else {
      console.error('Failed to delete item:', res.error);
      return false;
    }
  },

  setSidebarSection: (section: SidebarSection) => {
    if (get().sidebarSection === section && !get().isSidebarCollapsed) {
      set({ isSidebarCollapsed: true });
    } else {
      set({ sidebarSection: section, isSidebarCollapsed: false });
    }
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },

  setSidebarWidth: (width: number) => {
    set({ sidebarWidth: Math.max(180, Math.min(500, width)) });
  },

  toggleTerminal: () => {
    set((state) => ({ isTerminalOpen: !state.isTerminalOpen }));
  },

  setTerminalHeight: (height: number) => {
    set({ terminalHeight: Math.max(120, Math.min(600, height)) });
  },

  clearTerminal: () => {
    set({ terminalOutput: [] });
  },

  restartTerminal: async () => {
    const root = get().workspaceRoot;
    if (root && window.jeniAPI?.restartTerminal) {
      set({ terminalOutput: [] });
      const res = await window.jeniAPI.restartTerminal(root);
      set({ isTruePty: res.isTruePty });
      get().appendTerminalOutput(`[Jeni Terminal Restarted]\n`, 'system');
    }
  },

  appendTerminalOutput: (text: string, type: 'stdout' | 'stderr' | 'system' = 'stdout') => {
    set((state) => ({
      terminalOutput: [
        ...state.terminalOutput,
        {
          id: Math.random().toString(36).substring(7),
          text,
          type,
          timestamp: Date.now()
        }
      ].slice(-1000) // cap history
    }));
  },

  toggleJeniPanel: () => {
    set((state) => ({ isJeniPanelOpen: !state.isJeniPanelOpen }));
  },

  setJeniPanelWidth: (width: number) => {
    set({ jeniPanelWidth: Math.max(220, Math.min(550, width)) });
  },

  sendJeniMessage: (text: string) => {
    if (!text.trim()) return;

    const userMsg: AgentMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: text.trim(),
      timestamp: Date.now()
    };

    set((state) => ({
      jeniMessages: [...state.jeniMessages, userMsg],
      isJeniLoading: true
    }));

    // Set up progress event listener
    let unsubscribeProgress: (() => void) | undefined;
    
    if (window.jeniAPI?.onAgentProgress) {
      unsubscribeProgress = window.jeniAPI.onAgentProgress((event: any) => {
        // Create an activity message from the progress event
        const activityMsg: AgentMessage = {
          id: Math.random().toString(36).substring(7),
          sender: 'activity',
          text: formatProgressEventText(event),
          timestamp: Date.now(),
          progressEvent: event
        };
        
        set((state) => ({
          jeniMessages: [...state.jeniMessages, activityMsg]
        }));
      });
    }

    // Build current IDE context to send with message
    const currentState = get();
    const ideContext = buildIDEContext(currentState);

    // Milestone 2.7: Unified Single Entrypoint
    // All normal user requests flow through sendAgentMessage (AgentOrchestrator.sendMessage).
    // Adaptive planning and grounded plan execution are handled centrally in AgentOrchestrator.
    if (window.jeniAPI?.sendAgentMessage) {
      window.jeniAPI.sendAgentMessage(text.trim(), ideContext).then((result: any) => {
        if (unsubscribeProgress) {
          unsubscribeProgress();
        }

        if (result.success && result.response) {
          const jeniMsg: AgentMessage = {
            id: Math.random().toString(36).substring(7),
            sender: 'jeni',
            text: result.response,
            timestamp: Date.now()
          };
          set((state) => ({
            jeniMessages: [...state.jeniMessages, jeniMsg],
            isJeniLoading: false
          }));

          const root = get().workspaceRoot;
          if (root) {
            get().loadDirectory();
          }
        } else {
          const errorMsg: AgentMessage = {
            id: Math.random().toString(36).substring(7),
            sender: 'jeni',
            text: `⚠️ ${result.error || 'Unknown error occurred'}`,
            timestamp: Date.now()
          };
          set((state) => ({
            jeniMessages: [...state.jeniMessages, errorMsg],
            isJeniLoading: false
          }));
        }
      }).catch((error: Error) => {
        if (unsubscribeProgress) {
          unsubscribeProgress();
        }

        const errorMsg: AgentMessage = {
          id: Math.random().toString(36).substring(7),
          sender: 'jeni',
          text: `⚠️ Failed to reach Jeni AI: ${error.message}`,
          timestamp: Date.now()
        };
        set((state) => ({
          jeniMessages: [...state.jeniMessages, errorMsg],
          isJeniLoading: false
        }));
      });
    } else {
      // Cleanup progress listener
      if (unsubscribeProgress) {
        unsubscribeProgress();
      }

      // Fallback if IPC API is not available
      const errorMsg: AgentMessage = {
        id: Math.random().toString(36).substring(7),
        sender: 'jeni',
        text: '⚠️ Jeni API not available',
        timestamp: Date.now()
      };
      set((state) => ({
        jeniMessages: [...state.jeniMessages, errorMsg],
        isJeniLoading: false
      }));
    }
  },

  clearJeniConversation: () => {
    set({
      jeniMessages: [
        {
          id: 'welcome-msg',
          sender: 'jeni',
          text: "Hello! I'm Jeni, your AI development assistant. Ask me anything or explore the project.",
          timestamp: Date.now()
        }
      ]
    });
  },

  setCommandPaletteOpen: (open: boolean) => {
    set({ isCommandPaletteOpen: open });
  },

  setQuickOpenOpen: (open: boolean) => {
    set({ isQuickOpenOpen: open });
  },

  setSelectedNodePath: (path: string | null) => {
    set({ selectedNodePath: path });
  },

  // Editor State Actions
  updateCursorPosition: (line: number, column: number) => {
    set({ cursorLine: line, cursorColumn: column });
  },

  updateSelection: (start, end, text) => {
    set({ selectionStart: start, selectionEnd: end, selectedText: text });
  },

  clearSelection: () => {
    set({ selectionStart: null, selectionEnd: null, selectedText: '' });
  },

  // Diagnostics Actions
  updateDiagnostics: (diagnostics) => {
    set({ diagnostics });
  },

  addDiagnostic: (diagnostic) => {
    set((state) => ({
      diagnostics: [...state.diagnostics, diagnostic]
    }));
  },

  clearDiagnostics: () => {
    set({ diagnostics: [] });
  },

  // Terminal Actions
  setLastCommandExitCode: (exitCode) => {
    set({ lastCommandExitCode: exitCode });
  },

  setLastCommandResult: (result) => {
    const nextState = { lastCommandResult: result, lastCommandExitCode: result?.exitCode ?? null };
    const diagnostics = result ? buildDiagnosticsForCommandResult(result, get().diagnostics) : get().diagnostics;
    set({ ...nextState, diagnostics });
    console.log('[ideStore] setLastCommandResult', result);

    const ideContext = buildIDEContext({ ...get(), ...nextState, diagnostics });
    if (window.jeniAPI?.syncIDEContext) {
      window.jeniAPI.syncIDEContext(ideContext).catch((error: Error) => {
        console.warn('[ideStore] Failed to sync IDE context after terminal result update:', error.message);
      });
    }
  }
}));
