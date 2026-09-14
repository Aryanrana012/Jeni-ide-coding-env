/**
 * Filesystem tools for Jeni agent.
 * Implements: read_file, list_directory, search_code, create_file, write_file, edit_file, delete_file
 * Reuses Phase 1 filesystem infrastructure from electron/filesystem/index.ts
 */

import fs from 'fs';
import path from 'path';
import {
  readFile as phase1ReadFile,
  readDirectory as phase1ReadDirectory,
  createFile as phase1CreateFile,
  writeFile as phase1WriteFile,
  deleteItem as phase1DeleteItem,
  isPathInWorkspace,
  FileNode
} from '../../filesystem';
import { ToolResult, ToolContext } from '../../types/tools';
import { searchFiles } from '../../retrieval';

/**
 * Read file contents.
 * Reuses Phase 1 readFile with size tiering.
 */
export async function readFileTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const filePath = params.path as string;
  if (!filePath) {
    return {
      success: false,
      output: 'Error: path parameter is required',
      error: 'Missing path parameter'
    };
  }

  const result = phase1ReadFile(filePath, context.workspaceRoot);
  if (!result.success) {
    return {
      success: false,
      output: `Error reading file: ${result.error}`,
      error: result.error
    };
  }

  return {
    success: true,
    output: `Read ${filePath} (${result.size} bytes, mode: ${result.mode})`,
    data: {
      path: filePath,
      content: result.content,
      size: result.size,
      mode: result.mode,
      isBinary: result.isBinary,
      isOversized: result.isOversized
    }
  };
}

/**
 * List directory contents.
 * Reuses Phase 1 readDirectory with lazy expansion.
 */
export async function listDirectoryTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const dirPath = params.path as string;
  if (!dirPath) {
    return {
      success: false,
      output: 'Error: path parameter is required',
      error: 'Missing path parameter'
    };
  }

  const result = phase1ReadDirectory(dirPath, context.workspaceRoot);
  if (!result.success) {
    return {
      success: false,
      output: `Error listing directory: ${result.error}`,
      error: result.error
    };
  }

  const itemList = result.nodes
    ?.map((node: FileNode) => `${node.isDirectory ? '[DIR]' : '[FILE]'} ${node.name}`)
    .join('\n') || '';

  return {
    success: true,
    output: `Listed ${dirPath}\n${itemList}`,
    data: {
      path: dirPath,
      items: result.nodes?.map((node: FileNode) => ({
        name: node.name,
        path: node.path,
        isDirectory: node.isDirectory,
        size: node.size
      }))
    }
  };
}

/**
 * Search for text patterns in files (workspace-wide).
 * Scans all text files in workspace for matches.
 */
export async function searchCodeTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const query = params.query as string;
  const extensions = (params.extensions as string[]) || [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.rs',
    '.go',
    '.rb',
    '.php',
    '.json',
    '.yaml',
    '.yml',
    '.xml',
    '.html',
    '.css',
    '.scss',
    '.md'
  ];

  if (!query || query.length === 0) {
    return {
      success: false,
      output: 'Error: query parameter is required',
      error: 'Missing query parameter'
    };
  }

  try {
    const result = searchFiles(context.workspaceRoot, query, {
      extensions,
      maxResults: 50,
      maxFiles: 2000
    });
    const matchSummary = result.matches
      .slice(0, 20)
      .map((match) => `${match.file.relativePath}:${match.line} | ${match.snippet}`)
      .join('\n');

    return {
      success: true,
      output: `Found ${result.matches.length} matches for "${query}"${result.truncated ? ' (showing first 20)' : ''}\n${matchSummary}`,
      data: {
        query,
        totalMatches: result.matches.length,
        matches: result.matches.map((match) => ({
          file: match.file.relativePath,
          line: match.line,
          column: match.column,
          preview: match.snippet,
          match: match.match
        }))
      }
    };
  } catch (err: any) {
    return {
      success: false,
      output: `Error searching code: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * Create a new file with optional content.
 * Reuses Phase 1 createFile.
 */
export async function createFileTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const filePath = params.path as string;
  const content = (params.content as string) || '';

  if (!filePath) {
    return {
      success: false,
      output: 'Error: path parameter is required',
      error: 'Missing path parameter'
    };
  }

  // First create empty file
  const createResult = phase1CreateFile(filePath, context.workspaceRoot);
  if (!createResult.success) {
    return {
      success: false,
      output: `Error creating file: ${createResult.error}`,
      error: createResult.error
    };
  }

  // Then write content if provided
  if (content) {
    const writeResult = phase1WriteFile(filePath, content, context.workspaceRoot);
    if (!writeResult.success) {
      return {
        success: false,
        output: `File created but failed to write content: ${writeResult.error}`,
        error: writeResult.error
      };
    }
  }

  return {
    success: true,
    output: `Created file ${filePath}${content ? ` with ${content.length} bytes of content` : ''}`,
    data: {
      path: filePath,
      contentLength: content.length
    }
  };
}

/**
 * Write/overwrite file contents.
 * Reuses Phase 1 writeFile.
 */
export async function writeFileTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const filePath = params.path as string;
  const content = params.content as string;

  if (!filePath || content === undefined) {
    return {
      success: false,
      output: 'Error: path and content parameters are required',
      error: 'Missing required parameters'
    };
  }

  const result = phase1WriteFile(filePath, content, context.workspaceRoot);
  if (!result.success) {
    return {
      success: false,
      output: `Error writing file: ${result.error}`,
      error: result.error
    };
  }

  return {
    success: true,
    output: `Wrote ${content.length} bytes to ${filePath}`,
    data: {
      path: filePath,
      bytesWritten: content.length
    }
  };
}

/**
 * Edit file by replacing exact text match.
 * MUST fail if oldText occurs != 1 time (no ambiguous replacements).
 */
export async function editFileTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const filePath = params.path as string;
  const oldText = params.oldText as string;
  const newText = params.newText as string;

  if (!filePath || oldText === undefined || newText === undefined) {
    return {
      success: false,
      output: 'Error: path, oldText, and newText parameters are required',
      error: 'Missing required parameters'
    };
  }

  if (!isPathInWorkspace(filePath, context.workspaceRoot)) {
    return {
      success: false,
      output: 'Error: path is outside workspace boundary',
      error: 'Access denied'
    };
  }

  const resolvedFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(context.workspaceRoot, filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    return {
      success: false,
      output: `Error: file does not exist: ${filePath}`,
      error: 'File not found'
    };
  }

  try {
    const content = fs.readFileSync(resolvedFilePath, 'utf-8');
    const occurrenceCount = content.split(oldText).length - 1;

    if (occurrenceCount === 0) {
      return {
        success: false,
        output: `Error: pattern not found in ${filePath}`,
        error: 'Pattern not found'
      };
    }

    if (occurrenceCount > 1) {
      return {
        success: false,
        output: `Error: pattern is ambiguous (found ${occurrenceCount} occurrences in ${filePath}). Provide more context to disambiguate.`,
        error: `Ambiguous pattern (${occurrenceCount} matches)`
      };
    }

    // Safe to replace (exactly 1 match)
    const newContent = content.replace(oldText, newText);
    fs.writeFileSync(resolvedFilePath, newContent, 'utf-8');

    return {
      success: true,
      output: `Replaced pattern in ${filePath}`,
      data: {
        path: resolvedFilePath,
        occurrencesReplaced: 1,
        oldTextLength: oldText.length,
        newTextLength: newText.length
      }
    };
  } catch (err: any) {
    return {
      success: false,
      output: `Error editing file: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * Delete file or folder.
 * Reuses Phase 1 deleteItem.
 */
export async function deleteFileTool(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const filePath = params.path as string;

  if (!filePath) {
    return {
      success: false,
      output: 'Error: path parameter is required',
      error: 'Missing path parameter'
    };
  }

  const result = phase1DeleteItem(filePath, context.workspaceRoot);
  if (!result.success) {
    return {
      success: false,
      output: `Error deleting item: ${result.error}`,
      error: result.error
    };
  }

  return {
    success: true,
    output: `Deleted ${filePath}`,
    data: { path: filePath }
  };
}
