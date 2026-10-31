import React, { useState, useCallback, useEffect } from 'react';
import { FileExplorer } from './components/FileExplorer';
import { CodeEditor } from './components/CodeEditor';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useFileSystem } from './hooks/useFileSystem';
import { useOllama } from './hooks/useOllama';
import { FileNode, OpenTab } from './types';
import { PanelLeftClose, PanelLeftOpen, MessageSquare, Code2, Terminal, ChevronRight } from 'lucide-react';

export default function App() {
  const fileSystem = useFileSystem();
  const ollama = useOllama();

  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [bottomPanel, setBottomPanel] = useState<'terminal' | null>(null);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    '🖥️ WebIDE Terminal',
    'Используйте чат с LLM для помощи с кодом.',
    'Убедитесь, что Ollama запущена: ollama serve',
    '',
  ]);

  // Load models on mount
  useEffect(() => {
    ollama.checkConnection().then(connected => {
      if (connected) {
        ollama.listModels();
      }
    });
  }, []);

  const handleFileSelect = useCallback(async (node: FileNode) => {
    if (node.isDirectory) return;

    // Check if already open
    const existing = tabs.find(t => t.path === node.path);
    if (existing) {
      setActiveTab(node.path);
      return;
    }

    // Read file content
    const content = await fileSystem.readFile(node);
    const language = fileSystem.getLanguage(node.name);

    const newTab: OpenTab = {
      path: node.path,
      name: node.name,
      content,
      isModified: false,
      language,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTab(node.path);
  }, [tabs, fileSystem]);

  const handleTabClose = useCallback((path: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.path !== path);
      if (activeTab === path) {
        const idx = prev.findIndex(t => t.path === path);
        const newActive = newTabs[Math.min(idx, newTabs.length - 1)]?.path || null;
        setActiveTab(newActive);
      }
      return newTabs;
    });
  }, [activeTab]);

  const handleContentChange = useCallback((path: string, content: string) => {
    setTabs(prev => prev.map(t =>
      t.path === path ? { ...t, content, isModified: true } : t
    ));
  }, []);

  const handleSave = useCallback(async (path: string) => {
    const tab = tabs.find(t => t.path === path);
    if (!tab) return;

    const success = await fileSystem.writeFile(path, tab.content);
    if (success) {
      setTabs(prev => prev.map(t =>
        t.path === path ? { ...t, isModified: false } : t
      ));
      setTerminalOutput(prev => [...prev, `✓ Saved: ${path}`]);
    } else {
      setTerminalOutput(prev => [...prev, `✗ Failed to save: ${path}`]);
    }
  }, [tabs, fileSystem]);

  const handleRefresh = useCallback(async () => {
    await fileSystem.refresh();
  }, [fileSystem]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    
    const cmd = terminalInput.trim();
    setTerminalOutput(prev => [...prev, `$ ${cmd}`]);
    setTerminalInput('');

    // Simple command handling
    if (cmd === 'clear') {
      setTerminalOutput([]);
    } else if (cmd === 'help') {
      setTerminalOutput(prev => [...prev,
        'Available commands:',
        '  help     - Show this help',
        '  clear    - Clear terminal',
        '  ls       - List files',
        '  pwd      - Print working directory',
        '  models   - List available LLM models',
        '',
      ]);
    } else if (cmd === 'ls') {
      if (fileSystem.rootFolder?.children) {
        const list = fileSystem.rootFolder.children.map(c =>
          c.isDirectory ? `📁 ${c.name}/` : `📄 ${c.name}`
        );
        setTerminalOutput(prev => [...prev, ...list, '']);
      } else {
        setTerminalOutput(prev => [...prev, 'No folder open', '']);
      }
    } else if (cmd === 'pwd') {
      setTerminalOutput(prev => [...prev, fileSystem.rootFolder?.name || '/', '']);
    } else if (cmd === 'models') {
      ollama.listModels().then(models => {
        if (models.length > 0) {
          setTerminalOutput(prev => [...prev, 'Available models:', ...models.map(m => `  • ${m}`), '']);
        } else {
          setTerminalOutput(prev => [...prev, 'No models found. Run: ollama pull llama3.2', '']);
        }
      });
    } else {
      setTerminalOutput(prev => [...prev, `Command not found: ${cmd}. Type 'help' for available commands.`, '']);
    }
  };

  const activeTabData = tabs.find(t => t.path === activeTab);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-950 border-b border-gray-800 select-none">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-blue-400" />
          <span className="font-semibold text-sm text-gray-200">WebIDE</span>
          <span className="text-xs text-gray-500 ml-2">+ Local LLM</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={`p-1.5 rounded transition-colors ${showExplorer ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Toggle Explorer"
          >
            {showExplorer ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <button
            onClick={() => setBottomPanel(bottomPanel === 'terminal' ? null : 'terminal')}
            className={`p-1.5 rounded transition-colors ${bottomPanel === 'terminal' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Toggle Terminal"
          >
            <Terminal size={16} />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-1.5 rounded transition-colors ${showChat ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Toggle LLM Chat"
          >
            <MessageSquare size={16} />
          </button>
          <SettingsPanel
            settings={ollama.settings}
            onSave={ollama.saveSettings}
            isConnected={ollama.isConnected}
            onCheckConnection={ollama.checkConnection}
            availableModels={[]}
            onLoadModels={ollama.listModels}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        {showExplorer && (
          <div className="w-64 min-w-[200px] max-w-[400px] overflow-hidden flex-shrink-0">
            <FileExplorer
              rootFolder={fileSystem.rootFolder}
              isSupported={fileSystem.isSupported}
              onOpenFolder={fileSystem.openFolder}
              onLoadChildren={fileSystem.loadDirectoryChildren}
              onFileSelect={handleFileSelect}
              onCreateFile={fileSystem.createFile}
              onCreateFolder={fileSystem.createFolder}
              onDelete={fileSystem.deleteNode}
              activeFile={activeTab}
              onRefresh={handleRefresh}
            />
          </div>
        )}

        {/* Editor + Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              tabs={tabs}
              activeTab={activeTab}
              onTabSelect={setActiveTab}
              onTabClose={handleTabClose}
              onContentChange={handleContentChange}
              onSave={handleSave}
            />
          </div>

          {/* Bottom Panel - Terminal */}
          {bottomPanel === 'terminal' && (
            <div className="h-48 border-t border-gray-700 flex flex-col bg-gray-950">
              <div className="flex items-center px-3 py-1 border-b border-gray-800 text-xs text-gray-400">
                <Terminal size={12} className="mr-1" />
                Terminal
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
                {terminalOutput.map((line, i) => (
                  <div key={i} className={`${line.startsWith('$') ? 'text-green-400' : line.startsWith('✓') ? 'text-green-400' : line.startsWith('✗') ? 'text-red-400' : 'text-gray-300'}`}>
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
              <form onSubmit={handleTerminalSubmit} className="flex items-center border-t border-gray-800 px-2">
                <span className="text-green-400 text-xs font-mono mr-1">$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white font-mono py-1.5 focus:outline-none"
                  placeholder="Type a command..."
                />
              </form>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 min-w-[280px] max-w-[500px] overflow-hidden flex-shrink-0 border-l border-gray-700">
            <ChatPanel
              messages={ollama.messages}
              isGenerating={ollama.isGenerating}
              isConnected={ollama.isConnected}
              onSendMessage={ollama.sendMessage}
              onStopGeneration={ollama.stopGeneration}
              onClearChat={ollama.clearChat}
              onCheckConnection={ollama.checkConnection}
              currentFileContent={activeTabData?.content}
              currentFileName={activeTabData?.name}
            />
          </div>
        )}
      </div>

      {/* Welcome overlay if no folder */}
      {!fileSystem.rootFolder && fileSystem.isSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 z-40 pointer-events-none">
          <div className="text-center pointer-events-auto">
            <div className="text-6xl mb-6">🚀</div>
            <h1 className="text-2xl font-bold text-white mb-2">WebIDE + Local LLM</h1>
            <p className="text-gray-400 mb-6 max-w-md">
              Полноценная среда разработки с доступом к файлам и локальной LLM.
              Работает на Linux и Windows через браузер.
            </p>
            <button
              onClick={fileSystem.openFolder}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
              📂 Открыть папку проекта
            </button>
            <div className="mt-6 text-xs text-gray-500 space-y-1">
              <p>💡 Требуется Chrome или Edge для доступа к файловой системе</p>
              <p>🤖 Запустите Ollama: <code className="bg-gray-800 px-2 py-0.5 rounded">ollama serve</code></p>
              <p>📦 Установите модель: <code className="bg-gray-800 px-2 py-0.5 rounded">ollama pull llama3.2</code></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
