You are a senior desktop application architect and AI coding-agent engineer.

I want you to build the first production-quality foundation of my project:

PROJECT NAME: Jeni IDE

Jeni is an AI-native desktop IDE. It should eventually become an AI coding
environment where an AI agent can understand a user's project, inspect files,
edit code, run commands, test changes, and help the developer complete tasks.

IMPORTANT:
Do NOT build a clone of VS Code.
Do NOT copy VS Code's UI.
Create an original, modern, premium IDE experience designed around Jeni AI.

==================================================
CORE TECHNOLOGY
==================================================

Use:

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Monaco Editor
- Node.js
- pnpm
- Zustand for state management
- Lucide React for icons

Use clean TypeScript throughout.

The application must run locally on Windows.

Architecture should be modular so that the AI agent can be added later
without rewriting the IDE.

==================================================
PHASE 1 GOAL
==================================================

Build a fully functional IDE foundation.

DO NOT implement the advanced AI agent yet.

The application must allow a developer to:

1. Open a local project/folder
2. Browse its filesystem
3. Open files
4. Edit files
5. Save files
6. Create files
7. Create folders
8. Rename files/folders
9. Delete files/folders
10. Open multiple files/tabs
11. Close tabs
12. Use Monaco Editor
13. Switch between common programming languages
14. Use an integrated terminal
15. Run shell commands
16. View terminal output
17. Have a dedicated Jeni AI panel placeholder
18. Maintain application state correctly (see STATE PERSISTENCE below —
    this phase is in-memory-only per session; nothing survives relaunch
    except the recent-projects list)

==================================================
DESKTOP ARCHITECTURE
==================================================

Use secure Electron architecture.

DO NOT give the React renderer unrestricted filesystem access.

Use:

React Renderer
      ↓
Electron IPC
      ↓
Preload API
      ↓
Electron Main Process
      ↓
Node.js filesystem / terminal APIs

Use contextIsolation.

Do NOT enable nodeIntegration in the renderer.

Expose only the required APIs through preload.

==================================================
PROJECT STRUCTURE
==================================================

Create a clean architecture similar to:

jeni-ide/
│
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── filesystem/
│   │   └── ...
│   └── terminal/
│       └── ...
│
├── src/
│   ├── components/
│   │   ├── ActivityBar/
│   │   ├── Sidebar/
│   │   ├── FileExplorer/
│   │   ├── Editor/
│   │   ├── Tabs/
│   │   ├── Terminal/
│   │   ├── JeniPanel/
│   │   └── StatusBar/
│   │
│   ├── store/
│   │   └── ideStore.ts
│   │
│   ├── hooks/
│   │   └── ...
│   │
│   ├── types/
│   │   └── ...
│   │
│   ├── utils/
│   │   └── ...
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md

You may improve this structure if there is a better architectural approach.

==================================================
UI DESIGN
==================================================

Create a premium dark IDE interface.

Design principles:

- Minimal
- Modern
- Professional
- Developer-focused
- Fast
- Clean
- Low visual noise
- Excellent spacing
- Smooth transitions
- Keyboard-friendly

Layout:

┌──────────────────────────────────────────────────────────┐
│ JENI                                              — □ X │
├──────┬──────────────────┬──────────────────────┬─────────┤
│      │                  │                      │         │
│ ACT. │ FILE EXPLORER   │      MONACO          │  JENI   │
│ BAR  │                  │      EDITOR          │  AI     │
│      │                  │                      │ PANEL   │
│      │                  │                      │         │
├──────┴──────────────────┴──────────────────────┴─────────┤
│                    INTEGRATED TERMINAL                    │
├──────────────────────────────────────────────────────────┤
│ Status: main • TypeScript • UTF-8                 Ready  │
└──────────────────────────────────────────────────────────┘

The exact design is up to you, but maintain this overall structure.

==================================================
ACTIVITY BAR
==================================================

Create icons for:

- Explorer
- Search
- Source Control
- Extensions
- Jeni AI

The icons should switch the sidebar content.

Search, Source Control, and Extensions panels may be non-functional
placeholders in Phase 1 (clearly labeled "not yet implemented" in the UI,
not blank) — only Explorer and Jeni AI need to be fully functional.

==================================================
FILE EXPLORER
==================================================

Implement a real filesystem explorer.

Requirements:

- Open folder
- Tree view
- Expand/collapse folders
- File icons
- Folder icons
- Single click selects
- Double click opens file
- Context menu
- New file
- New folder
- Rename
- Delete
- Refresh

Do not fake the filesystem with static data.

Use the real local filesystem through Electron IPC.

Protect against dangerous paths and malformed requests.

WORKSPACE BOUNDARY (explicit, not "where appropriate"):
- All File Explorer operations (create, rename, delete, read, write) MUST
  be restricted to paths inside the currently opened workspace root.
  Reject any resolved path that escapes the workspace root (via `..`,
  symlink, or absolute path) with a clear error — do not silently clamp
  or truncate.
- The integrated Terminal is explicitly exempt from this boundary — a
  real shell can `cd` anywhere, and restricting it would make the
  terminal useless. Its starting cwd is the workspace root, but the user
  may navigate outside it.
- Command Palette actions (New File, New Folder, etc.) follow the same
  workspace-root restriction as the File Explorer.

Directory listing performance: do not recursively read the entire
project tree on folder open. Load one directory level at a time
(lazy-expand on click), and skip `node_modules`, `.git`, and other
common heavy/hidden directories from the initial tree (still
accessible if the user explicitly navigates in, but not auto-expanded
or watched).

==================================================
EDITOR
==================================================

Use Monaco Editor.

Implement:

- Syntax highlighting
- Multiple tabs
- Active tab
- Close tab
- Dirty state
- Save
- Ctrl+S
- Automatic language detection based on extension
- Basic editor settings

Support at minimum:

- JavaScript
- TypeScript
- JSX
- TSX
- Python
- Java
- C++
- HTML
- CSS
- JSON
- Markdown

The editor must load the actual contents of files.

When the user edits a file, update application state.

When Ctrl+S is pressed, save through Electron IPC.

FILE SIZE / TYPE HANDLING (explicit):
- Text files up to 5 MB open normally in Monaco.
- Text files between 5 MB and 25 MB open in a reduced-feature mode
  (syntax highlighting off, editable, saveable) with a visible banner
  explaining why. This threshold is a starting point — reasonable to
  tune once real usage shows where the editor actually gets sluggish.
- Text files over 25 MB are not opened inline; show a message with the
  file size and a note that it's too large to edit in Jeni.
- Binary files (detected via extension allowlist or null-byte sniff of
  the first chunk) are not sent to Monaco. Show a simple "binary file"
  placeholder in the tab instead of attempting to render/decode it.
- File type detection for the binary check does not need to be
  exhaustive in Phase 1 — a reasonable heuristic (known text extensions
  + null-byte sniff fallback) is sufficient; this can be hardened later.

==================================================
TABS
==================================================

Implement a proper tab system.

Each tab should contain:

- file path
- file name
- language
- content
- dirty state

Support:

- open
- close
- switch
- dirty indicator
- save

Do not lose unsaved changes accidentally. Closing a dirty tab must
prompt the user (Save / Don't Save / Cancel) before closing. Closing
the app with dirty tabs must prompt the same way before quitting.

==================================================
TERMINAL
==================================================

Create an integrated terminal panel.

It should execute commands in the currently opened project directory.

The terminal should support Windows PowerShell.

Architecture:

React Terminal UI
       ↓
IPC
       ↓
Electron
       ↓
PTY / shell process

The terminal must stream stdout/stderr to the UI.

Support:

- command input
- output streaming
- clear
- restart terminal
- working directory
- Ctrl+C

Do not block the Electron main process.

PTY IMPLEMENTATION (explicit, since this is the highest-risk dependency
in the whole project):
- Use `node-pty`. It requires native compilation on Windows (node-gyp +
  either Visual Studio Build Tools or `windows-build-tools`/prebuilt
  binaries). Attempt prebuilt binary installation first; if native
  compilation is required and the build toolchain is missing, this is
  an expected failure mode — document it clearly in the README's "Known
  Limitations" rather than silently failing.
- If `node-pty` cannot be installed/compiled in the build environment,
  fall back to a documented degraded mode: a simple `child_process.spawn`
  based command runner (single command in, streamed output, no true
  TTY/interactivity, no resize support). This is not equivalent to a
  real terminal but keeps "run shell commands and see output" working.
  Clearly label in the UI which mode is active.

==================================================
JENI AI PANEL
==================================================

Create a polished Jeni AI panel on the right side.

For Phase 1 it can be a functional UI placeholder.

It should contain:

- Conversation area
- Input box
- Send button
- New conversation button
- Model indicator
- Loading state
- Empty state

Example:

JENI

"How can I help?"

[ Ask Jeni anything... ]

Later this panel will connect to an AI agent.

Do NOT hardcode fake AI responses.

If no AI backend is implemented yet, clearly show that the AI engine is
not connected (e.g. sending a message shows a "Jeni AI engine is not yet
connected" state, not a fake reply and not a silent no-op).

==================================================
STATE MANAGEMENT
==================================================

Use Zustand.

Create centralized state for:

- current workspace
- files
- opened tabs
- active tab
- editor content
- dirty state
- terminal state
- sidebar state
- Jeni panel state
- UI preferences

Avoid unnecessary global state.

==================================================
STATE PERSISTENCE (explicit)
==================================================

Phase 1 persists only two things across app relaunch:

1. Recent projects list (see RECENT PROJECTS below).
2. UI preferences that are cheap and low-risk to persist: sidebar
   width/visibility, last active activity-bar tab, terminal panel
   height/visibility.

Everything else (open tabs, active tab, unsaved edits, terminal
session/history, scroll position) is in-memory only for Phase 1 and is
lost on quit. This is a deliberate scope boundary, not an oversight —
restoring full workspace session state is a reasonable Phase 2 item.
The only place this matters for data safety is the "unsaved changes on
quit" prompt above, which still applies.

Persist via a single JSON file in Electron's `userData` directory
(no extra dependency needed — plain `fs` read/write guarded by
try/catch is sufficient at this scale).

==================================================
ERROR HANDLING
==================================================

Implement proper error handling.

Examples:

- File doesn't exist
- Permission denied
- File cannot be saved
- Invalid path
- Folder cannot be opened
- Terminal fails
- Unsupported operation

Display user-friendly errors.

Do not silently swallow errors.

==================================================
SECURITY
==================================================

Treat this as a real desktop application.

Requirements:

- contextIsolation enabled
- nodeIntegration disabled
- secure preload bridge
- validate IPC inputs
- restrict filesystem operations to the opened workspace (see WORKSPACE
  BOUNDARY under FILE EXPLORER — this is now a hard rule, not a
  judgment call)
- do not expose arbitrary Node APIs to renderer
- do not execute arbitrary commands automatically
- never expose API keys to renderer

==================================================
PERFORMANCE
==================================================

The IDE should remain responsive.

Avoid:

- unnecessary React re-renders
- reading the entire project repeatedly
- loading huge files unnecessarily
- blocking the Electron main process
- storing unnecessary duplicate file contents

Use lazy loading where appropriate (see directory listing performance
note under FILE EXPLORER, and file size thresholds under EDITOR).

==================================================
KEYBOARD SHORTCUTS
==================================================

Implement:

Ctrl+S          Save
Ctrl+P          Quick file open
Ctrl+Shift+P    Command palette
Ctrl+W          Close tab
Ctrl+`          Toggle terminal
Ctrl+B          Toggle sidebar

On macOS, use Cmd equivalents where appropriate. (Windows is the
primary target per CORE TECHNOLOGY; macOS support is best-effort if
Electron's cross-platform defaults make it easy, not a separate QA pass.)

==================================================
COMMAND PALETTE
==================================================

Create a basic command palette.

Commands:

- Open Folder
- New File
- New Folder
- Save
- Close Tab
- Toggle Terminal
- Toggle Jeni
- Refresh Explorer

==================================================
OPEN FOLDER
==================================================

When the user launches the application without a workspace:

show a polished welcome screen:

JENI

Your AI-native development environment.

[ Open Folder ]

[ Open Recent ]

After opening a folder, transition into the IDE.

==================================================
RECENT PROJECTS
==================================================

Implement a lightweight recent-project list.

Store only the necessary local path information (absolute path + last
opened timestamp + display name derived from folder name — nothing
else). Cap the list at a reasonable size (e.g. 10) and drop entries
whose path no longer exists on disk when the list is loaded, rather
than showing dead entries.

==================================================
AI ARCHITECTURE PREPARATION
==================================================

Even though the AI agent is NOT being implemented fully yet, design the
code so that later we can add:

AI Engine
    ↓
Agent Loop
    ↓
Tool Registry
    ├── read_file
    ├── write_file
    ├── edit_file
    ├── search_files
    ├── run_terminal
    ├── git_diff
    └── etc.

The Jeni AI panel should be decoupled from the future AI engine.

Create interfaces/types where appropriate.

For example:

interface AgentTool {
    name: string;
    description: string;
    execute(...): Promise<...>;
}

Do not implement unnecessary tools yet.

==================================================
IMPORTANT DEVELOPMENT RULES
==================================================

1. Do not create fake functionality when real functionality is requested.
2. Do not use mock filesystem data.
3. Do not hardcode project files.
4. Do not use placeholder buttons that appear functional but do nothing.
   (Exception: Search / Source Control / Extensions sidebar panels,
   which are explicitly allowed to be labeled placeholders per
   ACTIVITY BAR above — the rule is "don't pretend," not "everything
   must be complete.")
5. Keep components modular.
6. Use TypeScript types properly.
7. Keep Electron main-process code separate from renderer code.
8. Do not expose Node.js directly to React.
9. Handle errors properly.
10. Keep the code readable and maintainable.
11. Add comments only where they provide useful architectural context.
12. Do not over-engineer Phase 1.
13. Do not add unnecessary dependencies.
14. Do not implement authentication, cloud sync, database, accounts,
    payments, or multiplayer.
15. Do not implement the full AI agent yet.

==================================================
TESTING
==================================================

Two tiers, since a full Electron GUI cannot always be driven
interactively in every execution environment:

Automated / headless-verifiable (must pass before calling this done):
1. Install dependencies cleanly.
2. TypeScript compiles with no errors (`tsc --noEmit`).
3. Vite dev build succeeds.
4. Electron main process boots without throwing.
5. No console errors on initial render (checkable via logged output).

Manual / interactive (verify if the environment supports launching and
driving a GUI window; otherwise list as "unverified — needs manual
pass" in the final report rather than silently skipping):
6. Verify folder selection works.
7. Verify filesystem tree works (including lazy-expand, node_modules
   excluded from auto-expand).
8. Verify files open, including the size-tiered behavior (normal,
   reduced-feature, too-large, binary).
9. Verify Monaco editing works.
10. Verify Ctrl+S saves files.
11. Verify tabs work, including the dirty-tab-close prompt.
12. Verify create/rename/delete works and is rejected outside the
    workspace root.
13. Verify terminal works (or degraded fallback mode is clearly labeled).
14. Verify command palette works.
15. Verify Jeni panel renders and shows "not connected" state on send.
16. Fix all TypeScript/build/runtime errors found in either tier.

Do not stop after generating code. Run what can be run in this
environment, and be explicit in the final report about which checks
were actually executed versus which need a human on a Windows machine
with a display.

==================================================
FINAL REQUIREMENT
==================================================

When finished, provide:

1. Final project structure
2. Technologies used
3. How to install
4. How to run in development
5. How to build the desktop application
6. Known limitations (explicitly including: PTY/node-pty native build
   risk on Windows and its fallback behavior; Phase 1 in-memory-only
   session state; which manual test-tier items were actually verified
   vs. left for a human pass)
7. Recommended next step for Jeni AI Agent

Most importantly:

BUILD THE APPLICATION, DO NOT JUST EXPLAIN HOW TO BUILD IT.

Start by inspecting the current directory and existing files.
If this is an empty project, initialize the architecture.
If files already exist, preserve useful work and integrate with it
rather than blindly overwriting everything.