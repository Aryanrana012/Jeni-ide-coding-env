/**
 * Load environment variables from .env.local into process.env.
 * Must be imported at the very top of the Electron main process.
 * No external dependencies - uses native Node.js fs module only.
 */

import fs from 'fs';
import path from 'path';

/**
 * Parse .env.local file and populate process.env.
 * Handles simple KEY=VALUE format (comments and empty lines ignored).
 * Only loads if .env.local exists - missing file is not an error.
 */
export function loadEnvironmentFile(): void {
  const cwd = process.cwd();
  let envLocalPath = path.join(cwd, '.env.local');

  // If the app is launched from a nested build directory, search upward for the repo root.
  if (!fs.existsSync(envLocalPath)) {
    let currentDir = cwd;
    while (true) {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
      const candidate = path.join(currentDir, '.env.local');
      if (fs.existsSync(candidate)) {
        envLocalPath = candidate;
        break;
      }
    }
  }

  // .env.local is optional during development
  if (!fs.existsSync(envLocalPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();

      // Remove surrounding quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');

      // Only set if not already set by system environment or earlier config
      if (!process.env[key]) {
        process.env[key] = cleanValue;
      }
    }

    console.log('[Jeni] Environment loaded from .env.local');
  } catch (error) {
    console.warn('[Jeni] Error reading .env.local:', error instanceof Error ? error.message : error);
  }
}
