export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  handle?: FileSystemHandle;
  content?: string;
  isExpanded?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface LLMSettings {
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isModified: boolean;
  language: string;
}
