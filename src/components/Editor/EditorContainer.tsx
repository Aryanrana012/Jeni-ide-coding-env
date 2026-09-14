import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useIDEStore } from '../../store/ideStore';
import { AlertTriangle, FileCheck, FileX, HardDrive } from 'lucide-react';

export const EditorContainer: React.FC = () => {
  const { openTabs, activeTabId, updateTabContent, saveActiveFile } = useIDEStore();
  const editorRef = useRef<any>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom dark theme matching Jeni IDE aesthetic
    monaco.editor.defineTheme('jeni-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'number', foreground: 'bd93f9' }
      ],
      colors: {
        'editor.background': '#09090B',
        'editor.foreground': '#F4F4F5',
        'editor.lineHighlightBackground': '#111113',
        'editorCursor.foreground': '#A78BFA',
        'editorWhitespace.foreground': '#222225',
        'editorIndentGuide.background': '#18181B',
        'editorIndentGuide.activeBackground': '#222225'
      }
    });

    monaco.editor.setTheme('jeni-dark');

    const syncEditorState = () => {
      const position = editor.getPosition();
      if (position) {
        useIDEStore.getState().updateCursorPosition(position.lineNumber, position.column);
      }

      const selection = editor.getSelection();
      if (!selection) {
        useIDEStore.getState().clearSelection();
        return;
      }

      if (selection.isEmpty()) {
        useIDEStore.getState().clearSelection();
        return;
      }

      const start = {
        line: selection.startLineNumber,
        column: selection.startColumn,
      };
      const end = {
        line: selection.endLineNumber,
        column: selection.endColumn,
      };

      const selectedText = editor.getModel()?.getValueInRange(selection) ?? '';
      useIDEStore.getState().updateSelection(start, end, selectedText);
    };

    syncEditorState();
    editor.onDidChangeCursorPosition(syncEditorState);
    editor.onDidChangeCursorSelection(syncEditorState);

    // Add Ctrl+S command shortcut directly inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveFile();
    });
  };

  if (openTabs.length === 0 || !activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-gray-400 select-none p-6">
        <div className="w-16 h-16 rounded-2xl bg-surface-highlight flex items-center justify-center text-indigo-400 mb-4 border border-surface-border shadow-xl">
          <FileCheck className="w-8 h-8" />
        </div>
        <h2 className="text-base font-semibold text-gray-200 mb-1">No File Open</h2>
        <p className="text-xs text-gray-400 max-w-sm text-center">
          Select a file from the explorer on the left or press <kbd className="px-1.5 py-0.5 bg-surface-highlight border border-surface-border text-gray-300 rounded text-[10px]">Ctrl+P</kbd> to quick open.
        </p>
      </div>
    );
  }

  // Case 1: Binary File Placeholder View
  if (activeTab.isBinary) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-gray-400 select-none p-6">
        <HardDrive className="w-12 h-12 text-indigo-400 mb-3" />
        <h3 className="text-sm font-semibold text-gray-200">{activeTab.name}</h3>
        <span className="mt-2 px-3 py-1 bg-surface-highlight border border-surface-border text-gray-300 rounded-full text-xs">
          Binary File
        </span>
        <p className="text-xs text-gray-400 mt-3">The file cannot be rendered as inline code in Jeni.</p>
      </div>
    );
  }

  // Case 2: Oversized File View (>25 MB)
  if (activeTab.isOversized) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-gray-400 select-none p-6">
        <FileX className="w-12 h-12 text-rose-400 mb-3" />
        <h3 className="text-sm font-semibold text-gray-200">{activeTab.name}</h3>
        <div className="mt-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs max-w-md text-center leading-relaxed">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-rose-400" />
          {activeTab.bannerMessage || 'File is too large to edit in Jeni (>25MB).'}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-background overflow-hidden">
      {/* Banner for High-Performance / Reduced Feature Mode (5MB - 25MB) */}
      {activeTab.bannerMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs shrink-0 select-none">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{activeTab.bannerMessage}</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Editor
          key={activeTab.id}
          path={activeTab.path}
          language={activeTab.bannerMessage ? 'plaintext' : activeTab.language}
          value={activeTab.content}
          onChange={(value) => updateTabContent(activeTab.id, value || '')}
          onMount={handleEditorMount}
          options={{
            theme: 'jeni-dark',
            fontSize: 13,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            readOnly: activeTab.isReadOnly || false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            lineNumbersMinChars: 4
          }}
        />
      </div>
    </div>
  );
};
