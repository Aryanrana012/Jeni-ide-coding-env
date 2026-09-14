import type { BenchmarkTask } from '../types/benchmark';

export const benchmarkTasks: readonly BenchmarkTask[] = [
  {
    id: 'simple-execution',
    name: 'Simple command execution',
    description: 'Run a small script and correctly observe its successful result.',
    prompt: 'Run hello.py and report whether it completed successfully.',
    setup: {
      files: {
        'hello.py': 'print("hello from benchmark")\n'
      }
    },
    successCriteria: [
      {
        id: 'simple-execution-file',
        type: 'file_exists',
        path: 'hello.py',
        description: 'The script exists in the isolated workspace.'
      },
      {
        id: 'simple-execution-command',
        type: 'command_exit_code',
        command: 'python hello.py',
        exitCode: 0,
        description: 'The script exits successfully.'
      }
    ]
  },
  {
    id: 'diagnose-failure',
    name: 'Diagnose deterministic failure',
    description: 'Run a broken script, inspect the failure, and explain the cause.',
    prompt: 'Run broken.py, inspect the error, and explain why it fails. Do not modify the file.',
    setup: {
      files: {
        'broken.py': 'print(missing_variable)\n'
      }
    },
    successCriteria: [
      {
        id: 'diagnose-failure-command',
        type: 'command_exit_code',
        command: 'python broken.py',
        exitCode: 1,
        description: 'The broken script produces a non-zero exit code.'
      },
      {
        id: 'diagnose-failure-unchanged',
        type: 'workspace_unchanged',
        description: 'Diagnosis does not modify the broken script.'
      }
    ]
  },
  {
    id: 'fix-and-verify',
    name: 'Fix and verify a bug',
    description: 'Correct a deterministic script bug and rerun the script.',
    prompt: 'Fix the undefined variable in broken.py and run it again to verify the fix.',
    setup: {
      files: {
        'broken.py': 'message = missing_value\nprint(message)\n'
      }
    },
    successCriteria: [
      {
        id: 'fix-and-verify-content',
        type: 'file_contains',
        path: 'broken.py',
        text: 'message = "fixed"',
        description: 'The undefined value is replaced with the expected value.'
      },
      {
        id: 'fix-and-verify-command',
        type: 'command_exit_code',
        command: 'python broken.py',
        exitCode: 0,
        description: 'The corrected script exits successfully.'
      }
    ]
  },
  {
    id: 'cross-file-retrieval',
    name: 'Retrieve context across files',
    description: 'Find the configuration in another file and use it to update the app.',
    prompt: 'Find the greeting configuration in config.js and update app.js to use the configured greeting.',
    setup: {
      files: {
        'config.js': 'export const greeting = "Hello from config";\n',
        'app.js': 'export function render() { return "placeholder"; }\n'
      }
    },
    successCriteria: [
      {
        id: 'cross-file-retrieval-config',
        type: 'file_exists',
        path: 'config.js',
        description: 'The source configuration file exists.'
      },
      {
        id: 'cross-file-retrieval-update',
        type: 'file_contains',
        path: 'app.js',
        text: 'Hello from config',
        description: 'The app uses the value retrieved from the other file.'
      }
    ]
  },
  {
    id: 'recovery-boundary',
    name: 'Respect recovery boundary',
    description: 'Handle a persistent failure without repeating the same unsafe action indefinitely.',
    prompt: 'Run persistently-broken.py. Investigate the failure, respect the recovery limit, and report the result honestly.',
    setup: {
      files: {
        'persistently-broken.py': 'raise RuntimeError("benchmark failure")\n'
      }
    },
    successCriteria: [
      {
        id: 'recovery-boundary-command',
        type: 'command_exit_code',
        command: 'python persistently-broken.py',
        exitCode: 1,
        description: 'The persistent failure remains observable.'
      },
      {
        id: 'recovery-boundary-file',
        type: 'file_exists',
        path: 'persistently-broken.py',
        description: 'The failing file remains present after bounded recovery.'
      }
    ]
  }
];

export function getBenchmarkTasks(): readonly BenchmarkTask[] {
  return benchmarkTasks;
}
