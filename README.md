# Jeni IDE - AI-Native Desktop IDE (Phase 1)

Jeni is an AI-native desktop IDE built from the ground up to provide a fast, secure, modern, and developer-focused environment targeting Windows.

---

## 🏗 Project Structure

```text
jeni-ide/
├── electron/
│   ├── main.ts                   # Electron main process & IPC handlers
│   ├── preload.ts                # Context bridge exposing window.jeniAPI
│   ├── filesystem/
│   │   └── index.ts              # Secure filesystem, workspace boundary checks, size tiering
│   ├── terminal/
│   │   ├── index.ts              # node-pty terminal manager with fallback
│   │   └── fallback.ts           # child_process spawn fallback runner
│   └── store/
│       └── recentProjects.ts     # Recent projects store in Electron userData
│
├── src/
│   ├── components/
│   │   ├── ActivityBar/          # Vertical navigation bar
│   │   ├── Sidebar/              # Collapsible sidebar (FileExplorer, Search, etc.)
│   │   ├── FileExplorer/         # Lazy-expanded directory tree with context menu
│   │   ├── Editor/               # Monaco Editor container with size/type handling
│   │   ├── Tabs/                 # Tab bar with dirty state and unsaved prompt modal
│   │   ├── Terminal/             # Integrated terminal panel with PTY badge
│   │   ├── JeniPanel/            # Jeni AI chat assistant panel
│   │   ├── StatusBar/            # Bottom workspace status bar
│   │   ├── WelcomeScreen/        # Landing screen with Recent Projects
│   │   ├── CommandPalette/       # Quick command palette overlay (Ctrl+Shift+P)
│   │   ├── QuickOpen/            # Quick file search overlay (Ctrl+P)
│   │   └── Modals/               # Unsaved changes modal dialog
│   │
│   ├── store/
│   │   └── ideStore.ts           # Centralized Zustand state store
│   │
│   ├── types/
│   │   ├── electron.d.ts         # Window bridge TypeScript declarations
│   │   ├── ide.ts                # IDE state models
│   │   └── aiAgent.ts            # Decoupled AI Agent & Tool interfaces
│   │
│   ├── App.tsx                   # Main layout container & hotkey listeners
│   ├── main.tsx                  # React DOM entry point
│   └── index.css                 # Tailwind CSS & custom scrollbar styles
│
├── brain.md                      # Phase 1 Specification
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite + Electron build bundler configuration
└── tailwind.config.js            # Tailwind CSS design tokens
```

---

## 🛠 Technologies Used

- **Desktop Container**: Electron
- **Renderer UI Framework**: React 18 & TypeScript
- **Bundler & Build Tool**: Vite & `vite-plugin-electron`
- **Styling**: Tailwind CSS & Lucide React icons
- **State Management**: Zustand
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Terminal Execution**: `node-pty` (Interactive PTY) with `child_process.spawn` degraded mode fallback

---

## 🚀 How to Install & Run

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm
- Windows OS (Windows PowerShell default shell)

### Installation
```bash
npm install
```

### Running in Development
Start Vite dev server and Electron window simultaneously:
```bash
npm run dev
```

### Building the Production Desktop Application
To compile TypeScript and build the production bundle:
```bash
npm run build
```

### Creating a Windows Installer
To create a Windows NSIS installer locally:
```bash
npm run dist
```

The installer is written to `release/`. GitHub Actions builds and publishes the installer automatically when a version tag such as `v0.1.0` is pushed. Create a release with:
```bash
git tag v0.1.0
git push origin v0.1.0
```

The generated `.exe` installer is then available from the repository's GitHub Releases page.

---

## ⚠️ Known Limitations & Design Scope Boundary

1. **PTY Native Build & Degraded Fallback Mode**:
   - `node-pty` requires native C++ compilation on Windows via `node-gyp` and Visual Studio Build Tools.
   - If `node-pty` is not compiled/available in the build environment, Jeni IDE automatically falls back to a process spawn runner (`child_process.spawn('powershell.exe')`).
   - The integrated terminal UI explicitly displays a **"Degraded Spawn Runner"** badge when operating in fallback mode.

2. **Phase 1 Session State Boundary**:
   - Recent projects history and low-risk UI preferences (sidebar width, terminal height) persist across app relaunch in `%APPDATA%/jeni-ide/recent-projects.json`.
   - Open tabs, active file position, terminal buffer, and unsaved edits remain in-memory for Phase 1 and reset on app exit (guarded by unsaved changes prompt on exit/tab close).

3. **Workspace Path Boundary**:
   - All File Explorer operations (create, rename, delete, read, write) are strictly restricted to paths within the active workspace root to prevent unintended file system modifications outside project boundaries.

---

## 🤖 Recommended Next Steps for Jeni AI Agent (Phase 2)

1. **Backend LLM Integration**: Connect the decoupled `AgentTool` registry in `src/types/aiAgent.ts` to OpenAI, Anthropic, or local LLM backends (Ollama/llama.cpp).
2. **Tool Execution Engine**: Register filesystem tools (`read_file`, `write_file`, `search_code`), terminal tools (`run_command`), and diff review tools into the Agent Loop.
3. **Session State Persistence**: Expand `recent-projects.json` into a full workspace state database to preserve open tabs, split panes, and active agent conversations across sessions.
