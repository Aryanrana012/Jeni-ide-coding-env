# Jeni Progress Events Architecture

## Overview
This document describes the **agent progress event system** that enables Jeni to stream progressive activity updates to the UI as the agent executes tools, rather than silently performing all operations and then dumping a final response.

## Key Principle
The system separates **LLM responses** from **progress events**:
- **Tool results** → Feed back to the LLM for decision-making
- **Progress events** → Stream to the UI for user visibility

This keeps the agent orchestration clean while providing excellent UX.

---

## Architecture Layers

### 1. **Backend: Progress Event Types** (`electron/types/agentProgress.ts`)

Defines the event structure:

```typescript
export type ProgressEventType =
  | 'phase_start'      // Starting a logical phase
  | 'phase_complete'   // Phase finished
  | 'tool_start'       // Tool call starting
  | 'tool_complete'    // Tool finished
  | 'tool_error'       // Tool failed
  | 'agent_complete';  // Agent loop finished
```

**Event Examples:**
- `{ type: 'phase_start', phase: '🔍 Inspecting the project' }`
- `{ type: 'phase_complete', phase: '🔍 Inspecting the project', status: 'success' }`
- `{ type: 'agent_complete', totalToolsCalled: 5, totalDuration: 2341 }`

---

### 2. **Backend: Progress Tracker** (`electron/llm/progressTracker.ts`)

Manages progress events with **smart phase grouping**:

```typescript
export class AgentProgressTracker {
  private phaseConfig: PhaseGroupConfig;
  
  startTool(toolName: string, args?: Record<string, unknown>): void
  completeTool(toolName: string, message?: string, duration?: number): void
  failTool(toolName: string, error: string, duration?: number): void
  finish(): void
}
```

**Phase Grouping Logic:**
```
read_file, read_directory, grep_search
         ↓
  ➜ Single "🔍 Inspecting..." phase

create_file, write_file, delete_file
         ↓
  ➜ Single "✏️ Updating..." phase

run_command, run_in_terminal
         ↓
  ➜ Single "▶️ Executing..." phase
```

This avoids UI clutter by **grouping related operations** instead of showing every tool call.

---

### 3. **Agent Orchestrator Integration** (`electron/llm/agent.ts`)

The agent now accepts and uses a progress callback:

```typescript
export class AgentOrchestrator {
  private progressCallback?: ProgressEventCallback;
  
  setProgressCallback(callback: ProgressEventCallback | undefined): void
  
  async sendMessage(userMessage: string): Promise<string> {
    const progressTracker = new AgentProgressTracker(messageId);
    if (this.progressCallback) {
      progressTracker.subscribe(this.progressCallback);
    }
    
    // During tool execution loop:
    progressTracker.startTool(toolCall.name, toolCall.arguments);
    const toolResult = await executeTool(toolCall, context);
    if (toolResult.success) {
      progressTracker.completeTool(toolCall.name);
    } else {
      progressTracker.failTool(toolCall.name, toolResult.error);
    }
    
    // At end:
    progressTracker.finish();
    return finalResponse;
  }
}
```

---

### 4. **IPC Channel** (`electron/main.ts`)

Connects orchestrator to renderer:

```typescript
ipcMain.handle('agent:sendMessage', async (event, { userMessage }) => {
  agentOrchestrator.setProgressCallback((progressEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('agent:progress', progressEvent);
    }
  });
  
  const response = await agentOrchestrator.sendMessage(userMessage);
  return { success: true, response };
});
```

**Flow:**
```
Agent orchestrator
       ↓
progressTracker.emit(event)
       ↓
progressCallback(event)
       ↓
ipcMain.send('agent:progress', event)
       ↓
React Renderer
```

---

### 5. **Preload Bridge** (`electron/preload.ts`)

Exposes progress listener to renderer:

```typescript
onAgentProgress: (callback: (event: any) => void) => {
  const handler = (_event: any, progressEvent: any) => callback(progressEvent);
  ipcRenderer.on('agent:progress', handler);
  return () => {
    ipcRenderer.removeListener('agent:progress', handler);
  };
}
```

---

### 6. **React Store Integration** (`src/store/ideStore.ts`)

Listens to progress events and adds them as "activity messages":

```typescript
if (window.jeniAPI?.onAgentProgress) {
  unsubscribeProgress = window.jeniAPI.onAgentProgress((event: any) => {
    const activityMsg: AgentMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'activity',
      text: formatProgressEventText(event),
      timestamp: Date.now(),
      progressEvent: event
    };
    
    set((state) => ({
      jeniMessages: [...state.jeniMessages, activityMsg]
    }));
  });
}
```

---

### 7. **React UI** (`src/components/JeniPanel/JeniPanel.tsx`)

Renders activity messages with color-coded status:

```typescript
if (isActivity) {
  const getActivityColor = () => {
    switch (event?.type) {
      case 'phase_complete':
      case 'tool_complete':
      case 'agent_complete':
        return 'text-green-400';  // ✓ Success
      case 'tool_error':
        return 'text-red-400';     // ✗ Error
      case 'phase_start':
      case 'tool_start':
        return 'text-blue-400';    // ⚙️ Working
      default:
        return 'text-gray-400';
    }
  };
  
  return (
    <div className={`flex items-center gap-2 ${getActivityColor()}`}>
      <span>{getActivityIcon()}</span>
      <span>{msg.text}</span>
    </div>
  );
}
```

---

## Data Flow Example

**User asks:** "Make me a simple HTML page"

```
User Input
    ↓
sendJeniMessage("Make me a simple HTML page")
    ↓
setProgressCallback(progressCallback)
    ↓
agentOrchestrator.sendMessage()
    ├─ LLM: "I'll create index.html"
    │
    ├─ progressTracker.startTool('create_file')
    │  ├─ emit({ type: 'phase_start', phase: '✏️ Updating files' })
    │  └─ IPC → React: { type: 'phase_start', phase: '✏️ Updating files' }
    │     React: Add activity message "✏️ Updating files..." (blue)
    │
    ├─ executeTool('create_file', { path: 'index.html' })
    │
    ├─ progressTracker.completeTool('create_file')
    │  └─ (No event for individual tool - grouped into phase)
    │
    ├─ progressTracker.startTool('write_file')
    │  ├─ Same phase, no new event emitted
    │
    ├─ progressTracker.completeTool('write_file')
    │
    ├─ progressTracker.endPhase()
    │  ├─ emit({ type: 'phase_complete', phase: '✏️ Updating files', status: 'success' })
    │  └─ IPC → React: { type: 'phase_complete', ... }
    │     React: Update activity message to "✓ Updating files" (green)
    │
    ├─ progressTracker.finish()
    │  ├─ emit({ type: 'agent_complete', totalToolsCalled: 2, totalDuration: 1234 })
    │  └─ IPC → React: { type: 'agent_complete', ... }
    │     React: Add activity message "✓ Done - executed 2 tools in 1s"
    │
    └─ return "I've created a simple HTML page..."
       ↓
       React: Add final Jeni response message
```

**Result in UI:**
```
You:
Make me a simple HTML page

⚙️ Updating files...
✓ Updating files

Done — executed 2 tools in 1s

Jeni:
I've created a simple HTML page with a navigation bar, hero section, and contact section.
```

---

## Phase Grouping Configuration

The system uses a configurable grouping strategy (`getDefaultPhaseGroupConfig()`):

```typescript
{
  readTools: Set(['read_file', 'read_directory', 'grep_search', 'file_search', 'list_dir']),
  writeTools: Set(['create_file', 'write_file', 'replace_string_in_file', 'edit_file', 'delete_file', 'create_directory']),
  executeTools: Set(['run_command', 'run_in_terminal', 'execute_script'])
}
```

**To customize:**
1. Modify `getDefaultPhaseGroupConfig()` in `electron/types/agentProgress.ts`
2. Or pass a custom config when creating `AgentProgressTracker`

---

## Benefits

✅ **User sees real-time progress** — Activity appears as it happens, not after waiting
✅ **Reduced UI noise** — Related operations grouped, not every tool call shown
✅ **Clean separation** — Tool results for LLM, progress events for UI
✅ **Professional feel** — Matches Copilot/Cursor behavior
✅ **Easy to extend** — Add new event types or phases without changing agent logic

---

## Future Enhancements

1. **Per-tool event details** — Toggle to show/hide individual tool execution
2. **Collapsible phases** — Click to expand and see which tools ran in a phase
3. **Phase timing breakdown** — Show which phase took longest
4. **Error recovery UI** — If a phase fails, show retry option
5. **Progress bar for long phases** — Estimate completion based on tool count
6. **Undo/Redo based on phases** — Revert a whole phase's changes

---

## Testing Progress Events

To test, ask Jeni to:
- Create multiple files (tests "updating" phase grouping)
- Read and search project files (tests "inspecting" phase grouping)
- Run commands (tests "executing" phase grouping)
- Do a multi-phase task (tests phase transitions)

You should see:
- Activity messages appear as work progresses
- Phase messages change from working (blue) → complete (green)
- No individual tool call spam
- Final summary with tool count and duration
