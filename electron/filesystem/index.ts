import fs from 'fs';
import path from 'path';
import { SemanticIndex } from '../retrieval/semanticIndex';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
  size?: number;
}

export interface FileReadResponse {
  success: boolean;
  content?: string;
  error?: string;
  size?: number;
  isBinary?: boolean;
  isOversized?: boolean;
  mode?: 'normal' | 'reduced' | 'oversized' | 'binary';
  bannerMessage?: string;
}

export interface OperationResponse {
  success: boolean;
  error?: string;
}

// Known binary extensions
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.bmp', '.tiff',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite',
  '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.docx', '.xlsx', '.pptx',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.flv', '.woff', '.woff2', '.ttf', '.eot'
]);

// Ignored folders for lazy directory listing
const IGNORED_FOLDERS = new Set(['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', '.next', 'out']);

/**
 * Validates whether targetPath is within workspaceRoot boundaries.
 */
function resolveWorkspacePath(targetPath: string, workspaceRoot: string): string {
  return path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(workspaceRoot, targetPath);
}

export function isPathInWorkspace(targetPath: string, workspaceRoot: string): boolean {
  if (!workspaceRoot) return false;
  const resolvedTarget = resolveWorkspacePath(targetPath, workspaceRoot);
  const resolvedRoot = path.resolve(workspaceRoot);

  // Exact match or starts with root directory prefix
  if (resolvedTarget === resolvedRoot) return true;
  const relative = path.relative(resolvedRoot, resolvedTarget);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Reads a single directory level lazy-expanded.
 */
export function readDirectory(dirPath: string, workspaceRoot: string): { success: boolean; nodes?: FileNode[]; error?: string } {
  try {
    const resolvedDirPath = resolveWorkspacePath(dirPath, workspaceRoot);
    if (!isPathInWorkspace(resolvedDirPath, workspaceRoot)) {
      return { success: false, error: 'Access denied: Target directory path is outside workspace root.' };
    }

    if (!fs.existsSync(resolvedDirPath)) {
      return { success: false, error: 'Directory does not exist.' };
    }

    const entries = fs.readdirSync(resolvedDirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Skip heavy/hidden folders by default
      if (entry.isDirectory() && IGNORED_FOLDERS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(resolvedDirPath, entry.name);
      const isDir = entry.isDirectory();
      let size: number | undefined;

      if (!isDir) {
        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
        } catch {
          // Ignore unreadable stat
        }
      }

      nodes.push({
        id: fullPath,
        name: entry.name,
        path: fullPath,
        isDirectory: isDir,
        children: isDir ? [] : undefined,
        isExpanded: false,
        size
      });
    }

    // Sort folders first, then files alphabetically
    nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return { success: true, nodes };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to read directory.' };
  }
}

/**
 * Checks if a file is binary using extension allowlist + null-byte sniff.
 */
export function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return true;

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Reads file with size tiering logic.
 * < 5MB: normal
 * 5MB - 25MB: reduced-feature mode
 * > 25MB: oversized error
 * Binary: binary view placeholder
 */
export function readFile(filePath: string, workspaceRoot: string): FileReadResponse {
  try {
    const resolvedFilePath = resolveWorkspacePath(filePath, workspaceRoot);
    if (!isPathInWorkspace(resolvedFilePath, workspaceRoot)) {
      return { success: false, error: 'Access denied: Path is outside workspace boundary.' };
    }

    if (!fs.existsSync(resolvedFilePath)) {
      return { success: false, error: 'File does not exist.' };
    }

    const stat = fs.statSync(resolvedFilePath);
    const size = stat.size;
    const FIVE_MB = 5 * 1024 * 1024;
    const TWENTY_FIVE_MB = 25 * 1024 * 1024;

    if (size > TWENTY_FIVE_MB) {
      return {
        success: true,
        size,
        isOversized: true,
        mode: 'oversized',
        bannerMessage: `File size is ${(size / (1024 * 1024)).toFixed(1)} MB. Files larger than 25 MB cannot be edited inline in Jeni.`
      };
    }

    if (isBinaryFile(resolvedFilePath)) {
      return {
        success: true,
        size,
        isBinary: true,
        mode: 'binary',
        bannerMessage: 'Binary file — inline text rendering disabled.'
      };
    }

    const content = fs.readFileSync(resolvedFilePath, 'utf-8');

    if (size > FIVE_MB) {
      return {
        success: true,
        content,
        size,
        mode: 'reduced',
        bannerMessage: `Large file (${(size / (1024 * 1024)).toFixed(1)} MB) loaded in high-performance mode (syntax highlighting disabled).`
      };
    }

    return {
      success: true,
      content,
      size,
      mode: 'normal'
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to read file.' };
  }
}

/**
 * Saves file content ensuring workspace boundary safety.
 */
export function writeFile(filePath: string, content: string, workspaceRoot: string): OperationResponse {
  try {
    const resolvedFilePath = resolveWorkspacePath(filePath, workspaceRoot);
    if (!isPathInWorkspace(resolvedFilePath, workspaceRoot)) {
      return { success: false, error: 'Access denied: Path is outside workspace boundary.' };
    }

    const parentDir = path.dirname(resolvedFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolvedFilePath, content, 'utf-8');
    SemanticIndex.getInstance().invalidate();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to write file.' };
  }
}

/**
 * Creates new file.
 */
export function createFile(filePath: string, workspaceRoot: string): OperationResponse {
  try {
    const resolvedFilePath = resolveWorkspacePath(filePath, workspaceRoot);
    if (!isPathInWorkspace(resolvedFilePath, workspaceRoot)) {
      return { success: false, error: 'Access denied: Path is outside workspace boundary.' };
    }

    if (fs.existsSync(resolvedFilePath)) {
      return { success: false, error: 'File already exists.' };
    }

    const parentDir = path.dirname(resolvedFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolvedFilePath, '', 'utf-8');
  SemanticIndex.getInstance().invalidate();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create file.' };
  }
}

/**
 * Creates new folder.
 */
export function createFolder(folderPath: string, workspaceRoot: string): OperationResponse {
  try {
    const resolvedFolderPath = resolveWorkspacePath(folderPath, workspaceRoot);
    if (!isPathInWorkspace(resolvedFolderPath, workspaceRoot)) {
      return { success: false, error: 'Access denied: Path is outside workspace boundary.' };
    }

    if (fs.existsSync(resolvedFolderPath)) {
      return { success: false, error: 'Folder already exists.' };
    }

    fs.mkdirSync(resolvedFolderPath, { recursive: true });
  SemanticIndex.getInstance().invalidate();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create folder.' };
  }
}

/**
 * Renames file or folder.
 */
export function renameItem(oldPath: string, newPath: string, workspaceRoot: string): OperationResponse {
  try {
    const resolvedOldPath = resolveWorkspacePath(oldPath, workspaceRoot);
    const resolvedNewPath = resolveWorkspacePath(newPath, workspaceRoot);
    if (!isPathInWorkspace(resolvedOldPath, workspaceRoot) || !isPathInWorkspace(resolvedNewPath, workspaceRoot)) {
      return { success: false, error: 'Access denied: Target operation is outside workspace boundary.' };
    }

    if (!fs.existsSync(resolvedOldPath)) {
      return { success: false, error: 'Item does not exist.' };
    }

    fs.renameSync(resolvedOldPath, resolvedNewPath);
  SemanticIndex.getInstance().invalidate();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to rename item.' };
  }
}

/**
 * Deletes file or folder recursively.
 */
export function deleteItem(itemPath: string, workspaceRoot: string): OperationResponse {
  try {
    const resolvedItemPath = resolveWorkspacePath(itemPath, workspaceRoot);
    if (!isPathInWorkspace(resolvedItemPath, workspaceRoot)) {
      return { success: false, error: 'Access denied: Path is outside workspace boundary.' };
    }

    if (!fs.existsSync(resolvedItemPath)) {
      return { success: false, error: 'Item does not exist.' };
    }

    const stat = fs.statSync(resolvedItemPath);
    if (stat.isDirectory()) {
      fs.rmSync(resolvedItemPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolvedItemPath);
    }
    SemanticIndex.getInstance().invalidate();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete item.' };
  }
}
