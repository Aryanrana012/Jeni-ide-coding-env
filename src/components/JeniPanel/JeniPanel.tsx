import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Plus, Sparkles, AlertCircle, X, Cpu } from 'lucide-react';
import { useIDEStore } from '../../store/ideStore';

export const JeniPanel: React.FC = () => {
  const {
    isJeniPanelOpen,
    toggleJeniPanel,
    jeniPanelWidth,
    setJeniPanelWidth,
    jeniMessages,
    isJeniLoading,
    sendJeniMessage,
    clearJeniConversation
  } = useIDEStore();

  const [inputVal, setInputVal] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const agentStatus = isJeniLoading
    ? { label: 'Connecting...', tone: 'amber' }
    : { label: 'Ready', tone: 'emerald' };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [jeniMessages, isJeniLoading]);

  if (!isJeniPanelOpen) {
    return null;
  }

  const handleSend = () => {
    if (!inputVal.trim()) return;
    sendJeniMessage(inputVal);
    setInputVal('');
  };

  return (
    <aside
      style={{ width: `${jeniPanelWidth}px` }}
      className="relative h-full bg-surface border-l border-surface-border flex flex-col select-none shrink-0"
    >
      {/* Resizer Handle (Left Side) */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = jeniPanelWidth;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth - (moveEvent.clientX - startX);
            setJeniPanelWidth(newWidth);
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-jeni-purple/50 transition-colors z-30"
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-muted border-b border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-jeni-purple/20 flex items-center justify-center text-jeni-purple border border-jeni-purple/30">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-gray-200 tracking-wide">Jeni AI</span>
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
              agentStatus.tone === 'amber'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${agentStatus.tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {agentStatus.label}
          </span>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <button
            onClick={() => clearJeniConversation()}
            title="New Conversation"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleJeniPanel()}
            title="Close Panel"
            className="p-1 hover:text-white hover:bg-surface-highlight rounded transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Stream Area */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 select-text bg-background">
        {jeniMessages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isActivity = msg.sender === 'activity';

          if (isActivity) {
            // Render activity message
            const event = msg.progressEvent;
            const getActivityIcon = () => {
              switch (event?.type) {
                case 'phase_start':
                  return '⚙️';
                case 'phase_complete':
                  return '✓';
                case 'tool_start':
                  return '⚙️';
                case 'tool_complete':
                  return '✓';
                case 'tool_error':
                  return '✗';
                case 'agent_complete':
                  return '✓';
                default:
                  return '•';
              }
            };

            const getActivityColor = () => {
              switch (event?.type) {
                case 'phase_complete':
                case 'tool_complete':
                case 'agent_complete':
                  return 'text-green-400';
                case 'tool_error':
                  return 'text-red-400';
                case 'phase_start':
                case 'tool_start':
                  return 'text-blue-400';
                default:
                  return 'text-gray-400';
              }
            };

            return (
              <div
                key={msg.id}
                className={`flex items-center gap-2 text-xs text-gray-300 py-1 px-2 rounded ${getActivityColor()}`}
              >
                <span className="text-sm">{getActivityIcon()}</span>
                <span>{msg.text}</span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[88%] text-xs leading-relaxed rounded-xl p-3 ${
                isUser
                  ? 'self-end bg-accent text-white rounded-br-none shadow-md'
                  : 'self-start bg-surface-highlight text-gray-200 border border-surface-border rounded-bl-none shadow-sm'
              }`}
            >
              {!isUser && (
                <div className="flex items-center gap-1.5 mb-1 text-jeni-purple font-semibold text-[11px]">
                  <Sparkles className="w-3 h-3" />
                  Jeni
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          );
        })}

        {isJeniLoading && (
          <div className="self-start bg-surface-highlight text-gray-300 border border-surface-border rounded-xl rounded-bl-none p-3 text-xs flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-jeni-purple animate-spin" />
            <span>Connecting to Jeni AI engine...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-surface-muted border-t border-surface-border flex flex-col gap-2">
        <div className="relative flex items-center">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Jeni anything..."
            rows={2}
            className="w-full pl-3 pr-10 py-2 bg-surface-highlight border border-surface-border rounded-xl text-xs text-white placeholder-gray-500 outline-none resize-none focus:border-jeni-purple/60 focus:ring-1 focus:ring-jeni-purple/30"
          />
          <button
            onClick={handleSend}
            disabled={!inputVal.trim()}
            className="absolute right-2 bottom-2.5 p-1.5 rounded-lg bg-jeni-purple text-white hover:bg-jeni-purple/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
          <span
            className={`flex items-center gap-1 ${agentStatus.tone === 'amber' ? 'text-amber-300' : 'text-emerald-300'}`}
          >
            <span className={`w-2 h-2 rounded-full ${agentStatus.tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {agentStatus.tone === 'amber' ? 'AI engine connecting...' : 'AI engine ready'}
          </span>
          <span>Shift+Enter for newline</span>
        </div>
      </div>
    </aside>
  );
};
