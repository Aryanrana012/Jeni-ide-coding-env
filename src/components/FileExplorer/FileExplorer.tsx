import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  RefreshCw,
  Edit2,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { FileNode } from '../../types/ide';
import { FileIcon } from '../FileIcon/FileIcon';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetNode: FileNode | null;
}

export const FileExplorer: React.FC = () => {
  const {
    workspaceRoot,
    workspaceName,
    fileTree,
    loadDirectory,
    toggleFolderNode,
    openFile,
    createNewFile,
    createNewFolder,
    renameItem,
    deleteItem,
    openFolder,
    selectedNodePath,
    setSelectedNodePath
  } = useIDEStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    targetNode: null
  });

  const [dialogState, setDialogState] = useState<{
    type: 'newFile' | 'newFolder' | 'rename' | null;
    targetPath: string;
    initialValue?: string;
  }>({ type: null, targetPath: '' });

  const [inputValue, setInputValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getFileIcon = (node: FileNode, isExpanded?: boolean) => {
    return (
      <FileIcon
        filePath={node.name}
        isFolder={node.isDirectory}
        isOpen={isExpanded}
        size="sm"
      />
    );
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetNode: node
    });
  };

  const submitDialog = async () => {
    if (!inputValue.trim()) return;

    if (dialogState.type === 'newFile') {
      await createNewFile(dialogState.targetPath, inputValue.trim());
    } else if (dialogState.type === 'newFolder') {
      await createNewFolder(dialogState.targetPath, inputValue.trim());
    } else if (dialogState.type === 'rename') {
      await renameItem(dialogState.targetPath, inputValue.trim());
    }

    setDialogState({ type: null, targetPath: '' });
    setInputValue('');
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isSelected = selectedNodePath === node.path;

      return (
        <div key={node.id} className="select-none">
          <div
            onClick={() => {
              setSelectedNodePath(node.path);
              if (node.isDirectory) {
                toggleFolderNode(node.id);
              }
            }}
            onDoubleClick={() => {
              if (!node.isDirectory) {
                openFile(node.path);
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, node)}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            className={`flex items-center gap-1.5 py-1 px-2 text-xs cursor-pointer transition-colors ${
              isSelected ? 'bg-surface-highlight text-white font-medium' : 'text-gray-300 hover:bg-surface-highlight/50'
            }`}
          >
            {node.isDirectory ? (
              <span className="text-gray-500 hover:text-gray-300">
                {node.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-3.5 h-3.5" />
            )}

            {getFileIcon(node, node.isExpanded)}
            <span className="truncate">{node.name}</span>
          </div>

          {node.isDirectory && node.isExpanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (!workspaceRoot) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-400">
        <FolderOpen className="w-10 h-10 text-gray-500 mb-3" />
        <p className="text-xs mb-3">No workspace folder opened.</p>
        <button
          onClick={() => openFolder()}
          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg shadow transition-all"
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-surface text-gray-200 select-none overflow-hidden"
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      {/* Explorer Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border bg-surface-muted">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 truncate max-w-[140px]" title={workspaceRoot}>
          {workspaceName}
        </span>
        <div className="flex items-center gap-1 text-gray-400">
          <button
            onClick={() => setDialogState({ type: 'newFile', targetPath: selectedNodePath || workspaceRoot })}
            title="New File"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDialogState({ type: 'newFolder', targetPath: selectedNodePath || workspaceRoot })}
            title="New Folder"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => loadDirectory(workspaceRoot)}
            title="Refresh Explorer"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.length === 0 ? (
          <div className="p-4 text-xs text-gray-500 text-center">Empty directory</div>
        ) : (
          renderTree(fileTree)
        )}
      </div>

      {/* Inline Create/Rename Dialog Input */}
      {dialogState.type && (
        <div className="p-2 border-t border-surface-border bg-surface-muted flex flex-col gap-1">
          <span className="text-[11px] text-gray-400 capitalize">
            {dialogState.type === 'newFile' ? 'Create New File' : dialogState.type === 'newFolder' ? 'Create New Folder' : 'Rename Item'}
          </span>
          <div className="flex gap-1">
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDialog();
                if (e.key === 'Escape') setDialogState({ type: null, targetPath: '' });
              }}
              placeholder="Name..."
              className="flex-1 px-2 py-1 bg-surface-highlight border border-surface-border text-xs text-white rounded outline-none focus:border-accent"
            />
            <button
              onClick={submitDialog}
              className="px-2 py-1 bg-accent text-white text-xs rounded hover:bg-accent-hover"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Context Menu Popup */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-44 bg-surface border border-surface-border shadow-2xl rounded-lg py-1 text-xs text-gray-200"
        >
          <button
            onClick={() => {
              const parent = contextMenu.targetNode
                ? contextMenu.targetNode.isDirectory
                  ? contextMenu.targetNode.path
                  : ((): string => {
                      const p = contextMenu.targetNode!.path;
                      const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
                      return idx > -1 ? p.substring(0, idx) : workspaceRoot;
                    })()
                : workspaceRoot;
              setDialogState({ type: 'newFile', targetPath: parent });
              setInputValue('');
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New File
          </button>

          <button
            onClick={() => {
              const parent = contextMenu.targetNode
                ? contextMenu.targetNode.isDirectory
                  ? contextMenu.targetNode.path
                  : ((): string => {
                      const p = contextMenu.targetNode!.path;
                      const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
                      return idx > -1 ? p.substring(0, idx) : workspaceRoot;
                    })()
                : workspaceRoot;
              setDialogState({ type: 'newFolder', targetPath: parent });
              setInputValue('');
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New Folder
          </button>

          {contextMenu.targetNode && (
            <>
              <div className="my-1 border-t border-surface-border" />
              <button
                onClick={() => {
                  setDialogState({
                    type: 'rename',
                    targetPath: contextMenu.targetNode!.path,
                    initialValue: contextMenu.targetNode!.name
                  });
                  setInputValue(contextMenu.targetNode!.name);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-white transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Rename
              </button>
              <button
                onClick={async () => {
                  if (contextMenu.targetNode) {
                    await deleteItem(contextMenu.targetNode.path);
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-600 hover:text-white text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}

          <div className="my-1 border-t border-surface-border" />
          <button
            onClick={() => {
              loadDirectory(workspaceRoot);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-highlight transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};
