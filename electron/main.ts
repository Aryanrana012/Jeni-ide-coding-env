// Load .env.local FIRST - before anything else that needs environment variables
import { loadEnvironmentFile } from './env';
loadEnvironmentFile();

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  readDirectory,
  readFile,
  writeFile,
  createFile,
  createFolder,
  renameItem,
  deleteItem
} from './filesystem';
import {
  createTerminalSession,
  sendTerminalData,
  resizeTerminal,
  killTerminalSession
} from './terminal';
import {
  loadRecentProjects,
  addRecentProject,
  removeRecentProject
} from './store/recentProjects';
import { LLMClient } from './llm/client';
import { AgentOrchestrator } from './llm/agent';
import { loadLLMConfig, isLLMConfigured } from './config';
import { JENI_SYSTEM_PROMPT } from './llm/prompts';
import { EmbedderService } from './retrieval/embedder';
import { applyStoredLLMSettings, getPublicLLMSettings, saveLLMSettings } from './llmSettings';

let mainWindow: BrowserWindow | null = null;
let llmClient: LLMClient | null = null;
let agentOrchestrator: AgentOrchestrator | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Jeni IDE',
    frame: true,
    backgroundColor: '#0d0e12',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Strip standard menu bar for custom IDE aesthetic
  mainWindow.setMenuBarVisibility(false);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeAgent(): void {
  agentOrchestrator = null;
  llmClient = null;

  if (!isLLMConfigured()) {
    console.warn('[Jeni Agent] LLM not configured. Set it in Jeni Settings to enable.');
    return;
  }

  try {
    const config = loadLLMConfig();
    llmClient = new LLMClient(config);
    agentOrchestrator = new AgentOrchestrator(llmClient, process.cwd());
    console.log('[Jeni Agent] LLM client initialized');
  } catch (error) {
    console.warn('[Jeni Agent] LLM configuration error:', error instanceof Error ? error.message : error);
  }
}

app.whenReady().then(() => {
  applyStoredLLMSettings();
  initializeAgent();

  setupIPCHandlers();
  createWindow();

  // Warm the local embedding model without delaying window creation.
  EmbedderService.getInstance().initialize().catch(() => {
    console.warn('[Jeni Embedder] Model warm-up failed - semantic search will fall back to keyword.');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  killTerminalSession();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIPCHandlers() {
  ipcMain.handle('llm:getSettings', () => getPublicLLMSettings());

  ipcMain.handle('llm:saveSettings', (_, settings: { apiKey: string; baseUrl: string; model: string }) => {
    const savedSettings = saveLLMSettings(settings);
    initializeAgent();
    return savedSettings;
  });

  // Folder Dialog
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Open Workspace Folder in Jeni'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const selectedPath = result.filePaths[0];
    addRecentProject(selectedPath);
    return selectedPath;
  });

  // Filesystem IPC Handlers
  ipcMain.handle('fs:readDirectory', async (_, { dirPath, workspaceRoot }) => {
    return readDirectory(dirPath, workspaceRoot);
  });

  ipcMain.handle('fs:readFile', async (_, { filePath, workspaceRoot }) => {
    return readFile(filePath, workspaceRoot);
  });

  ipcMain.handle('fs:writeFile', async (_, { filePath, content, workspaceRoot }) => {
    return writeFile(filePath, content, workspaceRoot);
  });

  ipcMain.handle('fs:createFile', async (_, { filePath, workspaceRoot }) => {
    return createFile(filePath, workspaceRoot);
  });

  ipcMain.handle('fs:createFolder', async (_, { folderPath, workspaceRoot }) => {
    return createFolder(folderPath, workspaceRoot);
  });

  ipcMain.handle('fs:renameItem', async (_, { oldPath, newPath, workspaceRoot }) => {
    return renameItem(oldPath, newPath, workspaceRoot);
  });

  ipcMain.handle('fs:deleteItem', async (_, { itemPath, workspaceRoot }) => {
    return deleteItem(itemPath, workspaceRoot);
  });

  // Terminal IPC Handlers
  ipcMain.handle('terminal:create', async (_, cwd) => {
    const res = createTerminalSession(cwd, (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', data);
      }
    });
    return res;
  });

  ipcMain.on('terminal:write', (_, data) => {
    sendTerminalData(data);
  });

  ipcMain.on('terminal:resize', (_, { cols, rows }) => {
    resizeTerminal(cols, rows);
  });

  ipcMain.handle('terminal:restart', async (_, cwd) => {
    const res = createTerminalSession(cwd, (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', data);
      }
    });
    return res;
  });

  // Recent Projects IPC Handlers
  ipcMain.handle('recent:get', async () => {
    return loadRecentProjects();
  });

  ipcMain.handle('recent:add', async (_, projectPath) => {
    return addRecentProject(projectPath);
  });

  ipcMain.handle('recent:remove', async (_, projectPath) => {
    return removeRecentProject(projectPath);
  });

  // Window Controls
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Jeni AI Agent IPC Handler
  ipcMain.handle('agent:sendMessage', async (event, { userMessage, ideContext }: { userMessage: string; ideContext?: any }) => {
    if (!agentOrchestrator) {
      return {
        success: false,
        error: 'Jeni AI engine is not configured. Set JENI_LLM_API_KEY environment variable.'
      };
    }

    try {
      // Set IDE context before sending message
      if (ideContext) {
        agentOrchestrator.setIDEContext(ideContext);
      }

      // Set up progress event handler
      agentOrchestrator.setProgressCallback((progressEvent) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('agent:progress', progressEvent);
        }
      });

      const response = await agentOrchestrator.sendMessage(userMessage);
      return {
        success: true,
        response
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Jeni Agent] Error:', errorMessage);
      return {
        success: false,
        error: `Jeni encountered an error: ${errorMessage}`
      };
    }
  });

  ipcMain.handle('agent:createPlan', async (_, { userMessage, ideContext }: { userMessage: string; ideContext?: any }) => {
    if (!agentOrchestrator) {
      return { success: false, error: 'Jeni AI engine is not configured.' };
    }

    try {
      if (ideContext) agentOrchestrator.setIDEContext(ideContext);
      const plan = await agentOrchestrator.createPlan(userMessage);
      return { success: true, plan };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('agent:setIDEContext', async (_, { ideContext }: { ideContext?: any }) => {
    if (!agentOrchestrator) {
      return { success: false, error: 'Jeni AI engine is not configured.' };
    }

    if (ideContext) {
      agentOrchestrator.setIDEContext(ideContext);
      console.log('[Jeni Agent] IDE context synced after terminal result update', ideContext?.terminal?.lastCommandResult);
    }

    return { success: true };
  });

  ipcMain.handle('agent:setWorkspaceRoot', async (_, { workspaceRoot }: { workspaceRoot: string }) => {
    if (!agentOrchestrator) {
      return {
        success: false,
        error: 'Jeni AI engine is not configured.'
      };
    }
    agentOrchestrator.setWorkspaceRoot(workspaceRoot);
    console.log('[Jeni Agent] Workspace root updated to', workspaceRoot);
    return { success: true };
  });
}
