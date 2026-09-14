import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const UnsavedChangesModal: React.FC = () => {
  const { pendingCloseTabId, setPendingCloseTabId, openTabs, saveFile, closeTab } = useIDEStore();

  if (!pendingCloseTabId) return null;

  const tab = openTabs.find((t) => t.id === pendingCloseTabId);
  if (!tab) return null;

  const handleSaveAndClose = async () => {
    await saveFile(pendingCloseTabId);
    await closeTab(pendingCloseTabId, true);
  };

  const handleDontSaveAndClose = async () => {
    await closeTab(pendingCloseTabId, true);
  };

  const handleCancel = () => {
    setPendingCloseTabId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-[420px] bg-surface border border-surface-border rounded-2xl p-6 shadow-2xl flex flex-col gap-4 glow-accent">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-white">Save Changes?</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Do you want to save the changes you made to <span className="font-semibold text-white">{tab.name}</span>?
            </p>
            <p className="text-[11px] text-gray-500">Your changes will be lost if you don't save them.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded-xl bg-surface-highlight hover:bg-surface-border text-xs text-gray-300 font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDontSaveAndClose}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
          >
            Don't Save
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
