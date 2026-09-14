import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

export interface TerminalInstance {
  isTruePty: boolean;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export function childProcessTerminal(
  cwd: string,
  onData: (data: string) => void,
  onExit?: () => void
): TerminalInstance {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  let proc: ChildProcessWithoutNullStreams | null = spawn(shell, [], {
    cwd: cwd || process.cwd(),
    env: process.env
  });

  proc.stdout.on('data', (data: Buffer) => {
    onData(data.toString());
  });

  proc.stderr.on('data', (data: Buffer) => {
    onData(data.toString());
  });

  proc.on('close', () => {
    proc = null;
    if (onExit) onExit();
  });

  return {
    isTruePty: false,
    write(data: string) {
      if (proc && proc.stdin && proc.stdin.writable) {
        proc.stdin.write(data);
      }
    },
    resize() {
      // Child process spawn has no TTY resize capability
    },
    kill() {
      if (proc) {
        try {
          proc.kill();
        } catch {
          // ignore
        }
        proc = null;
      }
    }
  };
}
