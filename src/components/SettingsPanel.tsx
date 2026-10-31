import React, { useState, useEffect } from 'react';
import { LLMSettings } from '../types';
import { Settings as SettingsIcon, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface SettingsPanelProps {
  settings: LLMSettings;
  onSave: (settings: LLMSettings) => void;
  isConnected: boolean;
  onCheckConnection: () => Promise<boolean>;
  availableModels: string[];
  onLoadModels: () => Promise<string[]>;
}

export function SettingsPanel({
  settings,
  onSave,
  isConnected,
  onCheckConnection,
  availableModels,
  onLoadModels,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<LLMSettings>(settings);
  const [models, setModels] = useState<string[]>(availableModels);
  const [checking, setChecking] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    setModels(availableModels);
  }, [availableModels]);

  const handleSave = () => {
    onSave(localSettings);
    setIsOpen(false);
  };

  const handleCheckConnection = async () => {
    setChecking(true);
    await onCheckConnection();
    setChecking(false);
  };

  const handleLoadModels = async () => {
    setLoadingModels(true);
    const loaded = await onLoadModels();
    setModels(loaded);
    setLoadingModels(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
        title="Settings"
      >
        <SettingsIcon size={18} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Настройки LLM</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg">
            {isConnected ? (
              <Wifi size={16} className="text-green-500" />
            ) : (
              <WifiOff size={16} className="text-red-500" />
            )}
            <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Подключено к Ollama' : 'Нет подключения'}
            </span>
            <button
              onClick={handleCheckConnection}
              disabled={checking}
              className="ml-auto px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300 disabled:opacity-50"
            >
              {checking ? '...' : 'Проверить'}
            </button>
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Endpoint
            </label>
            <input
              type="text"
              value={localSettings.endpoint}
              onChange={e => setLocalSettings({ ...localSettings, endpoint: e.target.value })}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="http://localhost:11434"
            />
            <p className="text-xs text-gray-500 mt-1">
              Адрес Ollama сервера (по умолчанию: http://localhost:11434)
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Модель
            </label>
            <div className="flex gap-2">
              <select
                value={localSettings.model}
                onChange={e => setLocalSettings({ ...localSettings, model: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {models.length > 0 ? (
                  models.map(m => <option key={m} value={m}>{m}</option>)
                ) : (
                  <>
                    <option value="llama3.2">llama3.2</option>
                    <option value="llama3.1">llama3.1</option>
                    <option value="codellama">codellama</option>
                    <option value="deepseek-coder-v2">deepseek-coder-v2</option>
                    <option value="mistral">mistral</option>
                    <option value="qwen2.5-coder">qwen2.5-coder</option>
                    <option value="phi3">phi3</option>
                    <option value="starcoder2">starcoder2</option>
                  </>
                )}
              </select>
              <button
                onClick={handleLoadModels}
                disabled={loadingModels}
                className="px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 disabled:opacity-50"
                title="Load models"
              >
                <RefreshCw size={16} className={loadingModels ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Установите модель: <code className="bg-gray-900 px-1 rounded">ollama pull llama3.2</code>
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Temperature: {localSettings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localSettings.temperature}
              onChange={e => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Точно (0)</span>
              <span>Креативно (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max Tokens: {localSettings.maxTokens}
            </label>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={localSettings.maxTokens}
              onChange={e => setLocalSettings({ ...localSettings, maxTokens: parseInt(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
