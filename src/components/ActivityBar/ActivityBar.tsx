import React from 'react';
import { Files, Search, GitBranch, Blocks, Bot, Settings, FolderOpen } from 'lucide-react';
import { useIDEStore, SidebarSection } from '../../store/ideStore';

export const ActivityBar: React.FC = () => {
  const { sidebarSection, setSidebarSection, isSidebarCollapsed, openFolder, workspaceRoot } = useIDEStore();

  const navItems: { id: SidebarSection; label: string; icon: React.ReactNode }[] = [
    { id: 'explorer', label: 'File Explorer (Ctrl+Shift+E)', icon: <Files className="w-5 h-5" /> },
    { id: 'search', label: 'Search (Not Yet Implemented)', icon: <Search className="w-5 h-5" /> },
    { id: 'sourceControl', label: 'Source Control (Not Yet Implemented)', icon: <GitBranch className="w-5 h-5" /> },
    { id: 'extensions', label: 'Extensions (Not Yet Implemented)', icon: <Blocks className="w-5 h-5" /> },
    { id: 'jeni', label: 'Jeni AI Assistant', icon: <Bot className="w-5 h-5 text-jeni-purple" /> }
  ];

  return (
    <aside className="w-14 bg-[#0D0D0F] border-r border-surface-border flex flex-col justify-between items-center py-3 z-20 select-none">
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Brand / Logo icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-highlight text-jeni-purple border border-jeni-purple/30 mb-2">
          <span className="font-bold text-lg tracking-wider text-jeni-purple">J</span>
        </div>

        {/* Action button: Quick Open Folder */}
        <button
          onClick={() => openFolder()}
          title="Open Workspace Folder"
          className="p-2.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-surface-highlight transition-all"
        >
          <FolderOpen className="w-5 h-5" />
        </button>

        <div className="w-8 h-[1px] bg-surface-border my-1" />

        {/* Primary nav icons */}
        {navItems.map((item) => {
          const isActive = sidebarSection === item.id && !isSidebarCollapsed;
          return (
            <button
              key={item.id}
              onClick={() => setSidebarSection(item.id)}
              title={item.label}
              className={`relative p-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-surface-highlight text-indigo-400 border border-surface-border shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-highlight/50'
              }`}
            >
              {item.icon}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom settings icon */}
      <div className="flex flex-col items-center gap-2">
        <button
          title="Settings"
          className="p-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-surface-highlight transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
