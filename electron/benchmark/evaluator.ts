import fs from 'node:fs';
import path from 'node:path';

import { isPathInWorkspace } from '../filesystem';
import type {
  BenchmarkCriterionResult,
  BenchmarkResult,
  BenchmarkSuccessCriterion,
  BenchmarkTask,
  BenchmarkTrajectory
} from '../types/benchmark';

interface CommandObservation {
  command?: string;
  exitCode?: number | null;
  success?: boolean;
}

type FileExistsCriterion = Extract<BenchmarkSuccessCriterion, { type: 'file_exists' }>;
type FileContainsCriterion = Extract<BenchmarkSuccessCriterion, { type: 'file_contains' }>;
type FileNotExistsCriterion = Extract<BenchmarkSuccessCriterion, { type: 'file_not_exists' }>;
type CommandExitCodeCriterion = Extract<BenchmarkSuccessCriterion, { type: 'command_exit_code' }>;
type WorkspaceUnchangedCriterion = Extract<BenchmarkSuccessCriterion, { type: 'workspace_unchanged' }>;

function safeCriterionId(criterion: unknown): string {
  if (criterion && typeof criterion === 'object' && typeof (criterion as { id?: unknown }).id === 'string') {
    return (criterion as { id: string }).id;
  }
  return 'unknown-criterion';
}

function result(
  criterion: unknown,
  passed: boolean,
  reason: string,
  observed?: unknown
): BenchmarkCriterionResult {
  return {
    criterionId: safeCriterionId(criterion),
    passed,
    reason,
    ...(observed === undefined ? {} : { observed })
  };
}

function resolveCriterionPath(workspaceRoot: string, targetPath: unknown): string | null {
  if (typeof targetPath !== 'string' || !targetPath.trim() || !workspaceRoot) return null;
  const resolved = path.resolve(workspaceRoot, targetPath);
  return isPathInWorkspace(resolved, workspaceRoot) ? resolved : null;
}

function evaluateFileExists(criterion: FileExistsCriterion, workspaceRoot: string): BenchmarkCriterionResult {
  const filePath = resolveCriterionPath(workspaceRoot, criterion.path);
  if (!filePath) return result(criterion, false, 'Expected file path is missing or outside the workspace.');

  try {
    const exists = fs.statSync(filePath).isFile();
    return result(criterion, exists, exists ? `File exists: ${criterion.path}` : `Expected file does not exist: ${criterion.path}`, { exists });
  } catch {
    return result(criterion, false, `Expected file does not exist: ${criterion.path}`, { exists: false });
  }
}

function evaluateFileContains(criterion: FileContainsCriterion, workspaceRoot: string): BenchmarkCriterionResult {
  const filePath = resolveCriterionPath(workspaceRoot, criterion.path);
  if (!filePath || typeof criterion.text !== 'string') {
    return result(criterion, false, 'File path or expected text is missing or invalid.');
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contains = content.includes(criterion.text);
    return result(
      criterion,
      contains,
      contains ? `File contains expected text: ${criterion.path}` : `File does not contain expected text: ${criterion.path}`,
      { contains, expectedText: criterion.text }
    );
  } catch {
    return result(criterion, false, `Could not read expected file: ${criterion.path}`, { contains: false });
  }
}

function evaluateFileNotExists(criterion: FileNotExistsCriterion, workspaceRoot: string): BenchmarkCriterionResult {
  const filePath = resolveCriterionPath(workspaceRoot, criterion.path);
  if (!filePath) return result(criterion, false, 'Expected file path is missing or outside the workspace.');

  const exists = fs.existsSync(filePath);
  return result(criterion, !exists, exists ? `Unexpected file exists: ${criterion.path}` : `File is absent: ${criterion.path}`, { exists });
}

function commandObservation(trajectory: BenchmarkTrajectory, command: string): CommandObservation | null {
  for (const event of [...trajectory.toolCalls].reverse()) {
    if (event.toolCall.name !== 'run_command') continue;
    const data = event.result.data;
    if (!data || typeof data !== 'object') continue;
    const observation = data as CommandObservation;
    if (observation.command === command) return observation;
  }
  return null;
}

function evaluateCommandExitCode(criterion: CommandExitCodeCriterion, trajectory: BenchmarkTrajectory): BenchmarkCriterionResult {
  if (typeof criterion.command !== 'string' || typeof criterion.exitCode !== 'number') {
    return result(criterion, false, 'Command or expected exit code is missing or invalid.');
  }

  const observed = commandObservation(trajectory, criterion.command);
  if (!observed) return result(criterion, false, `No observed command result matched: ${criterion.command}`);

  const passed = observed.exitCode === criterion.exitCode;
  return result(
    criterion,
    passed,
    passed ? `Command exited with expected code: ${criterion.exitCode}` : `Command exited with ${String(observed.exitCode)}, expected ${criterion.exitCode}`,
    { command: observed.command, exitCode: observed.exitCode, success: observed.success }
  );
}

function listWorkspaceFiles(workspaceRoot: string): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(path.relative(workspaceRoot, fullPath).split(path.sep).join('/'));
    }
  };
  visit(workspaceRoot);
  return files.sort();
}

function evaluateWorkspaceUnchanged(criterion: WorkspaceUnchangedCriterion, task: BenchmarkTask, workspaceRoot: string): BenchmarkCriterionResult {
  try {
    const expectedFiles = Object.keys(task.setup.files).map((file) => file.replace(/\\/g, '/')).sort();
    const actualFiles = listWorkspaceFiles(workspaceRoot);
    const changedFiles = expectedFiles.filter((file) => {
      const resolved = resolveCriterionPath(workspaceRoot, file);
      if (!resolved) return true;
      try {
        return fs.readFileSync(resolved, 'utf8') !== task.setup.files[file.replace(/\\/g, path.sep)];
      } catch {
        return true;
      }
    });
    const unexpectedFiles = actualFiles.filter((file) => !expectedFiles.includes(file));
    const unchanged = changedFiles.length === 0 && unexpectedFiles.length === 0 && actualFiles.length === expectedFiles.length;
    return result(criterion, unchanged, unchanged ? 'Workspace matches its initial file state.' : 'Workspace files differ from the initial setup.', {
      changedFiles,
      unexpectedFiles
    });
  } catch {
    return result(criterion, false, 'Could not inspect workspace state.');
  }
}

function evaluateCriterion(
  criterion: BenchmarkSuccessCriterion,
  task: BenchmarkTask,
  workspaceRoot: string,
  trajectory: BenchmarkTrajectory
): BenchmarkCriterionResult {
  switch (criterion.type) {
    case 'file_exists':
      return evaluateFileExists(criterion, workspaceRoot);
    case 'file_contains':
      return evaluateFileContains(criterion, workspaceRoot);
    case 'file_not_exists':
      return evaluateFileNotExists(criterion, workspaceRoot);
    case 'command_exit_code':
      return evaluateCommandExitCode(criterion, trajectory);
    case 'workspace_unchanged':
      return evaluateWorkspaceUnchanged(criterion, task, workspaceRoot);
    default:
      return result(criterion, false, 'Unsupported or malformed benchmark criterion.');
  }
}

export function evaluateBenchmarkCriteria(
  task: BenchmarkTask,
  workspaceRoot: string,
  trajectory: BenchmarkTrajectory
): BenchmarkCriterionResult[] {
  if (!task || !Array.isArray(task.successCriteria)) {
    return [{ criterionId: 'invalid-task', passed: false, reason: 'Benchmark task has no valid success criteria.' }];
  }

  return task.successCriteria.map((criterion) => {
    try {
      return evaluateCriterion(criterion, task, workspaceRoot, trajectory);
    } catch {
      return result(criterion, false, 'Criterion evaluation failed safely.');
    }
  });
}

export function applyBenchmarkEvaluation(
  benchmarkResult: BenchmarkResult,
  task: BenchmarkTask,
  workspaceRoot: string
): BenchmarkResult {
  const criterionResults = evaluateBenchmarkCriteria(task, workspaceRoot, benchmarkResult.trajectory);
  return {
    ...benchmarkResult,
    success: criterionResults.length > 0 && criterionResults.every((criterion) => criterion.passed),
    criterionResults
  };
}
