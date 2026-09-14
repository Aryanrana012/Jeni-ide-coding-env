import React from 'react';
import { GitBranch, Terminal, Bot, Code2, Globe } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const StatusBar: React.FC = () => {
  const { openTabs, activeTabId, isTerminalOpen, toggleTerminal, isJeniPanelOpen, toggleJeniPanel, workspaceName } = useIDEStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  return (
    <footer className="h-6 bg-[#0D0D0F] border-t border-surface-border flex items-center justify-between px-3 text-[11px] text-gray-400 select-none shrink-0">
      {/* Left side items */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-gray-300 font-medium hover:text-white cursor-pointer">
          <GitBranch className="w-3 h-3 text-indigo-400" />
          main
        </span>

        {workspaceName && (
          <span className="truncate max-w-[200px]" title={workspaceName}>
            {workspaceName}
          </span>
        )}

        <button
          onClick={() => toggleTerminal()}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
            isTerminalOpen ? 'text-indigo-400 bg-surface-highlight font-medium' : 'hover:text-gray-200'
          }`}
        >
          <Terminal className="w-3 h-3" />
          Terminal
        </button>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            <span className="flex items-center gap-1 text-gray-300">
              <Code2 className="w-3 h-3 text-yellow-400" />
              {activeTab.language}
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <Globe className="w-3 h-3" />
              UTF-8
            </span>
          </>
        )}

        <button
          onClick={() => toggleJeniPanel()}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
            isJeniPanelOpen ? 'text-jeni-purple bg-surface-highlight font-medium' : 'hover:text-gray-200'
          }`}
        >
          <Bot className="w-3 h-3 text-jeni-purple" />
          Jeni AI
        </button>

        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ready
        </span>
      </div>
    </footer>
  );
};
