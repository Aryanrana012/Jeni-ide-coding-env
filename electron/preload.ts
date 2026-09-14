import { contextBridge, ipcRenderer } from 'electron';

const jeniAPI = {
  // Folder Selection
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),
  readDirectory: (dirPath: string, workspaceRoot: string) =>
    ipcRenderer.invoke('fs:readDirectory', { dirPath, workspaceRoot }),

  // File Operations
  readFile: (filePath: string, workspaceRoot: string) =>
    ipcRenderer.invoke('fs:readFile', { filePath, workspaceRoot }),
  writeFile: (filePath: string, content: string, workspaceRoot: string) =>
    ipcRenderer.invoke('fs:writeFile', { filePath, content, workspaceRoot }),
  createFile: (filePath: string, workspaceRoot: string) =>
    ipcRenderer.invoke('fs:createFile', { filePath, workspaceRoot }),
  createFolder: (folderPath: string, workspaceRoot: string) =>
    ipcRenderer.invoke('fs:createFolder', { folderPath, workspaceRoot }),
  renameItem: (oldPath: string, newPath: string, workspaceRoot: string) =>
    ipcRenderer.invoke('fs:renameItem', { oldPath, newPath, workspaceRoot }),
  deleteItem: (itemPath: string, workspaceRoot: string) =>
    ipcRenderer.invoke('fs:deleteItem', { itemPath, workspaceRoot }),

  // Terminal API
  createTerminal: (cwd: string) => ipcRenderer.invoke('terminal:create', cwd),
  sendTerminalData: (data: string) => ipcRenderer.send('terminal:write', data),
  resizeTerminal: (cols: number, rows: number) => ipcRenderer.send('terminal:resize', { cols, rows }),
  restartTerminal: (cwd: string) => ipcRenderer.invoke('terminal:restart', cwd),
  onTerminalData: (callback: (data: string) => void) => {
    const handler = (_event: any, data: string) => callback(data);
    ipcRenderer.on('terminal:data', handler);
    return () => {
      ipcRenderer.removeListener('terminal:data', handler);
    };
  },

  // Recent Projects API
  getRecentProjects: () => ipcRenderer.invoke('recent:get'),
  addRecentProject: (projectPath: string) => ipcRenderer.invoke('recent:add', projectPath),
  removeRecentProject: (projectPath: string) => ipcRenderer.invoke('recent:remove', projectPath),

  // Jeni AI Agent API
  sendAgentMessage: (userMessage: string, ideContext?: any) =>
    ipcRenderer.invoke('agent:sendMessage', { userMessage, ideContext }),
  createAgentPlan: (userMessage: string, ideContext?: any) =>
    ipcRenderer.invoke('agent:createPlan', { userMessage, ideContext }),
  syncIDEContext: (ideContext: any) =>
    ipcRenderer.invoke('agent:setIDEContext', { ideContext }),
  setAgentWorkspaceRoot: (workspaceRoot: string) =>
    ipcRenderer.invoke('agent:setWorkspaceRoot', { workspaceRoot }),
  onAgentProgress: (callback: (event: any) => void) => {
    const handler = (_event: any, progressEvent: any) => callback(progressEvent);
    ipcRenderer.on('agent:progress', handler);
    return () => {
      ipcRenderer.removeListener('agent:progress', handler);
    };
  },

  // Native Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
};

contextBridge.exposeInMainWorld('jeniAPI', jeniAPI);
