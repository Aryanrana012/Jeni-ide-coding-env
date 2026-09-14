import { childProcessTerminal, TerminalInstance } from './fallback';

let ptyModule: any = null;
let ptyLoaded = false;

// Attempt to load node-pty
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ptyModule = require('node-pty');
  ptyLoaded = true;
} catch (e) {
  console.warn('[Jeni Terminal] node-pty not available or failed to load. Falling back to spawn mode.', e);
  ptyLoaded = false;
}

class PTYInstance implements TerminalInstance {
  private ptyProcess: any;
  public isTruePty = true;

  constructor(cwd: string, onData: (data: string) => void, onExit?: () => void) {
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
    
    this.ptyProcess = ptyModule.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: cwd || process.cwd(),
      env: process.env as any
    });

    this.ptyProcess.onData((data: string) => {
      onData(data);
    });

    this.ptyProcess.onExit(() => {
      if (onExit) onExit();
    });
  }

  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ptyProcess && typeof this.ptyProcess.resize === 'function') {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch (err) {
        console.error('PTY resize error:', err);
      }
    }
  }

  kill(): void {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch (err) {
        console.error('PTY kill error:', err);
      }
    }
  }
}

let currentTerminalSession: TerminalInstance | null = null;

export function createTerminalSession(
  cwd: string,
  onData: (data: string) => void
): { success: boolean; isTruePty: boolean; error?: string } {
  try {
    if (currentTerminalSession) {
      currentTerminalSession.kill();
      currentTerminalSession = null;
    }

    if (ptyLoaded && ptyModule) {
      currentTerminalSession = new PTYInstance(cwd, onData, () => {
        onData('\r\n[Process Exited]\r\n');
      });
      return { success: true, isTruePty: true };
    } else {
      currentTerminalSession = childProcessTerminal(cwd, onData, () => {
        onData('\r\n[Process Exited]\r\n');
      });
      return { success: true, isTruePty: false };
    }
  } catch (err: any) {
    console.error('Failed to create terminal session:', err);
    try {
      currentTerminalSession = childProcessTerminal(cwd, onData, () => {
        onData('\r\n[Process Exited]\r\n');
      });
      return { success: true, isTruePty: false };
    } catch (fallbackErr: any) {
      return { success: false, isTruePty: false, error: fallbackErr.message };
    }
  }
}

export function sendTerminalData(data: string): void {
  if (currentTerminalSession) {
    currentTerminalSession.write(data);
  }
}

export function resizeTerminal(cols: number, rows: number): void {
  if (currentTerminalSession) {
    currentTerminalSession.resize(cols, rows);
  }
}

export function killTerminalSession(): void {
  if (currentTerminalSession) {
    currentTerminalSession.kill();
    currentTerminalSession = null;
  }
}
