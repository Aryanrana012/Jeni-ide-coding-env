import { CommandResult, Diagnostic } from '../types/ide';

export interface CommandDiagnosticResult {
  file: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source: 'terminal' | 'build';
}

export function normalizePathForDiagnostic(file: string, cwd?: string): string {
  if (!file) return 'command-output';

  let normalized = file.trim();
  normalized = normalized.replace(/\s*\(\d+(?:,\d+)?\)\s*(?::\s*(?:error|warning|info)\b.*)?$/i, '');
  normalized = normalized.replace(/\s*:\s*(?:error|warning|info)\b.*$/i, '');
  normalized = normalized.replace(/\\/g, '/');

  if (!cwd) return normalized;

  const candidate = normalized.replace(/\\/g, '/');
  const cwdNormalized = cwd.replace(/\\/g, '/');

  if (candidate.startsWith(cwdNormalized)) {
    return candidate.slice(cwdNormalized.length).replace(/^\/+/, '');
  }

  return normalized;
}

export function parsePythonTracebackDiagnostics(stdout: string, stderr: string, cwd?: string): CommandDiagnosticResult[] {
  const combined = `${stdout}\n${stderr}`.replace(/\r\n/g, '\n');
  if (!/Traceback\s+\(most recent call last\):/i.test(combined)) {
    return [];
  }

  const framePattern = /File\s+["']([^"']+)["']\s*,\s*line\s+(\d+)(?:,\s*in\s+([^\n]+))?/gi;
  const frameMatches = Array.from(combined.matchAll(framePattern));
  if (frameMatches.length === 0) {
    return [];
  }

  const lastFrame = frameMatches[frameMatches.length - 1];
  const file = normalizePathForDiagnostic(lastFrame[1], cwd);
  const line = Number(lastFrame[2]);

  const errorPattern = /([A-Za-z_][A-Za-z0-9_\.]*?(?:Error|Exception|Warning)):\s*(.+)/g;
  const errorMatches = Array.from(combined.matchAll(errorPattern));
  const errorMatch = errorMatches.length > 0 ? errorMatches[errorMatches.length - 1] : null;

  if (!errorMatch || !errorMatch[1] || !errorMatch[2]) {
    return [];
  }

  const message = `${errorMatch[1]}: ${errorMatch[2].trim()}`;
  return [{
    file,
    line: Number.isFinite(line) ? line : undefined,
    severity: 'error',
    message,
    source: 'terminal'
  }];
}

export function normalizeCommandDiagnostics(command: string, stdout: string, stderr: string, cwd?: string): CommandDiagnosticResult[] {
  const combined = `${stdout}\n${stderr}`;
  const diagnostics: CommandDiagnosticResult[] = [];
  const pattern = /([^\r\n:]+?\((\d+),(\d+)\):\s*(error|warning)\s*(?:[A-Z]+\d+:\s*)?(.+)|([^\r\n:]+?):\s*(error|warning)\s*(?:[A-Z]+\d+:\s*)?(.+))/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(combined)) !== null) {
    const file = match[1] || match[6] || '';
    const line = match[2] ? Number(match[2]) : undefined;
    const column = match[3] ? Number(match[3]) : undefined;
    const severity = ((match[4] || match[7] || 'error').toLowerCase() === 'warning' ? 'warning' : 'error') as 'error' | 'warning';
    const message = (match[5] || match[8] || '').trim();

    if (!file && !message) continue;

    diagnostics.push({
      file: file ? normalizePathForDiagnostic(file, cwd) : 'command-output',
      line,
      column,
      severity,
      message,
      source: 'build'
    });
  }

  diagnostics.push(...parsePythonTracebackDiagnostics(stdout, stderr, cwd));

  return diagnostics.slice(0, 10);
}

export function buildDiagnosticsForCommandResult(
  result: Pick<CommandResult, 'command' | 'cwd' | 'stdout' | 'stderr'>,
  existingDiagnostics: Diagnostic[] = []
): Diagnostic[] {
  const retained = existingDiagnostics.filter((diag) => diag.source !== 'terminal' && diag.source !== 'build');
  const commandDiagnostics = normalizeCommandDiagnostics(result.command, result.stdout || '', result.stderr || '', result.cwd);

  return [
    ...retained,
    ...commandDiagnostics.map((diag) => ({
      id: `${diag.source}-${Date.now()}-${diag.file}-${diag.line ?? '0'}-${diag.column ?? '0'}`,
      ...diag,
      timestamp: Date.now()
    }))
  ];
}
