import { type FC, useState, useEffect, type ChangeEvent } from 'react';

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  size: string;
  quality: 'fast' | 'balanced' | 'high';
  url: string;
  isDefault?: boolean;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

// Available models configuration
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'kokoro-82m',
    name: 'Kokoro 82M',
    description: 'Fast, lightweight model with good quality for most use cases',
    size: '~82MB',
    quality: 'fast',
    url: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    isDefault: true
  },
  {
    id: 'kokoro-82m-quantized',
    name: 'Kokoro 82M (Quantized)',
    description: 'Optimized version with smaller size and faster inference',
    size: '~45MB',
    quality: 'fast',
    url: 'onnx-community/Kokoro-82M-v1.0-ONNX'
  },
  {
    id: 'kokoro-82m-fp32',
    name: 'Kokoro 82M (FP32)',
    description: 'Full precision model with highest quality output',
    size: '~82MB',
    quality: 'high',
    url: 'onnx-community/Kokoro-82M-v1.0-ONNX'
  }
];

const ModelSelector: FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  disabled = false 
}) => {
  const [autoSelect, setAutoSelect] = useState(true);
  const [keepLocal, setKeepLocal] = useState(true);
  const [localStorageKey] = useState('twelvereader-model-preferences');

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const preferences = JSON.parse(saved);
        setAutoSelect(preferences.autoSelect ?? true);
        setKeepLocal(preferences.keepLocal ?? true);
        
        // If auto-select is enabled and we have a saved model, use it
        if (preferences.autoSelect && preferences.selectedModel) {
          onModelChange(preferences.selectedModel);
        }
      }
    } catch (error) {
      console.warn('Failed to load model preferences:', error);
    }
  }, [localStorageKey, onModelChange]);

  // Save preferences to localStorage when they change
  const savePreferences = (newAutoSelect: boolean, newKeepLocal: boolean, newSelectedModel: string) => {
    if (keepLocal) {
      try {
        const preferences = {
          autoSelect: newAutoSelect,
          keepLocal: newKeepLocal,
          selectedModel: newSelectedModel
        };
        localStorage.setItem(localStorageKey, JSON.stringify(preferences));
      } catch (error) {
        console.warn('Failed to save model preferences:', error);
      }
    }
  };

  const handleAutoSelectChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoSelect(checked);
    savePreferences(checked, keepLocal, selectedModel);
    
    // If enabling auto-select, use the default model
    if (checked) {
      const defaultModel = AVAILABLE_MODELS.find(m => m.isDefault) || AVAILABLE_MODELS[0];
      onModelChange(defaultModel.id);
    }
  };

  const handleKeepLocalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setKeepLocal(checked);
    savePreferences(autoSelect, checked, selectedModel);
    
    // If disabling keep local, clear localStorage
    if (!checked) {
      localStorage.removeItem(localStorageKey);
    }
  };

  const handleModelChange = (modelId: string) => {
    onModelChange(modelId);
    savePreferences(autoSelect, keepLocal, modelId);
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'fast': return 'text-green-500';
      case 'balanced': return 'text-yellow-500';
      case 'high': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'fast': return '⚡';
      case 'balanced': return '⚖️';
      case 'high': return '🎯';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-selection toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <input
            type="checkbox"
            checked={autoSelect}
            onChange={handleAutoSelectChange}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          🤖 Auto-select best model
        </label>
        <span className="text-xs text-slate-400">
          {autoSelect ? 'Enabled' : 'Manual'}
        </span>
      </div>

      {/* Local storage toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <input
            type="checkbox"
            checked={keepLocal}
            onChange={handleKeepLocalChange}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          💾 Remember selection
        </label>
        <span className="text-xs text-slate-400">
          {keepLocal ? 'Saved' : 'Not saved'}
        </span>
      </div>

      {/* Model selection (disabled when auto-select is on) */}
      <div className={`transition-opacity ${autoSelect ? 'opacity-50' : 'opacity-100'}`}>
        <label className="block mb-3 text-sm font-semibold text-slate-200">
          🎛️ Model Selection ({AVAILABLE_MODELS.length} available)
        </label>
        <div className="space-y-2">
          {AVAILABLE_MODELS.map((model) => (
            <div
              key={model.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedModel === model.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 bg-slate-700 hover:border-slate-500'
              } ${autoSelect || disabled ? 'cursor-not-allowed' : ''}`}
              onClick={() => !autoSelect && !disabled && handleModelChange(model.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-200">{model.name}</span>
                    {model.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded">Default</span>
                    )}
                    <span className={`text-sm ${getQualityColor(model.quality)}`}>
                      {getQualityIcon(model.quality)} {model.quality}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{model.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>📦 {model.size}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <input
                    type="radio"
                    name="model-selection"
                    value={model.id}
                    checked={selectedModel === model.id}
                    onChange={() => !autoSelect && !disabled && handleModelChange(model.id)}
                    disabled={autoSelect || disabled}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info text */}
      <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg">
        <p className="mb-1">
          <strong>Auto-select:</strong> Automatically chooses the best model for your device and use case.
        </p>
        <p className="mb-1">
          <strong>Remember selection:</strong> Saves your model choice between browser sessions.
        </p>
        <p>
          <strong>Model quality:</strong> Fast models are optimized for speed, high-quality models prioritize audio fidelity.
        </p>
      </div>
    </div>
  );
};

export default ModelSelector;