import React, { useEffect } from 'react';
import { useIDEStore } from './store/ideStore';
import { ActivityBar } from './components/ActivityBar/ActivityBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TabsBar } from './components/Tabs/TabsBar';
import { EditorContainer } from './components/Editor/EditorContainer';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { JeniPanel } from './components/JeniPanel/JeniPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { WelcomeScreen } from './components/WelcomeScreen/WelcomeScreen';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { QuickOpen } from './components/QuickOpen/QuickOpen';
import { UnsavedChangesModal } from './components/Modals/UnsavedChangesModal';

export const App: React.FC = () => {
  const {
    workspaceRoot,
    saveActiveFile,
    activeTabId,
    closeTab,
    toggleTerminal,
    toggleSidebar,
    setCommandPaletteOpen,
    setQuickOpenOpen
  } = useIDEStore();

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S : Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        saveActiveFile();
      }

      // Ctrl+Shift+P / Cmd+Shift+P : Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }

      // Ctrl+P / Cmd+P : Quick File Search (without Shift)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault();
        setQuickOpenOpen(true);
      }

      // Ctrl+W / Cmd+W : Close Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }

      // Ctrl+` : Toggle Terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
      }

      // Ctrl+B / Cmd+B : Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, saveActiveFile, closeTab, toggleTerminal, toggleSidebar, setCommandPaletteOpen, setQuickOpenOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-gray-200 overflow-hidden font-sans select-none">
      {!workspaceRoot ? (
        <WelcomeScreen />
      ) : (
        <>
          {/* Main IDE Workspace Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Activity Bar */}
            <ActivityBar />

            {/* Left Collapsible Sidebar */}
            <Sidebar />

            {/* Middle Main Content Area (Tabs + Editor + Terminal) */}
            <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
              <TabsBar />
              <div className="flex-1 min-h-0 relative">
                <EditorContainer />
              </div>
              <TerminalPanel />
            </main>

            {/* Right Collapsible Jeni AI Assistant Panel */}
            <JeniPanel />
          </div>

          {/* Bottom Status Bar */}
          <StatusBar />
        </>
      )}

      {/* Global Overlays & Modals */}
      <CommandPalette />
      <QuickOpen />
      <UnsavedChangesModal />
    </div>
  );
};
