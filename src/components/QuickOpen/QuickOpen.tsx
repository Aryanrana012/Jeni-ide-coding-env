import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { FileNode } from '../../types/ide';
import { FileIcon } from '../FileIcon/FileIcon';

export const QuickOpen: React.FC = () => {
  const { isQuickOpenOpen, setQuickOpenOpen, fileTree, openFile } = useIDEStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten file tree to list of files only
  const flattenFiles = (nodes: FileNode[]): FileNode[] => {
    let list: FileNode[] = [];
    for (const node of nodes) {
      if (!node.isDirectory) {
        list.push(node);
      }
      if (node.children && node.children.length > 0) {
        list = list.concat(flattenFiles(node.children));
      }
    }
    return list;
  };

  const allFiles = flattenFiles(fileTree);
  const filteredFiles = allFiles.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()) || f.path.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isQuickOpenOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isQuickOpenOpen]);

  if (!isQuickOpenOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        openFile(filteredFiles[selectedIndex].path);
        setQuickOpenOpen(false);
      }
    } else if (e.key === 'Escape') {
      setQuickOpenOpen(false);
    }
  };

  return (
    <div
      onClick={() => setQuickOpenOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[550px] bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col glow-accent"
      >
        <div className="flex items-center px-4 py-3 border-b border-surface-border bg-surface-muted gap-2">
          <Search className="w-4 h-4 text-indigo-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type file name to open... (Ctrl+P)"
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 font-medium"
          />
          <kbd className="px-1.5 py-0.5 bg-surface-highlight border border-surface-border text-[10px] text-gray-400 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-2">
          {filteredFiles.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 text-center">No matching files in expanded tree</div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={file.path}
                  onClick={() => {
                    openFile(file.path);
                    setQuickOpenOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex flex-col px-4 py-2 mx-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-accent text-white shadow'
                      : 'text-gray-300 hover:bg-surface-highlight/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <FileIcon filePath={file.name} size="sm" />
                    <span>{file.name}</span>
                  </div>
                  <span className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {file.path}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
