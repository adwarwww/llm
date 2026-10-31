import React, { useState, useCallback } from 'react';
import { FileNode } from '../types';
import {
  Folder, FolderOpen, File, FileCode, ChevronRight, ChevronDown,
  Plus, FolderPlus, Trash2, RefreshCw
} from 'lucide-react';

interface FileExplorerProps {
  rootFolder: FileNode | null;
  isSupported: boolean;
  onOpenFolder: () => void;
  onLoadChildren: (node: FileNode) => Promise<FileNode[]>;
  onFileSelect: (node: FileNode) => void;
  onCreateFile: (parentPath: string, name: string) => Promise<FileNode | null>;
  onCreateFolder: (parentPath: string, name: string) => Promise<FileNode | null>;
  onDelete: (node: FileNode) => Promise<boolean>;
  activeFile: string | null;
  onRefresh: () => void;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'rb', 'php'];
  if (codeExts.includes(ext)) return <FileCode size={16} className="text-blue-400" />;
  return <File size={16} className="text-gray-400" />;
}

function FileTreeItem({
  node,
  depth,
  activeFile,
  onFileSelect,
  onLoadChildren,
  onRefresh,
}: {
  node: FileNode;
  depth: number;
  activeFile: string | null;
  onFileSelect: (node: FileNode) => void;
  onLoadChildren: (node: FileNode) => Promise<FileNode[]>;
  onRefresh: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded || false);
  const [children, setChildren] = useState<FileNode[]>(node.children || []);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (node.isDirectory) {
      if (!isExpanded && children.length === 0 && node.handle) {
        setLoading(true);
        const loaded = await onLoadChildren(node);
        setChildren(loaded);
        setLoading(false);
      }
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node);
    }
  }, [node, isExpanded, children.length, onLoadChildren, onFileSelect]);

  const isActive = node.path === activeFile;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-gray-700/50 rounded text-sm group
          ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleToggle}
      >
        {node.isDirectory ? (
          <>
            {loading ? (
              <RefreshCw size={12} className="animate-spin text-gray-500" />
            ) : isExpanded ? (
              <ChevronDown size={12} className="text-gray-500" />
            ) : (
              <ChevronRight size={12} className="text-gray-500" />
            )}
            {isExpanded ? (
              <FolderOpen size={16} className="text-yellow-500" />
            ) : (
              <Folder size={16} className="text-yellow-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(node.name)}
          </>
        )}
        <span className="truncate ml-1">{node.name}</span>
      </div>
      {isExpanded && node.isDirectory && (
        <div>
          {children.map(child => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onLoadChildren={onLoadChildren}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  rootFolder,
  isSupported,
  onOpenFolder,
  onLoadChildren,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDelete,
  activeFile,
  onRefresh,
}: FileExplorerProps) {
  const [creatingFile, setCreatingFile] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ path: string; x: number; y: number } | null>(null);

  const handleCreate = async (isFile: boolean) => {
    if (!newName.trim()) return;
    const parentPath = contextMenu?.path || '';
    if (isFile) {
      await onCreateFile(parentPath, newName.trim());
    } else {
      await onCreateFolder(parentPath, newName.trim());
    }
    setNewName('');
    setCreatingFile(false);
    setCreatingFolder(false);
    setContextMenu(null);
    onRefresh();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Explorer</span>
        <div className="flex gap-1">
          <button
            onClick={() => { setCreatingFile(true); setContextMenu(null); }}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="New File"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => { setCreatingFolder(true); setContextMenu(null); }}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="New Folder"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {!isSupported && (
          <div className="p-3 text-xs text-yellow-400 bg-yellow-900/20 m-2 rounded">
            ⚠️ File System Access API не поддерживается. Используйте Chrome/Edge для полного доступа к файлам.
            <br /><br />
            Вы можете загружать файлы через drag & drop.
          </div>
        )}

        {!rootFolder && isSupported && (
          <div className="p-4 text-center">
            <button
              onClick={onOpenFolder}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              📂 Открыть папку
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Выберите папку проекта
            </p>
          </div>
        )}

        {rootFolder && (
          <>
            <div className="px-2 py-1 text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
              <FolderOpen size={12} className="text-yellow-500" />
              {rootFolder.name}
            </div>

            {(creatingFile || creatingFolder) && (
              <div className="px-2 py-1">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate(creatingFile);
                    if (e.key === 'Escape') {
                      setCreatingFile(false);
                      setCreatingFolder(false);
                      setNewName('');
                    }
                  }}
                  placeholder={creatingFile ? 'filename.ext' : 'folder name'}
                  className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            )}

            {rootFolder.children?.map(child => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={0}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                onLoadChildren={onLoadChildren}
                onRefresh={onRefresh}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
