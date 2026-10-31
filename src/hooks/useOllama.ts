import { useState, useCallback, useRef } from 'react';
import { ChatMessage, LLMSettings } from '../types';

const DEFAULT_SETTINGS: LLMSettings = {
  endpoint: 'http://localhost:11434',
  model: 'llama3.2',
  temperature: 0.7,
  maxTokens: 4096,
};

export function useOllama() {
  const [settings, setSettings] = useState<LLMSettings>(() => {
    const saved = localStorage.getItem('ollama-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const saveSettings = useCallback((newSettings: LLMSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ollama-settings', JSON.stringify(newSettings));
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${settings.endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        setIsConnected(true);
        return true;
      }
      setIsConnected(false);
      return false;
    } catch {
      setIsConnected(false);
      return false;
    }
  }, [settings.endpoint]);

  const listModels = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(`${settings.endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
      }
      return [];
    } catch {
      return [];
    }
  }, [settings.endpoint]);

  const sendMessage = useCallback(async (
    content: string,
    context?: string
  ) => {
    setIsGenerating(true);
    abortRef.current = new AbortController();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const systemPrompt = context
      ? `You are a helpful coding assistant. The user is working in an IDE. Here is the current context:\n\n${context}\n\nHelp the user with their code questions.`
      : 'You are a helpful coding assistant integrated into an IDE. Help the user with coding tasks, debugging, and explanations.';

    const chatHistory = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    setMessages(prev => [...prev, userMessage]);

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch(`${settings.endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
          ],
          stream: true,
          options: {
            temperature: settings.temperature,
            num_predict: settings.maxTokens,
          },
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullContent += json.message.content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, content: fullContent }
                    : m
                )
              );
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: m.content + '\n\n[Generation stopped]' }
              : m
          )
        );
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: `Error: ${e.message}\n\nMake sure Ollama is running: \`ollama serve\`\nAnd the model is pulled: \`ollama pull ${settings.model}\`` }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [settings, messages]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    settings,
    saveSettings,
    messages,
    isGenerating,
    isConnected,
    checkConnection,
    listModels,
    sendMessage,
    stopGeneration,
    clearChat,
  };
}
