import fs from 'fs';
import path from 'path';
import { RetrievedFile, RetrievalLimits, RetrievalMatch, RetrievalSummary, HybridOptions, HybridRetrievalSummary } from './types';
import { SemanticIndex } from './semanticIndex';

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', '.next', 'out']);
const DEFAULT_TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.java', '.cpp', '.c', '.h', '.rs',
  '.go', '.rb', '.php', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.md', '.txt'
]);

export const DEFAULT_RETRIEVAL_LIMITS: RetrievalLimits = {
  maxFiles: 2000,
  maxFileBytes: 1024 * 1024,
  maxResults: 100,
  maxSnippetLength: 160
};

export const PLANNER_RETRIEVAL_MAX_RESULTS = 30;

function normalizeLimits(limits?: Partial<RetrievalLimits>): RetrievalLimits {
  return { ...DEFAULT_RETRIEVAL_LIMITS, ...limits };
}

function resolveRoot(workspaceRoot: string): string {
  return fs.realpathSync(path.resolve(workspaceRoot));
}

function resolveWithinWorkspace(targetPath: string, workspaceRoot: string): string | null {
  const root = resolveRoot(workspaceRoot);
  const resolved = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(root, targetPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;

  if (!fs.existsSync(resolved)) return resolved;
  const canonical = fs.realpathSync(resolved);
  const canonicalRelative = path.relative(root, canonical);
  return canonicalRelative.startsWith('..') || path.isAbsolute(canonicalRelative) ? null : canonical;
}

function languageForExtension(extension: string): string | null {
  const languages: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescriptreact', '.js': 'javascript', '.jsx': 'javascriptreact',
    '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.h': 'c', '.rs': 'rust',
    '.go': 'go', '.rb': 'ruby', '.php': 'php', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
    '.xml': 'xml', '.html': 'html', '.css': 'css', '.scss': 'scss', '.md': 'markdown'
  };
  return languages[extension] ?? null;
}

function toRetrievedFile(filePath: string, workspaceRoot: string, size: number): RetrievedFile {
  const relativePath = path.relative(resolveRoot(workspaceRoot), filePath).split(path.sep).join('/');
  const extension = path.extname(filePath).toLowerCase();
  return {
    path: filePath,
    relativePath,
    name: path.basename(filePath),
    extension,
    language: languageForExtension(extension),
    size,
    type: 'file'
  };
}

function isBinaryBuffer(buffer: Buffer): boolean {
  for (const byte of buffer) {
    if (byte === 0) return true;
  }
  return false;
}

function compareMatches(left: RetrievalMatch, right: RetrievalMatch): number {
  return right.score - left.score || left.file.relativePath.localeCompare(right.file.relativePath) || (left.line ?? 0) - (right.line ?? 0);
}

function isActiveFile(file: RetrievedFile, activeFile: string | undefined, workspaceRoot: string): boolean {
  if (!activeFile) return false;
  const normalized = activeFile.split(path.sep).join('/');
  const relativeActive = path.isAbsolute(activeFile)
    ? path.relative(resolveRoot(workspaceRoot), path.resolve(activeFile)).split(path.sep).join('/')
    : normalized.replace(/^\.\//, '');
  return file.relativePath === relativeActive;
}

function isSafeRegexPattern(pattern: string): boolean {
  if (pattern.length > 200) return false;
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) return false;
  return !/[+*][^)]{0,40}[+*]/.test(pattern);
}

export function discoverFiles(workspaceRoot: string, limits?: Partial<RetrievalLimits>): RetrievedFile[] {
  const normalizedLimits = normalizeLimits(limits);
  const root = resolveRoot(workspaceRoot);
  const files: RetrievedFile[] = [];
  const pending = [root];

  while (pending.length > 0 && files.length < normalizedLimits.maxFiles) {
    const directory = pending.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (files.length >= normalizedLimits.maxFiles) break;
      if (entry.name.startsWith('.') && entry.isDirectory()) continue;
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > normalizedLimits.maxFileBytes) continue;
        if (!DEFAULT_TEXT_EXTENSIONS.has(path.extname(fullPath).toLowerCase())) continue;
        const sample = fs.readFileSync(fullPath).subarray(0, 8192);
        if (isBinaryBuffer(sample)) continue;
        files.push(toRetrievedFile(fullPath, root, stat.size));
      } catch {
        // Ignore files that disappear or cannot be read during traversal.
      }
    }
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function searchFiles(
  workspaceRoot: string,
  query: string,
  options: Partial<RetrievalLimits> & { activeFile?: string; extensions?: string[]; caseSensitive?: boolean } = {}
): RetrievalSummary {
  const limits = normalizeLimits(options);
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { query, matches: [], scannedFiles: 0, truncated: false };
  const extensionSet = options.extensions ? new Set(options.extensions.map((extension) => extension.toLowerCase())) : null;
  const needle = options.caseSensitive ? normalizedQuery : normalizedQuery.toLowerCase();
  const matches: RetrievalMatch[] = [];
  let scannedFiles = 0;

  for (const file of discoverFiles(workspaceRoot, limits)) {
    if (extensionSet && !extensionSet.has(file.extension)) continue;
    scannedFiles++;
    let content: string;
    try {
      content = fs.readFileSync(file.path, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const haystack = options.caseSensitive ? line : line.toLowerCase();
      const column = haystack.indexOf(needle);
      if (column < 0) return;
      const activeBoost = isActiveFile(file, options.activeFile, workspaceRoot) ? 10 : 0;
      matches.push({
        kind: 'content',
        file,
        line: index + 1,
        column: column + 1,
        snippet: line.trim().slice(0, limits.maxSnippetLength),
        match: line.slice(column, column + normalizedQuery.length),
        score: 100 - index / 1000 + activeBoost
      });
    });
  }

  const truncated = matches.length > limits.maxResults;
  return { query, matches: matches.sort(compareMatches).slice(0, limits.maxResults), scannedFiles, truncated };
}

export function searchRegex(
  workspaceRoot: string,
  pattern: string,
  options: Partial<RetrievalLimits> & { activeFile?: string; extensions?: string[]; flags?: string } = {}
): RetrievalSummary {
  if (!isSafeRegexPattern(pattern)) {
    return { query: pattern, matches: [], scannedFiles: 0, truncated: false };
  }

  let expression: RegExp;
  try {
    expression = new RegExp(pattern, options.flags ?? '');
  } catch {
    return { query: pattern, matches: [], scannedFiles: 0, truncated: false };
  }
  const limits = normalizeLimits(options);
  const extensionSet = options.extensions ? new Set(options.extensions.map((extension) => extension.toLowerCase())) : null;
  const matches: RetrievalMatch[] = [];
  let scannedFiles = 0;

  for (const file of discoverFiles(workspaceRoot, limits)) {
    if (extensionSet && !extensionSet.has(file.extension)) continue;
    scannedFiles++;
    let content: string;
    try {
      content = fs.readFileSync(file.path, 'utf8');
    } catch {
      continue;
    }
    content.split(/\r?\n/).forEach((line, index) => {
      expression.lastIndex = 0;
      const match = expression.exec(line);
      if (!match) return;
      const activeBoost = isActiveFile(file, options.activeFile, workspaceRoot) ? 10 : 0;
      matches.push({
        kind: 'content',
        file,
        line: index + 1,
        column: match.index + 1,
        snippet: line.trim().slice(0, limits.maxSnippetLength),
        match: match[0],
        score: 100 - index / 1000 + activeBoost
      });
    });
  }

  const truncated = matches.length > limits.maxResults;
  return { query: pattern, matches: matches.sort(compareMatches).slice(0, limits.maxResults), scannedFiles, truncated };
}

export function searchFilenames(
  workspaceRoot: string,
  query: string,
  options: Partial<RetrievalLimits> & { activeFile?: string } = {}
): RetrievalSummary {
  const limits = normalizeLimits(options);
  const needle = query.trim().toLowerCase();
  if (!needle) return { query, matches: [], scannedFiles: 0, truncated: false };
  const matches = discoverFiles(workspaceRoot, limits)
    .filter((file) => file.relativePath.toLowerCase().includes(needle) || file.name.toLowerCase().includes(needle))
    .map((file) => ({
      kind: 'filename' as const,
      file,
      score: isActiveFile(file, options.activeFile, workspaceRoot) ? 110 : 90
    }))
    .sort(compareMatches);
  return { query, matches: matches.slice(0, limits.maxResults), scannedFiles: discoverFiles(workspaceRoot, limits).length, truncated: matches.length > limits.maxResults };
}

export function retrieveRelevantContext(
  workspaceRoot: string,
  query: string,
  options: Partial<RetrievalLimits> & { activeFile?: string; extensions?: string[] } = {}
): RetrievalSummary {
  const filenameResults = searchFilenames(workspaceRoot, query, options);
  const contentResults = searchFiles(workspaceRoot, query, options);
  const matches = [...filenameResults.matches, ...contentResults.matches].sort(compareMatches);
  const limits = normalizeLimits(options);
  return {
    query,
    matches: matches.slice(0, limits.maxResults),
    scannedFiles: Math.max(filenameResults.scannedFiles, contentResults.scannedFiles),
    truncated: matches.length > limits.maxResults || filenameResults.truncated || contentResults.truncated
  };
}

/**
 * Hybrid retrieval — Milestone 2.8
 *
 * Merges keyword (existing) and semantic (embedding-based) results.
 * Falls back to keyword-only if the semantic index is unavailable.
 *
 * Scoring: hybridScore = keywordWeight * normKeyword + semanticWeight * cosine
 */
export async function retrieveHybrid(
  workspaceRoot: string,
  query: string,
  options: HybridOptions = {}
): Promise<HybridRetrievalSummary> {
  const maxResults = options.maxResults ?? 30;
  const keywordWeight = options.keywordWeight ?? 0.4;
  const semanticWeight = options.semanticWeight ?? 0.6;

  // 1. Keyword pass (synchronous, always available)
  const keywordResult = retrieveRelevantContext(workspaceRoot, query, {
    maxResults: 100,
    activeFile: options.activeFile,
    extensions: options.extensions
  });

  // Normalize keyword scores to [0, 1]
  const maxKeywordScore = keywordResult.matches.length > 0
    ? Math.max(...keywordResult.matches.map((m) => m.score))
    : 1;

  // Map: `relativePath:line` → weighted score accumulator
  const scoreMap = new Map<string, { match: RetrievalMatch; combined: number }>();

  for (const match of keywordResult.matches) {
    const key = `${match.file.relativePath}:${match.line ?? 0}`;
    const normalizedScore = maxKeywordScore > 0 ? match.score / maxKeywordScore : 0;
    scoreMap.set(key, {
      match,
      combined: keywordWeight * normalizedScore
    });
  }

  // 2. Semantic pass (async, may be unavailable)
  let semanticAvailable = false;
  try {
    const index = SemanticIndex.getInstance();
    index.setWorkspaceRoot(workspaceRoot);

    if (!index.isBuilt()) {
      await index.build(workspaceRoot, { extensions: options.extensions });
    }

    const semanticMatches = await index.query(query, 50);
    if (semanticMatches.length > 0) {
      semanticAvailable = true;
      for (const sem of semanticMatches) {
        const key = `${sem.file.relativePath}:${sem.startLine}`;
        const existing = scoreMap.get(key);

        if (existing) {
          // Boost existing keyword match with semantic score
          existing.combined += semanticWeight * sem.score;
        } else {
          // New semantic-only result — create a synthetic RetrievalMatch
          const syntheticMatch: RetrievalMatch = {
            kind: 'content',
            file: sem.file,
            line: sem.startLine,
            snippet: sem.snippet,
            score: semanticWeight * sem.score
          };
          scoreMap.set(key, { match: syntheticMatch, combined: semanticWeight * sem.score });
        }
      }
    }
  } catch (err) {
    // Semantic index unavailable — keyword-only result is still valid
    console.warn('[Jeni Hybrid] Semantic pass failed:', err);
  }

  // 3. Build final ranked list
  const entries = Array.from(scoreMap.values());
  entries.sort((a, b) => b.combined - a.combined);

  const ranked = entries.slice(0, maxResults).map(({ match, combined }) => ({
    ...match,
    score: combined
  }));

  return {
    query,
    matches: ranked,
    scannedFiles: keywordResult.scannedFiles,
    truncated: entries.length > maxResults || keywordResult.truncated,
    semanticAvailable
  };
}

export * from './types';
