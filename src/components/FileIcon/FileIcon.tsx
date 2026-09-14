/**
 * FileIcon component for displaying file type icons.
 * Renders VS Code-style colored icons for files and folders.
 */

import React, { useMemo } from 'react';
import {
  File,
  FileCode,
  FileJson,
  FileText,
  Settings,
  Package,
  Lock,
  Terminal,
  Database,
  Image,
  Film,
  Music,
  Archive,
  Folder,
  FolderOpen,
  GitBranch,
  LucideIcon
} from 'lucide-react';
import { getFileExtension, getFileIconType, getFileColor, getFolderColor, FILE_ICON_MAP } from '../../utils/fileIcons';
import clsx from 'clsx';

interface FileIconProps {
  filePath: string;
  isFolder?: boolean;
  isOpen?: boolean;  // For folder icons, shows open state
  size?: 'sm' | 'md' | 'lg';  // Icon size
  className?: string;
}

/**
 * Map icon names to Lucide components.
 */
const ICON_COMPONENTS: Record<string, LucideIcon> = {
  'File': File,
  'FileCode': FileCode,
  'FileJson': FileJson,
  'FileText': FileText,
  'Settings': Settings,
  'Package': Package,
  'Lock': Lock,
  'Terminal': Terminal,
  'Database': Database,
  'Image': Image,
  'Film': Film,
  'Music': Music,
  'Archive': Archive,
  'GitBranch': GitBranch
};

/**
 * Get icon size in pixels.
 */
function getSizePixels(size: 'sm' | 'md' | 'lg'): number {
  switch (size) {
    case 'sm': return 14;
    case 'lg': return 20;
    case 'md':
    default:
      return 16;
  }
}

/**
 * FileIcon component.
 * Displays appropriate icon and color for file or folder.
 */
export const FileIcon: React.FC<FileIconProps> = ({
  filePath,
  isFolder = false,
  isOpen = false,
  size = 'md',
  className = ''
}) => {
  const sizePixels = getSizePixels(size);

  const { IconComponent, color } = useMemo(() => {
    if (isFolder) {
      const folderColor = getFolderColor(filePath);
      const FolderIcon = isOpen ? FolderOpen : Folder;
      return { IconComponent: FolderIcon, color: folderColor };
    }

    const iconType = getFileIconType(filePath);
    const IconComponent = ICON_COMPONENTS[iconType] || File;
    const fileColor = getFileColor(filePath);
    return { IconComponent, color: fileColor };
  }, [filePath, isFolder, isOpen]);

  return (
    <IconComponent
      size={sizePixels}
      className={clsx(color, 'flex-shrink-0', className)}
    />
  );
};

/**
 * FileIconBadge - displays file icon with text (for tabs/quick open).
 */
interface FileIconBadgeProps {
  filePath: string;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showExtension?: boolean;  // Show file extension as text label
}

export const FileIconBadge: React.FC<FileIconBadgeProps> = ({
  filePath,
  isFolder = false,
  isOpen = false,
  size = 'sm',
  showExtension = false
}) => {
  const fileName = filePath.split('/').pop() || filePath;
  const ext = getFileExtension(filePath);

  return (
    <div className="flex items-center gap-1.5">
      <FileIcon
        filePath={filePath}
        isFolder={isFolder}
        isOpen={isOpen}
        size={size}
      />
      {showExtension && ext && (
        <span className="text-[10px] text-gray-500 font-semibold">
          {ext.toUpperCase()}
        </span>
      )}
    </div>
  );
};

/**
 * Inline file icon - minimal version for use in text/lists.
 */
interface InlineFileIconProps {
  filePath: string;
  isFolder?: boolean;
  isOpen?: boolean;
}

export const InlineFileIcon: React.FC<InlineFileIconProps> = ({
  filePath,
  isFolder = false,
  isOpen = false
}) => {
  return (
    <FileIcon
      filePath={filePath}
      isFolder={isFolder}
      isOpen={isOpen}
      size="sm"
    />
  );
};
