import {
  discoverFiles,
  retrieveRelevantContext,
  retrieveHybrid,
  searchFilenames,
  searchFiles,
  searchRegex
} from '../../retrieval';
import { ToolContext, ToolResult } from '../../types/tools';

function optionsFromParams(params: Record<string, unknown>) {
  return {
    activeFile: typeof params.activeFile === 'string' ? params.activeFile : undefined,
    extensions: Array.isArray(params.extensions) ? params.extensions.filter((value): value is string => typeof value === 'string') : undefined,
    maxResults: typeof params.maxResults === 'number' ? params.maxResults : undefined
  };
}

function formatMatches(matches: Array<{ file: { relativePath: string }; line?: number; column?: number; snippet?: string; match?: string; kind: string }>): string {
  return matches.map((result) => {
    const location = result.line ? `${result.file.relativePath}:${result.line}:${result.column ?? 1}` : result.file.relativePath;
    return `${result.kind} ${location}${result.match ? ` | ${result.match}` : ''}${result.snippet ? ` | ${result.snippet}` : ''}`;
  }).join('\n');
}

export async function discoverFilesTool(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const files = discoverFiles(context.workspaceRoot, { maxFiles: typeof params.maxFiles === 'number' ? params.maxFiles : undefined });
  return { success: true, output: `Discovered ${files.length} workspace files.\n${files.slice(0, 100).map((file) => file.relativePath).join('\n')}`, data: { files, totalFiles: files.length } };
}

export async function searchFilesTool(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const query = typeof params.query === 'string' ? params.query : '';
  if (!query) return { success: false, output: 'Error: query parameter is required', error: 'Missing query parameter' };
  const result = searchFiles(context.workspaceRoot, query, optionsFromParams(params));
  return { success: true, output: `Found ${result.matches.length} literal matches for "${query}".\n${formatMatches(result.matches)}`, data: result };
}

export async function searchRegexTool(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const pattern = typeof params.pattern === 'string' ? params.pattern : '';
  if (!pattern) return { success: false, output: 'Error: pattern parameter is required', error: 'Missing pattern parameter' };
  const result = searchRegex(context.workspaceRoot, pattern, optionsFromParams(params));
  return { success: true, output: `Found ${result.matches.length} regex matches for /${pattern}/.\n${formatMatches(result.matches)}`, data: result };
}

export async function searchFilenamesTool(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const query = typeof params.query === 'string' ? params.query : '';
  if (!query) return { success: false, output: 'Error: query parameter is required', error: 'Missing query parameter' };
  const result = searchFilenames(context.workspaceRoot, query, optionsFromParams(params));
  return { success: true, output: `Found ${result.matches.length} matching filenames for "${query}".\n${formatMatches(result.matches)}`, data: result };
}

export async function retrieveContextTool(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
  const query = typeof params.query === 'string' ? params.query : '';
  if (!query) return { success: false, output: 'Error: query parameter is required', error: 'Missing query parameter' };
  const activeFile = context.ideContext?.activeFile?.path ?? undefined;

  // Milestone 2.8: use hybrid retrieval (semantic + keyword) when available;
  // falls back to keyword-only automatically if semantic index is not ready.
  const result = await retrieveHybrid(context.workspaceRoot, query, {
    ...optionsFromParams(params),
    activeFile
  });

  const semanticNote = result.semanticAvailable ? ' (hybrid: keyword + semantic)' : ' (keyword only; semantic index building)';
  return {
    success: true,
    output: `Retrieved ${result.matches.length} focused results for "${query}"${semanticNote}.\n${formatMatches(result.matches)}`,
    data: result
  };
}
