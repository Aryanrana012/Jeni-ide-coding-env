import React, { useState, useEffect, useRef } from 'react';
import { Command, FolderOpen, FilePlus, FolderPlus, Save, X, Terminal, Bot, RefreshCw } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    openFolder,
    saveActiveFile,
    activeTabId,
    closeTab,
    toggleTerminal,
    toggleJeniPanel,
    loadDirectory,
    workspaceRoot,
    setSelectedNodePath,
    selectedNodePath
  } = useIDEStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands = [
    {
      id: 'open-folder',
      label: 'Open Workspace Folder',
      shortcut: 'Ctrl+O',
      icon: <FolderOpen className="w-4 h-4 text-indigo-400" />,
      action: () => openFolder()
    },
    {
      id: 'save',
      label: 'Save Active File',
      shortcut: 'Ctrl+S',
      icon: <Save className="w-4 h-4 text-emerald-400" />,
      action: () => saveActiveFile()
    },
    {
      id: 'close-tab',
      label: 'Close Active Tab',
      shortcut: 'Ctrl+W',
      icon: <X className="w-4 h-4 text-rose-400" />,
      action: () => activeTabId && closeTab(activeTabId)
    },
    {
      id: 'toggle-terminal',
      label: 'Toggle Integrated Terminal',
      shortcut: 'Ctrl+`',
      icon: <Terminal className="w-4 h-4 text-yellow-400" />,
      action: () => toggleTerminal()
    },
    {
      id: 'toggle-jeni',
      label: 'Toggle Jeni AI Panel',
      shortcut: 'Ctrl+Shift+J',
      icon: <Bot className="w-4 h-4 text-jeni-purple" />,
      action: () => toggleJeniPanel()
    },
    {
      id: 'refresh-explorer',
      label: 'Refresh File Explorer',
      shortcut: '',
      icon: <RefreshCw className="w-4 h-4 text-cyan-400" />,
      action: () => workspaceRoot && loadDirectory(workspaceRoot)
    }
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[550px] bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col glow-accent"
      >
        <div className="flex items-center px-4 py-3 border-b border-surface-border bg-surface-muted gap-2">
          <Command className="w-4 h-4 text-indigo-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 font-medium"
          />
          <kbd className="px-1.5 py-0.5 bg-surface-highlight border border-surface-border text-[10px] text-gray-400 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 text-center">No commands found</div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-accent text-white font-medium shadow'
                      : 'text-gray-300 hover:bg-surface-highlight/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {cmd.icon}
                    <span>{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-[10px] font-mono text-gray-400">{cmd.shortcut}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
