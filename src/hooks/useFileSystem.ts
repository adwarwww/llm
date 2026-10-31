import { useState, useCallback } from 'react';
import { FileNode } from '../types';

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', html: 'html', htm: 'html', css: 'css',
    json: 'json', md: 'markdown', rs: 'rust', c: 'c', cpp: 'cpp',
    h: 'cpp', java: 'java', rb: 'ruby', go: 'go', php: 'php',
    sh: 'bash', yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql',
    txt: 'plaintext', toml: 'toml', ini: 'ini', cfg: 'ini',
  };
  return map[ext] || 'plaintext';
}

export function useFileSystem() {
  const [rootFolder, setRootFolder] = useState<FileNode | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSupported, setIsSupported] = useState(
    typeof window !== 'undefined' && 'showDirectoryPicker' in window
  );

  const readDirectory = useCallback(async (
    handle: FileSystemDirectoryHandle,
    path: string = ''
  ): Promise<FileNode[]> => {
    const entries: FileNode[] = [];
    for await (const entry of (handle as any).values()) {
      const node: FileNode = {
        name: entry.name,
        path: path ? `${path}/${entry.name}` : entry.name,
        isDirectory: entry.kind === 'directory',
        handle: entry,
        isExpanded: false,
      };
      if (entry.kind === 'directory') {
        node.children = [];
      }
      entries.push(node);
    }
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return entries;
  }, []);

  const openFolder = useCallback(async () => {
    if (!isSupported) return;
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      setDirHandle(handle);
      const children = await readDirectory(handle);
      setRootFolder({
        name: handle.name,
        path: '',
        isDirectory: true,
        children,
        handle,
        isExpanded: true,
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Failed to open folder:', e);
      }
    }
  }, [isSupported, readDirectory]);

  const loadDirectoryChildren = useCallback(async (node: FileNode): Promise<FileNode[]> => {
    if (!node.handle || node.handle.kind !== 'directory') return [];
    const children = await readDirectory(node.handle as FileSystemDirectoryHandle, node.path);
    return children;
  }, [readDirectory]);

  const readFile = useCallback(async (node: FileNode): Promise<string> => {
    if (!node.handle || node.handle.kind !== 'file') return '';
    const file = await (node.handle as FileSystemFileHandle).getFile();
    return await file.text();
  }, []);

  const writeFile = useCallback(async (path: string, content: string): Promise<boolean> => {
    if (!dirHandle) return false;
    try {
      const parts = path.split('/');
      const fileName = parts.pop()!;
      let current = dirHandle;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await current.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Failed to write file:', e);
      return false;
    }
  }, [dirHandle]);

  const createFile = useCallback(async (parentPath: string, fileName: string): Promise<FileNode | null> => {
    if (!dirHandle) return null;
    try {
      let current = dirHandle;
      if (parentPath) {
        const parts = parentPath.split('/');
        for (const part of parts) {
          current = await current.getDirectoryHandle(part, { create: true });
        }
      }
      const fileHandle = await current.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write('');
      await writable.close();
      
      const newPath = parentPath ? `${parentPath}/${fileName}` : fileName;
      return {
        name: fileName,
        path: newPath,
        isDirectory: false,
        handle: fileHandle,
        content: '',
      };
    } catch (e) {
      console.error('Failed to create file:', e);
      return null;
    }
  }, [dirHandle]);

  const createFolder = useCallback(async (parentPath: string, folderName: string): Promise<FileNode | null> => {
    if (!dirHandle) return null;
    try {
      let current = dirHandle;
      if (parentPath) {
        const parts = parentPath.split('/');
        for (const part of parts) {
          current = await current.getDirectoryHandle(part, { create: true });
        }
      }
      const dirH = await current.getDirectoryHandle(folderName, { create: true });
      const newPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      return {
        name: folderName,
        path: newPath,
        isDirectory: true,
        handle: dirH,
        children: [],
        isExpanded: false,
      };
    } catch (e) {
      console.error('Failed to create folder:', e);
      return null;
    }
  }, [dirHandle]);

  const deleteNode = useCallback(async (node: FileNode): Promise<boolean> => {
    if (!dirHandle) return false;
    try {
      const parts = node.path.split('/');
      const name = parts.pop()!;
      let current = dirHandle;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part);
      }
      await current.removeEntry(name, { recursive: true });
      return true;
    } catch (e) {
      console.error('Failed to delete:', e);
      return false;
    }
  }, [dirHandle]);

  const refresh = useCallback(async () => {
    if (!dirHandle) return;
    const children = await readDirectory(dirHandle);
    setRootFolder({
      name: dirHandle.name,
      path: '',
      isDirectory: true,
      children,
      handle: dirHandle,
      isExpanded: true,
    });
  }, [dirHandle, readDirectory]);

  return {
    rootFolder,
    dirHandle,
    isSupported,
    openFolder,
    loadDirectoryChildren,
    readFile,
    writeFile,
    createFile,
    createFolder,
    deleteNode,
    getLanguage,
    refresh,
  };
}
