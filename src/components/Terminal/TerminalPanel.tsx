import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Trash2, RefreshCw, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

function stripAnsiAndControlSequences(value: string): string {
  return value
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u009b[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u001b[@-_]/g, '')
    .replace(/\u0008/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function isTerminalPromptLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^PS\s+.*>\s*$/.test(trimmed) ||
    /^(?:[A-Za-z0-9_.-]+@)?[A-Za-z0-9_.-]+[:~][^\n]*[$#]\s*$/.test(trimmed) ||
    /^>+\s*$/.test(trimmed) ||
    /^>>>\s*$/.test(trimmed) ||
    /^\.\.\.\s*$/.test(trimmed) ||
    /^\s*\[Process Exited\]\s*$/.test(trimmed)
  );
}

function normalizeCommandResultOutput(raw: string, command?: string): string {
  const cleaned = stripAnsiAndControlSequences(raw);
  const lines = cleaned
    .split('\n')
    .map((line) => line.replace(/[\t\x0B\x0C]+/g, ' ').trimEnd())
    .filter((line) => line.length > 0);

  const filtered: string[] = [];
  const commandPattern = command ? new RegExp(`^${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isTerminalPromptLine(trimmed)) continue;
    if (commandPattern && commandPattern.test(trimmed)) continue;
    if (trimmed === command) continue;
    if (/^\s*echo\s+/i.test(trimmed) && command && trimmed.toLowerCase() === command.toLowerCase()) continue;
    filtered.push(trimmed);
  }

  return filtered.join('\n').trim();
}

const COMMAND_EXIT_MARKER = '__JENI_EXIT_CODE:';

function readCommandExitCode(raw: string): number | null {
  const matches = Array.from(raw.matchAll(new RegExp(`${COMMAND_EXIT_MARKER}(-?\\d+)`, 'g')));
  if (matches.length === 0) return null;

  const exitCode = Number(matches[matches.length - 1][1]);
  return Number.isFinite(exitCode) ? exitCode : null;
}

export const TerminalPanel: React.FC = () => {
  const {
    isTerminalOpen,
    terminalHeight,
    setTerminalHeight,
    toggleTerminal,
    terminalOutput,
    clearTerminal,
    restartTerminal,
    isTruePty,
    workspaceRoot
  } = useIDEStore();

  const [inputVal, setInputVal] = useState('');
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCommandRef = useRef<{ command: string; startedAt: number; rawOutput: string } | null>(null);

  // Auto-scroll to bottom of terminal output
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  // Keep the interactive PTY stream raw for the terminal UI, but also retain a minimal
  // command result snapshot for IDEContext when the shell prompt closes the command.
  useEffect(() => {
    if (window.jeniAPI?.onTerminalData) {
      const unsubscribe = window.jeniAPI.onTerminalData((data) => {
        useIDEStore.getState().appendTerminalOutput(data, 'stdout');

        const pending = pendingCommandRef.current;
        if (!pending) {
          console.log('[TerminalPanel] PTY chunk received without an active pending command', { dataPreview: data.slice(-200) });
          return;
        }

        pending.rawOutput += data;

        const cleaned = stripAnsiAndControlSequences(pending.rawOutput);
        const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const lastLine = lines[lines.length - 1];
        const isPrompt = isTerminalPromptLine(lastLine);
        console.log('[TerminalPanel] prompt check', {
          command: pending.command,
          lastLine,
          isPrompt,
          rawTail: pending.rawOutput.slice(-400)
        });

        if (!isPrompt) return;

        const exitCode = readCommandExitCode(pending.rawOutput);
        const stdout = normalizeCommandResultOutput(
          pending.rawOutput.replace(new RegExp(`${COMMAND_EXIT_MARKER}-?\\d+`, 'g'), ''),
          pending.command
        );
        const result = {
          command: pending.command,
          cwd: workspaceRoot ?? undefined,
          exitCode: exitCode ?? -1,
          stdout,
          stderr: '',
          duration: Date.now() - pending.startedAt,
          success: exitCode === 0,
          timedOut: false
        };

        console.log('[TerminalPanel] setLastCommandResult', result);
        useIDEStore.getState().setLastCommandResult(result);
        pendingCommandRef.current = null;
      });
      return () => unsubscribe();
    }
  }, [workspaceRoot]);

  if (!isTerminalOpen) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = inputVal.trim();
      if (command) {
        pendingCommandRef.current = {
          command,
          startedAt: Date.now(),
          rawOutput: ''
        };
      }

      if (window.jeniAPI?.sendTerminalData) {
        const command = inputVal.trim();
        const commandWithExitMarker = `${inputVal}; $jeniExit = if ($?) { if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE } } else { 1 }; Write-Output "${COMMAND_EXIT_MARKER}$jeniExit"`;
        window.jeniAPI.sendTerminalData(command ? commandWithExitMarker + '\r\n' : inputVal + '\r\n');
      }
      setInputVal('');
    } else if (e.ctrlKey && e.key === 'c') {
      if (window.jeniAPI?.sendTerminalData) {
        window.jeniAPI.sendTerminalData('\x03');
      }
    }
  };

  return (
    <div
      style={{ height: `${terminalHeight}px` }}
      className="relative flex flex-col bg-surface border-t border-surface-border select-none shrink-0"
    >
      {/* Resizer Handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          const startY = e.clientY;
          const startHeight = terminalHeight;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const newHeight = startHeight - (moveEvent.clientY - startY);
            setTerminalHeight(newHeight);
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
        className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-accent/50 transition-colors z-30"
      />

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-surface-muted border-b border-surface-border text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-gray-300">
            <TerminalIcon className="w-4 h-4 text-indigo-400" />
            <span>Terminal</span>
          </div>

          {/* Mode Badge */}
          {isTruePty ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Interactive PTY
            </span>
          ) : (
            <span
              title="node-pty unavailable. Running in degraded child_process spawn mode."
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20"
            >
              <ShieldAlert className="w-3 h-3" />
              Degraded Spawn Runner
            </span>
          )}

          {workspaceRoot && (
            <span className="text-[11px] text-gray-500 truncate max-w-xs" title={workspaceRoot}>
              {workspaceRoot}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-gray-400">
          <button
            onClick={() => restartTerminal()}
            title="Restart Terminal"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => clearTerminal()}
            title="Clear Terminal Output"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleTerminal()}
            title="Close Terminal (Ctrl+`)"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 p-3 font-mono text-xs overflow-y-auto text-gray-200 leading-relaxed whitespace-pre-wrap select-text bg-surface"
      >
        {terminalOutput.map((line) => (
          <span
            key={line.id}
            className={
              line.type === 'stderr'
                ? 'text-rose-400'
                : line.type === 'system'
                ? 'text-indigo-400 font-semibold'
                : 'text-gray-200'
            }
          >
            {line.text}
          </span>
        ))}
        <div ref={outputEndRef} />
      </div>

      {/* Interactive Command Input Bar */}
      <div className="flex items-center px-3 py-1 bg-surface border-t border-surface-border font-mono text-xs">
        <span className="text-emerald-400 font-bold mr-2 select-none">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type shell command..."
          className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-600 font-mono text-xs"
        />
      </div>
    </div>
  );
};
