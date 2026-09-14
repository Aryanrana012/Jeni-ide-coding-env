/**
 * File type icon mapping for Jeni IDE.
 * Maps file extensions to icon types and colors, VS Code style.
 */

export interface FileIconConfig {
  icon: string;           // Icon type (lucide-react icon name)
  color: string;          // Tailwind color class
  bgColor?: string;       // Background color for folder icons
}

/**
 * Map file extensions to icon configurations.
 * Uses VS Code-style color scheme.
 */
export const FILE_ICON_MAP: Record<string, FileIconConfig> = {
  // TypeScript & JavaScript
  'ts': { icon: 'FileCode', color: 'text-blue-500' },
  'tsx': { icon: 'FileCode', color: 'text-blue-500' },
  'js': { icon: 'FileCode', color: 'text-yellow-500' },
  'jsx': { icon: 'FileCode', color: 'text-yellow-500' },
  'mjs': { icon: 'FileCode', color: 'text-yellow-500' },
  'cjs': { icon: 'FileCode', color: 'text-yellow-500' },

  // Python
  'py': { icon: 'FileCode', color: 'text-blue-600' },
  'pyc': { icon: 'FileCode', color: 'text-blue-600' },
  'pyx': { icon: 'FileCode', color: 'text-blue-600' },

  // Web - Markup & Styling
  'html': { icon: 'FileCode', color: 'text-red-500' },
  'htm': { icon: 'FileCode', color: 'text-red-500' },
  'css': { icon: 'FileCode', color: 'text-blue-400' },
  'scss': { icon: 'FileCode', color: 'text-pink-500' },
  'sass': { icon: 'FileCode', color: 'text-pink-500' },
  'less': { icon: 'FileCode', color: 'text-blue-600' },

  // JSON & Data
  'json': { icon: 'FileJson', color: 'text-yellow-600' },
  'jsonc': { icon: 'FileJson', color: 'text-yellow-600' },
  'json5': { icon: 'FileJson', color: 'text-yellow-600' },
  'xml': { icon: 'FileCode', color: 'text-orange-600' },
  'yaml': { icon: 'FileCode', color: 'text-purple-500' },
  'yml': { icon: 'FileCode', color: 'text-purple-500' },
  'toml': { icon: 'FileCode', color: 'text-orange-500' },

  // Markdown & Documentation
  'md': { icon: 'FileText', color: 'text-gray-400' },
  'markdown': { icon: 'FileText', color: 'text-gray-400' },
  'mdx': { icon: 'FileText', color: 'text-gray-400' },
  'rst': { icon: 'FileText', color: 'text-gray-400' },

  // Configuration Files
  'env': { icon: 'Settings', color: 'text-gray-400' },
  'envlocal': { icon: 'Settings', color: 'text-gray-400' },
  'config': { icon: 'Settings', color: 'text-gray-400' },
  'conf': { icon: 'Settings', color: 'text-gray-400' },

  // Build & Package
  'package': { icon: 'Package', color: 'text-red-600' },
  'lock': { icon: 'Lock', color: 'text-gray-500' },
  'gradle': { icon: 'FileCode', color: 'text-green-600' },
  'maven': { icon: 'FileCode', color: 'text-red-600' },

  // Shell & Runtime
  'sh': { icon: 'Terminal', color: 'text-gray-400' },
  'bash': { icon: 'Terminal', color: 'text-gray-400' },
  'zsh': { icon: 'Terminal', color: 'text-gray-400' },
  'fish': { icon: 'Terminal', color: 'text-gray-400' },
  'ps1': { icon: 'Terminal', color: 'text-blue-700' },
  'bat': { icon: 'Terminal', color: 'text-gray-400' },
  'cmd': { icon: 'Terminal', color: 'text-gray-400' },

  // Java & JVM
  'java': { icon: 'FileCode', color: 'text-red-600' },
  'class': { icon: 'Package', color: 'text-red-600' },
  'jar': { icon: 'Package', color: 'text-red-600' },
  'kt': { icon: 'FileCode', color: 'text-purple-600' },
  'scala': { icon: 'FileCode', color: 'text-red-600' },

  // C/C++/Rust
  'c': { icon: 'FileCode', color: 'text-blue-600' },
  'h': { icon: 'FileCode', color: 'text-purple-600' },
  'cpp': { icon: 'FileCode', color: 'text-blue-600' },
  'cc': { icon: 'FileCode', color: 'text-blue-600' },
  'cxx': { icon: 'FileCode', color: 'text-blue-600' },
  'hpp': { icon: 'FileCode', color: 'text-purple-600' },
  'rs': { icon: 'FileCode', color: 'text-orange-600' },
  'go': { icon: 'FileCode', color: 'text-blue-400' },

  // Web Assembly & Ruby
  'wasm': { icon: 'Package', color: 'text-purple-500' },
  'rb': { icon: 'FileCode', color: 'text-red-600' },
  'erb': { icon: 'FileCode', color: 'text-red-600' },

  // PHP & Backend
  'php': { icon: 'FileCode', color: 'text-purple-600' },
  'phtml': { icon: 'FileCode', color: 'text-purple-600' },

  // SQL & Database
  'sql': { icon: 'Database', color: 'text-orange-500' },
  'sqlite': { icon: 'Database', color: 'text-blue-600' },

  // Images
  'png': { icon: 'Image', color: 'text-purple-500' },
  'jpg': { icon: 'Image', color: 'text-purple-500' },
  'jpeg': { icon: 'Image', color: 'text-purple-500' },
  'gif': { icon: 'Image', color: 'text-purple-500' },
  'svg': { icon: 'Image', color: 'text-orange-500' },
  'webp': { icon: 'Image', color: 'text-purple-500' },
  'ico': { icon: 'Image', color: 'text-orange-500' },

  // Video & Audio
  'mp4': { icon: 'Film', color: 'text-red-500' },
  'webm': { icon: 'Film', color: 'text-red-500' },
  'mp3': { icon: 'Music', color: 'text-red-500' },
  'wav': { icon: 'Music', color: 'text-red-500' },

  // Archives
  'zip': { icon: 'Archive', color: 'text-yellow-600' },
  'tar': { icon: 'Archive', color: 'text-yellow-600' },
  'gz': { icon: 'Archive', color: 'text-yellow-600' },
  'rar': { icon: 'Archive', color: 'text-red-600' },
  '7z': { icon: 'Archive', color: 'text-yellow-600' },

  // Documents
  'pdf': { icon: 'FileText', color: 'text-red-600' },
  'doc': { icon: 'FileText', color: 'text-blue-600' },
  'docx': { icon: 'FileText', color: 'text-blue-600' },
  'xls': { icon: 'FileText', color: 'text-green-600' },
  'xlsx': { icon: 'FileText', color: 'text-green-600' },
  'ppt': { icon: 'FileText', color: 'text-orange-600' },
  'pptx': { icon: 'FileText', color: 'text-orange-600' },

  // Git
  'gitignore': { icon: 'GitBranch', color: 'text-orange-600' },
  'gitattributes': { icon: 'GitBranch', color: 'text-orange-600' },

  // Docker
  'dockerfile': { icon: 'Package', color: 'text-blue-500' },
  'dockercompose': { icon: 'Package', color: 'text-blue-500' },

  // Vite & Build Config
  'vite': { icon: 'Settings', color: 'text-purple-600' },
  'webpack': { icon: 'Settings', color: 'text-blue-600' },
  'rollup': { icon: 'Settings', color: 'text-red-600' },

  // Default for unknown extensions
  '': { icon: 'File', color: 'text-gray-400' }
};

/**
 * Get file extension from file path.
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.toLowerCase().split('.');
  if (parts.length === 1) return '';

  // Handle special cases like .env.local, package.json, etc.
  const lastPart = parts[parts.length - 1];

  // Check for compound extensions
  if (parts.length >= 2) {
    const compoundKey = `${parts[parts.length - 2]}.${lastPart}`;
    if (compoundKey in FILE_ICON_MAP) {
      return compoundKey;
    }

    // Handle special filenames
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    if (fileName === 'dockerfile') return 'dockerfile';
    if (fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') return 'dockercompose';
    if (fileName === 'makefile') return 'makefile';
    if (fileName === 'package.json') return 'package';
    if (fileName === 'package-lock.json') return 'lock';
    if (fileName === 'yarn.lock') return 'lock';
    if (fileName === 'pnpm-lock.yaml') return 'lock';
    if (fileName.startsWith('.env')) return 'env';
  }

  return lastPart;
}

/**
 * Get icon config for a file path.
 */
export function getFileIconConfig(filePath: string): FileIconConfig {
  const ext = getFileExtension(filePath);
  return FILE_ICON_MAP[ext] || FILE_ICON_MAP[''];
}

/**
 * Get color for a file extension.
 */
export function getFileColor(filePath: string): string {
  return getFileIconConfig(filePath).color;
}

/**
 * Get icon type for a file extension.
 */
export function getFileIconType(filePath: string): string {
  return getFileIconConfig(filePath).icon;
}

/**
 * List of common folder names with special colors.
 */
export const FOLDER_COLOR_MAP: Record<string, string> = {
  'src': 'text-orange-600',
  'components': 'text-blue-500',
  'hooks': 'text-purple-500',
  'utils': 'text-green-500',
  'lib': 'text-cyan-500',
  'services': 'text-yellow-600',
  'types': 'text-blue-400',
  'styles': 'text-pink-500',
  'public': 'text-gray-500',
  'assets': 'text-purple-500',
  'dist': 'text-red-500',
  'build': 'text-red-500',
  'node_modules': 'text-red-600',
  '.git': 'text-orange-600',
  '.vscode': 'text-blue-600',
  'test': 'text-green-600',
  'tests': 'text-green-600',
  '__tests__': 'text-green-600',
  '.github': 'text-gray-700',
  'docs': 'text-blue-500',
  'config': 'text-yellow-500'
};

/**
 * Get color for a folder.
 */
export function getFolderColor(folderName: string): string {
  return FOLDER_COLOR_MAP[folderName.toLowerCase()] || 'text-gray-400';
}
