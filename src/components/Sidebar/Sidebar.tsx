import React from 'react';
import { useIDEStore } from '../../store/ideStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { Search, GitBranch, Blocks, Bot, AlertCircle } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { sidebarSection, isSidebarCollapsed, sidebarWidth, setSidebarWidth } = useIDEStore();

  if (isSidebarCollapsed) {
    return null;
  }

  const renderPlaceholder = (title: string, icon: React.ReactNode, description: string) => (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-surface select-none">
      <div className="w-12 h-12 rounded-2xl bg-surface-highlight flex items-center justify-center text-indigo-400 mb-4 border border-surface-border">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-200 mb-1">{title}</h3>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[11px] font-medium my-2">
        <AlertCircle className="w-3.5 h-3.5" />
        Not yet implemented in Phase 1
      </div>
      <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
        {description}
      </p>
    </div>
  );

  const renderContent = () => {
    switch (sidebarSection) {
      case 'explorer':
        return <FileExplorer />;
      case 'search':
        return renderPlaceholder('Global Workspace Search', <Search className="w-6 h-6" />, 'Full-text workspace code search will be available in Phase 2.');
      case 'sourceControl':
        return renderPlaceholder('Git Source Control', <GitBranch className="w-6 h-6" />, 'Git status, diff viewer, and commit integration will arrive in Phase 2.');
      case 'extensions':
        return renderPlaceholder('Extension Marketplace', <Blocks className="w-6 h-6" />, 'Plugin and extension manager is planned for future releases.');
      case 'jeni':
        return (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-surface">
            <Bot className="w-10 h-10 text-jeni-purple mb-3 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-200">Jeni AI Panel Active</h3>
            <p className="text-xs text-gray-400 mt-2">Jeni AI Panel is accessible on the right panel.</p>
          </div>
        );
      default:
        return <FileExplorer />;
    }
  };

  return (
    <div
      style={{ width: `${sidebarWidth}px` }}
      className="relative h-full bg-surface border-r border-surface-border flex flex-col select-none shrink-0"
    >
      <div className="flex-1 overflow-hidden">{renderContent()}</div>

      {/* Sidebar Resizer Handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            setSidebarWidth(newWidth);
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 transition-colors z-30"
      />
    </div>
  );
};
