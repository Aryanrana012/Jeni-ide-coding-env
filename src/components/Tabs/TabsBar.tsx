import React from 'react';
import { X, Circle } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';
import { FileIcon } from '../FileIcon/FileIcon';

export const TabsBar: React.FC = () => {
  const { openTabs, activeTabId, selectTab, closeTab } = useIDEStore();

  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center bg-surface-muted border-b border-surface-border overflow-x-auto select-none no-scrollbar h-9 shrink-0">
      {openTabs.map((tab) => {
        const isActive = activeTabId === tab.id;

        return (
          <div
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            title={tab.path}
            className={`group relative flex items-center gap-2 px-3 h-full text-xs font-medium cursor-pointer border-r border-surface-border transition-colors min-w-[130px] max-w-[220px] shrink-0 ${
              isActive
                ? 'bg-surface text-white border-t-2 border-t-accent'
                : 'text-gray-400 hover:bg-surface-highlight/40 hover:text-gray-200'
            }`}
          >
            <FileIcon filePath={tab.name} size="sm" />
            <span className="truncate flex-1">{tab.name}</span>

            {/* Dirty indicator / Close Button */}
            <div className="flex items-center justify-center w-4 h-4">
              {tab.isDirty ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded hover:bg-surface-highlight text-amber-400 group-hover:hidden"
                  title="Unsaved changes"
                >
                  <Circle className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                </button>
              ) : null}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded text-gray-400 hover:text-white hover:bg-surface-highlight ${
                  tab.isDirty ? 'hidden group-hover:block' : ''
                }`}
                title="Close Tab (Ctrl+W)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
