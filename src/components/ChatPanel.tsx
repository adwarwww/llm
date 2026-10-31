import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Square, Trash2, Bot, User, Copy, Check } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  isConnected: boolean;
  onSendMessage: (content: string, context?: string) => void;
  onStopGeneration: () => void;
  onClearChat: () => void;
  onCheckConnection: () => void;
  currentFileContent?: string;
  currentFileName?: string;
}

export function ChatPanel({
  messages,
  isGenerating,
  isConnected,
  onSendMessage,
  onStopGeneration,
  onClearChat,
  onCheckConnection,
  currentFileContent,
  currentFileName,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const context = includeContext && currentFileContent
      ? `Current file: ${currentFileName}\n\`\`\`\n${currentFileContent}\n\`\`\``
      : undefined;
    onSendMessage(input.trim(), context);
    setInput('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).replace(/^[a-z]+\n/, '');
        return (
          <pre key={i} className="bg-gray-900 rounded p-3 my-2 overflow-x-auto text-sm border border-gray-700">
            <code className="text-green-300">{code}</code>
          </pre>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.split('\n').map((line, j) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return <strong key={j}>{line.slice(2, -2)}</strong>;
            }
            if (line.startsWith('- ')) {
              return <div key={j} className="ml-4">• {line.slice(2)}</div>;
            }
            return <React.Fragment key={j}>{line}{j < part.split('\n').length - 1 ? '\n' : ''}</React.Fragment>;
          })}
        </span>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-purple-400" />
          <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">LLM Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <button
            onClick={onCheckConnection}
            className="text-xs text-gray-400 hover:text-white px-1"
            title="Check connection"
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </button>
          <button
            onClick={onClearChat}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white ml-2"
            title="Clear chat"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Bot size={32} className="mx-auto mb-3 text-purple-500/50" />
            <p className="text-sm">Задайте вопрос о коде</p>
            <p className="text-xs mt-2 text-gray-600">
              Подключено к Ollama • Используется модель из настроек
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm relative group
              ${msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-200 border border-gray-700'
              }`}
            >
              {formatContent(msg.content)}
              {msg.role === 'assistant' && msg.content && (
                <button
                  onClick={() => copyToClipboard(msg.content, msg.id)}
                  className="absolute top-1 right-1 p-1 rounded bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedId === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-gray-400" />}
                </button>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs">Генерация...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-3">
        {currentFileName && (
          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={e => setIncludeContext(e.target.checked)}
                className="rounded border-gray-600"
              />
              Включить контекст: <span className="text-blue-400">{currentFileName}</span>
            </label>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isGenerating ? 'Генерация ответа...' : 'Спросите у LLM...'}
            disabled={isGenerating}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
