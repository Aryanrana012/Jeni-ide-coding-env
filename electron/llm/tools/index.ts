/**
 * Tool registry and orchestrator for Jeni agent.
 * Manages tool definitions and execution.
 */

import { ToolDefinition, ConfiguredTool, ToolResult, ToolContext, ToolCall } from '../../types/tools';
import {
  readFileTool,
  listDirectoryTool,
  searchCodeTool,
  createFileTool,
  writeFileTool,
  editFileTool,
  deleteFileTool
} from './filesystem';
import { runCommandTool } from './terminal';
import { getIDEContextTool } from './ideContext';
import {
  discoverFilesTool,
  retrieveContextTool,
  searchFilenamesTool,
  searchFilesTool,
  searchRegexTool
} from './retrieval';

/**
 * Tool registry containing all available tools.
 */
const TOOL_REGISTRY: Map<string, ConfiguredTool> = new Map();

/**
 * Initialize tool registry with all tools.
 */
export function initializeToolRegistry(): void {
  // Filesystem tools
  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read the contents of a file from the workspace. Returns file content with size information.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file (relative to workspace root)'
            }
          },
          required: ['path']
        }
      }
    },
    executor: readFileTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'list_directory',
        description: 'List contents of a directory. Returns list of files and folders with their types.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory (relative to workspace root)'
            }
          },
          required: ['path']
        }
      }
    },
    executor: listDirectoryTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'search_code',
        description: 'Search for text patterns in code files across the workspace. Returns matching files and line numbers.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for'
            },
            extensions: {
              type: 'array',
              description: 'File extensions to search (e.g., [".ts", ".py"]). If omitted, searches common code files.'
            }
          },
          required: ['query']
        }
      }
    },
    executor: searchCodeTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'discover_files',
        description: 'Discover readable text files in the current workspace, excluding generated, ignored, binary, and oversized files.',
        parameters: {
          type: 'object',
          properties: {
            maxFiles: { type: 'number', description: 'Maximum number of files to return (optional)' }
          },
          required: []
        }
      }
    },
    executor: discoverFilesTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'search_files',
        description: 'Search workspace text files for a literal query. Returns verified relative paths, lines, columns, and snippets.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Literal text to search for' },
            activeFile: { type: 'string', description: 'Optional active workspace-relative file for ranking' },
            extensions: { type: 'array', description: 'Optional file extensions to include' },
            maxResults: { type: 'number', description: 'Optional maximum result count' }
          },
          required: ['query']
        }
      }
    },
    executor: searchFilesTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'search_regex',
        description: 'Search workspace text files with a bounded regular expression. Invalid patterns return no matches.',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Regular expression pattern' },
            flags: { type: 'string', description: 'Optional JavaScript regular expression flags' },
            extensions: { type: 'array', description: 'Optional file extensions to include' },
            maxResults: { type: 'number', description: 'Optional maximum result count' }
          },
          required: ['pattern']
        }
      }
    },
    executor: searchRegexTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'search_filenames',
        description: 'Find workspace files whose relative path or filename contains a query.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Filename or path text to find' },
            maxResults: { type: 'number', description: 'Optional maximum result count' }
          },
          required: ['query']
        }
      }
    },
    executor: searchFilenamesTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'retrieve_relevant_context',
        description: 'Combine verified filename and literal content matches into a focused ranked result set. Uses the active IDE file when available.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Question or lookup text' },
            extensions: { type: 'array', description: 'Optional file extensions to include' },
            maxResults: { type: 'number', description: 'Optional maximum result count' }
          },
          required: ['query']
        }
      }
    },
    executor: retrieveContextTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'create_file',
        description: 'Create a new file with optional initial content. Fails if file already exists.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path for the new file (relative to workspace root)'
            },
            content: {
              type: 'string',
              description: 'Initial file content (optional)'
            }
          },
          required: ['path']
        }
      }
    },
    executor: createFileTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Write or overwrite entire file contents. Creates parent directories if needed.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file (relative to workspace root)'
            },
            content: {
              type: 'string',
              description: 'New file content'
            }
          },
          required: ['path', 'content']
        }
      }
    },
    executor: writeFileTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'edit_file',
        description: 'Replace exact text in a file. IMPORTANT: oldText must occur EXACTLY ONCE in the file. If it occurs 0 or 2+ times, the tool will fail. Always include sufficient context in oldText to ensure unique match.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file (relative to workspace root)'
            },
            oldText: {
              type: 'string',
              description: 'Exact text to replace (must occur exactly once)'
            },
            newText: {
              type: 'string',
              description: 'Replacement text'
            }
          },
          required: ['path', 'oldText', 'newText']
        }
      }
    },
    executor: editFileTool
  });

  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'delete_file',
        description: 'Delete a file or folder. For folders, deletes recursively.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to delete (relative to workspace root)'
            }
          },
          required: ['path']
        }
      }
    },
    executor: deleteFileTool
  });

  // Terminal tool
  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'run_command',
        description: 'Execute a shell command in the workspace. Returns stdout, stderr, and exit code. Commands run in a separate agent terminal (not the interactive user terminal).',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Shell command to execute'
            },
            cwd: {
              type: 'string',
              description: 'Working directory for command (defaults to workspace root)'
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds (default 30000, max 300000)'
            }
          },
          required: ['command']
        }
      }
    },
    executor: runCommandTool
  });

  // IDE Context tool
  registerTool({
    definition: {
      type: 'function',
      function: {
        name: 'get_ide_context',
        description: 'Get the current IDE state including active file, cursor position, open tabs, and diagnostics. Use this to understand the current development environment.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    },
    executor: getIDEContextTool
  });
}

/**
 * Register a tool in the registry.
 */
function registerTool(tool: ConfiguredTool): void {
  TOOL_REGISTRY.set(tool.definition.function.name, tool);
}

/**
 * Get all tool definitions for sending to LLM.
 */
export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(TOOL_REGISTRY.values()).map((tool) => tool.definition);
}

/**
 * Execute a tool call.
 */
export async function executeTool(
  toolCall: ToolCall,
  context: ToolContext
): Promise<ToolResult> {
  const tool = TOOL_REGISTRY.get(toolCall.name);

  if (!tool) {
    return {
      success: false,
      output: `Error: unknown tool '${toolCall.name}'`,
      error: `Tool not found: ${toolCall.name}`
    };
  }

  try {
    return await tool.executor(toolCall.arguments, context);
  } catch (err: any) {
    return {
      success: false,
      output: `Error executing tool: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * Validate tool call against tool definition.
 */
export function validateToolCall(toolCall: ToolCall): { valid: boolean; error?: string } {
  const tool = TOOL_REGISTRY.get(toolCall.name);

  if (!tool) {
    return { valid: false, error: `Tool not found: ${toolCall.name}` };
  }

  const required = tool.definition.function.parameters.required || [];
  for (const param of required) {
    if (!(param in toolCall.arguments)) {
      return { valid: false, error: `Missing required parameter: ${param}` };
    }
  }

  return { valid: true };
}
