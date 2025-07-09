import { type FC, useState, useEffect, type ChangeEvent, useCallback } from 'react';
import { modelManager } from '../utils/modelManager';

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  size: string;
  quality: 'fast' | 'balanced' | 'high';
  url: string;
  dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
  device: 'webgpu' | 'wasm' | 'cpu';
  filename: string;
  isDefault?: boolean;
  isDownloaded?: boolean;
  recommended?: boolean;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  onDeviceChange?: (device: 'webgpu' | 'wasm' | 'cpu') => void;
  onDtypeChange?: (dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16') => void;
  modelKeepLocal?: Record<string, boolean>;
  onModelKeepLocalChange?: (modelId: string, keepLocal: boolean) => void;
}

// Available models configuration with accurate sizes and filenames from Hugging Face
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'kokoro-82m-fp32',
    name: 'Kokoro 82M (FP32)',
    description: 'Full precision model - Highest quality, GPU recommended',
    size: '310MB',
    quality: 'high',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'fp32',
    device: 'webgpu',
    filename: 'model.onnx',
    isDefault: true,
    recommended: true
  },
  {
    id: 'kokoro-82m-fp16',
    name: 'Kokoro 82M (FP16)',
    description: 'Half precision - High quality, GPU recommended',
    size: '156MB',
    quality: 'high',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'fp16',
    device: 'webgpu',
    filename: 'model_fp16.onnx',
    recommended: true
  },
  {
    id: 'kokoro-82m-q8',
    name: 'Kokoro 82M (Q8)',
    description: '8-bit quantized - Balanced quality and speed',
    size: '82MB',
    quality: 'balanced',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'q8',
    device: 'wasm',
    filename: 'model_q8f16.onnx',
    recommended: true
  },
  {
    id: 'kokoro-82m-q4',
    name: 'Kokoro 82M (Q4)',
    description: '4-bit quantized - Fastest, works on all devices',
    size: '290MB',
    quality: 'fast',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'q4',
    device: 'wasm',
    filename: 'model_q4.onnx'
  },
  {
    id: 'kokoro-82m-q4f16',
    name: 'Kokoro 82M (Q4F16)',
    description: '4-bit with FP16 fallback - Good balance',
    size: '147MB',
    quality: 'fast',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'q4f16',
    device: 'wasm',
    filename: 'model_q4f16.onnx'
  },
];

// Helper function to get model information
export const getModelInfo = (modelId: string): ModelConfig | undefined => {
  return AVAILABLE_MODELS.find(model => model.id === modelId);
};

// Helper function to get all available models
export const getAllModels = (): ModelConfig[] => {
  return AVAILABLE_MODELS;
};

// Helper function to get recommended models for a device
export const getRecommendedModels = (device: 'webgpu' | 'wasm' | 'cpu'): ModelConfig[] => {
  return AVAILABLE_MODELS.filter(model => 
    model.recommended && 
    (device === 'webgpu' ? model.device === 'webgpu' : model.device !== 'webgpu')
  );
};

const ModelSelector: FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  disabled = false,
  onDeviceChange,
  onDtypeChange,
  modelKeepLocal = {},
  onModelKeepLocalChange
}: ModelSelectorProps) => {
  const [autoSelect, setAutoSelect] = useState(true);
  const [preferredDevice, setPreferredDevice] = useState<'webgpu' | 'wasm' | 'cpu'>('webgpu');
  const [gpuAvailable, setGpuAvailable] = useState(false);
  const [downloadedModels, setDownloadedModels] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check GPU availability on mount
  useEffect(() => {
    const checkGPU = async () => {
      if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          setGpuAvailable(!!adapter);
        } catch (e) {
          console.warn('GPU detection failed:', e);
          setGpuAvailable(false);
        }
      } else {
        setGpuAvailable(false);
      }
    };
    
    checkGPU();
  }, []);

  // Check for downloaded models using model manager
  useEffect(() => {
    const checkDownloadedModels = () => {
      const downloadedModelIds = modelManager.getDownloadedModels();
      setDownloadedModels(new Set(downloadedModelIds));
    };
    
    checkDownloadedModels();
  }, []);

  // Load preferences from model manager on mount
  useEffect(() => {
    const preferences = modelManager.getPreferences();
    setAutoSelect(preferences.autoSelect);
    setPreferredDevice(preferences.preferredDevice as 'webgpu' | 'wasm' | 'cpu');
    
    // If auto-select is enabled and we have a saved model, use it
    if (preferences.autoSelect && preferences.selectedModel) {
      onModelChange(preferences.selectedModel);
    }
  }, [onModelChange]);

  // Save preferences using model manager
  const savePreferences = useCallback((newAutoSelect: boolean, newSelectedModel: string, newPreferredDevice: string) => {
    modelManager.savePreferences({
      autoSelect: newAutoSelect,
      selectedModel: newSelectedModel,
      preferredDevice: newPreferredDevice
    });
  }, []);

  const handleAutoSelectChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoSelect(checked);
    savePreferences(checked, selectedModel, preferredDevice);
    
    // If enabling auto-select, use the best model for the device
    if (checked) {
      const bestModel = getBestModelForDevice(preferredDevice);
      onModelChange(bestModel.id);
    }
  }, [selectedModel, preferredDevice, savePreferences, onModelChange]);

  const handleDeviceChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const device = e.target.value as 'webgpu' | 'wasm' | 'cpu';
    setPreferredDevice(device);
    savePreferences(autoSelect, selectedModel, device);
    onDeviceChange?.(device);
    
    // If auto-select is enabled, update to best model for new device
    if (autoSelect) {
      const bestModel = getBestModelForDevice(device);
      onModelChange(bestModel.id);
    }
  }, [autoSelect, selectedModel, savePreferences, onDeviceChange, onModelChange]);

  const handleModelChange = useCallback((modelId: string) => {
    onModelChange(modelId);
    savePreferences(autoSelect, modelId, preferredDevice);
    
    // Update device and dtype based on selected model
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (model) {
      onDeviceChange?.(model.device);
      onDtypeChange?.(model.dtype);
    }
  }, [autoSelect, preferredDevice, savePreferences, onModelChange, onDeviceChange, onDtypeChange]);

  const getBestModelForDevice = useCallback((device: string): ModelConfig => {
    switch (device) {
      case 'webgpu':
        return AVAILABLE_MODELS.find(m => m.dtype === 'fp32') || AVAILABLE_MODELS[0];
      case 'wasm':
        return AVAILABLE_MODELS.find(m => m.dtype === 'q8') || AVAILABLE_MODELS[2];
      case 'cpu':
        return AVAILABLE_MODELS.find(m => m.dtype === 'q4') || AVAILABLE_MODELS[3];
      default:
        return AVAILABLE_MODELS[0];
    }
  }, []);

  const getQualityColor = useCallback((quality: string) => {
    switch (quality) {
      case 'fast': return 'text-green-500';
      case 'balanced': return 'text-yellow-500';
      case 'high': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  }, []);

  const getQualityIcon = useCallback((quality: string) => {
    switch (quality) {
      case 'fast': return '⚡';
      case 'balanced': return '⚖️';
      case 'high': return '🎯';
      default: return '❓';
    }
  }, []);

  const getDeviceIcon = useCallback((device: string) => {
    switch (device) {
      case 'webgpu': return '⚡';
      case 'wasm': return '🖥️';
      case 'cpu': return '💻';
      default: return '❓';
    }
  }, []);

  const getRecommendedModelsForDevice = useCallback((device: 'webgpu' | 'wasm' | 'cpu') => {
    return AVAILABLE_MODELS.filter(model => 
      model.recommended && 
      (device === 'webgpu' ? model.device === 'webgpu' : model.device !== 'webgpu')
    );
  }, []);

  const currentRecommendedModels = getRecommendedModelsForDevice(preferredDevice);

  return (
    <div className="space-y-4">
      {/* Smart Selection Mode */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
          🤖 Smart Selection
        </h4>
        <div
          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
            autoSelect
              ? 'border-purple-500 bg-purple-500/10 shadow-lg'
              : 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          onClick={() => !disabled && handleAutoSelectChange({ target: { checked: !autoSelect } } as ChangeEvent<HTMLInputElement>)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-200">🤖 Smart Model Selection</span>
                {autoSelect && (
                  <span className="px-2 py-0.5 text-xs bg-purple-500 text-white rounded-full">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Automatically chooses the best model for your device and performance needs
              </p>
              {autoSelect && (
                <div className="flex items-center gap-2 text-xs text-purple-300">
                  <span>🎯 Current: {getModelInfo(selectedModel)?.name}</span>
                  <span>•</span>
                  <span>{getDeviceIcon(preferredDevice)} {preferredDevice.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="ml-3">
              <input
                type="radio"
                name="model-selection"
                checked={autoSelect}
                onChange={() => !disabled && handleAutoSelectChange({ target: { checked: !autoSelect } } as ChangeEvent<HTMLInputElement>)}
                disabled={disabled}
                className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 focus:ring-purple-500 focus:ring-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Device Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-200">
          🔧 Processing Device
        </label>
        <select
          value={preferredDevice}
          onChange={handleDeviceChange}
          disabled={disabled || autoSelect}
          className={`w-full p-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm transition-colors ${
            disabled || autoSelect ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
          }`}
        >
          <option value="webgpu" disabled={!gpuAvailable}>
            {getDeviceIcon('webgpu')} GPU (WebGPU) {!gpuAvailable && '(Not Available)'}
          </option>
          <option value="wasm">
            {getDeviceIcon('wasm')} CPU (WASM)
          </option>
          <option value="cpu">
            {getDeviceIcon('cpu')} CPU (Native)
          </option>
        </select>
        {!gpuAvailable && (
          <p className="text-xs text-orange-400 flex items-center gap-1">
            ⚠️ GPU acceleration not available on this device
          </p>
        )}
      </div>

      {/* Manual Selection Mode */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
          🎛️ Manual Selection
        </h4>
        <div
          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
            !autoSelect
              ? 'border-blue-500 bg-blue-500/10 shadow-lg'
              : 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          onClick={() => !disabled && handleAutoSelectChange({ target: { checked: false } } as ChangeEvent<HTMLInputElement>)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-200">🎛️ Manual Model Selection</span>
                {!autoSelect && (
                  <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">Active</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Choose a specific model for more control over quality and performance
              </p>
              {!autoSelect && (
                <div className="flex items-center gap-2 text-xs text-blue-300">
                  <span>� Selected: {getModelInfo(selectedModel)?.name}</span>
                  <span>•</span>
                  <span>📦 {getModelInfo(selectedModel)?.size}</span>
                </div>
              )}
            </div>
            <div className="ml-3">
              <input
                type="radio"
                name="model-selection"
                checked={!autoSelect}
                onChange={() => !disabled && handleAutoSelectChange({ target: { checked: false } } as ChangeEvent<HTMLInputElement>)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Manual Model Selection (disabled when auto-select is on) */}
      <div className={`transition-all duration-300 ${autoSelect ? 'opacity-50 max-h-0 overflow-hidden' : 'opacity-100 max-h-screen'}`}>
        {/* Recommended Models */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
            ⭐ Recommended Models ({currentRecommendedModels.length})
          </h4>
          <div className="space-y-2">
            {currentRecommendedModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={selectedModel === model.id}
                isDownloaded={downloadedModels.has(model.id)}
                isKeepLocal={modelKeepLocal[model.id] ?? false}
                onSelect={() => handleModelChange(model.id)}
                onKeepLocalChange={(keepLocal) => onModelKeepLocalChange?.(model.id, keepLocal)}
                disabled={disabled}
                getQualityColor={getQualityColor}
                getQualityIcon={getQualityIcon}
                getDeviceIcon={getDeviceIcon}
              />
            ))}
          </div>
        </div>

        {/* All Models (Advanced) */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1"
          >
            {showAdvanced ? '▼' : '▶'} Show All Models ({AVAILABLE_MODELS.length})
          </button>
          
          {showAdvanced && (
            <div className="space-y-2 mt-2">
              {AVAILABLE_MODELS.filter(model => !model.recommended).map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedModel === model.id}
                  isDownloaded={downloadedModels.has(model.id)}
                  isKeepLocal={modelKeepLocal[model.id] ?? false}
                  onSelect={() => handleModelChange(model.id)}
                  onKeepLocalChange={(keepLocal) => onModelKeepLocalChange?.(model.id, keepLocal)}
                  disabled={disabled}
                  getQualityColor={getQualityColor}
                  getQualityIcon={getQualityIcon}
                  getDeviceIcon={getDeviceIcon}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <div className="space-y-1">
          <p className="flex items-center gap-1">
            <span className="text-purple-400">🤖</span>
            <strong>Smart Selection:</strong> Automatically chooses the best model for your device
          </p>
          <p className="flex items-center gap-1">
            <span className="text-blue-400">🎛️</span>
            <strong>Manual Selection:</strong> Choose specific models for custom control
          </p>
          <p className="flex items-center gap-1">
            <span className="text-green-400">💾</span>
            <strong>Keep Downloaded:</strong> Only saves models you explicitly choose to keep
          </p>
          <p className="flex items-center gap-1">
            <span className="text-yellow-400">📊</span>
            <strong>Quality Levels:</strong> High (FP32/FP16) → Balanced (Q8) → Fast (Q4)
          </p>
        </div>
      </div>
    </div>
  );
};

// Separate ModelCard component for better organization
interface ModelCardProps {
  model: ModelConfig;
  isSelected: boolean;
  isDownloaded: boolean;
  isKeepLocal: boolean;
  onSelect: () => void;
  onKeepLocalChange: (keepLocal: boolean) => void;
  disabled: boolean;
  getQualityColor: (quality: string) => string;
  getQualityIcon: (quality: string) => string;
  getDeviceIcon: (device: string) => string;
}

const ModelCard: FC<ModelCardProps> = ({
  model,
  isSelected,
  isDownloaded,
  isKeepLocal,
  onSelect,
  onKeepLocalChange,
  disabled,
  getQualityColor,
  getQualityIcon,
  getDeviceIcon
}) => {
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10 shadow-md'
          : 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      onClick={() => !disabled && onSelect()}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-slate-200">{model.name}</span>
            {model.isDefault && (
              <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">Default</span>
            )}
            {model.recommended && (
              <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">⭐</span>
            )}
            {isDownloaded && (
              <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">Downloaded</span>
            )}
            <span className={`text-sm ${getQualityColor(model.quality)}`}>
              {getQualityIcon(model.quality)} {model.quality}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{model.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
            <span>📦 {model.size}</span>
            <span>🎯 {model.dtype.toUpperCase()}</span>
            <span>{getDeviceIcon(model.device)} {model.device}</span>
          </div>
          
          {/* Keep Local Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isKeepLocal}
                onChange={(e) => onKeepLocalChange(e.target.checked)}
                disabled={disabled}
                className="w-3 h-3 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-1"
                onClick={(e) => e.stopPropagation()}
              />
              💾 Keep downloaded
            </label>
            <span className="text-xs text-slate-500">
              {isKeepLocal ? 'Saved' : 'Not saved'}
            </span>
          </div>
        </div>
        <div className="ml-3">
          <input
            type="radio"
            name="model-selection"
            value={model.id}
            checked={isSelected}
            onChange={() => !disabled && onSelect()}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2"
          />
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;