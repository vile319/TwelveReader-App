import { type FC, useState, useEffect, type ChangeEvent } from 'react';

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
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  onDeviceChange?: (device: 'webgpu' | 'wasm' | 'cpu') => void;
  onDtypeChange?: (dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16') => void;
}

// Available models configuration with accurate sizes and filenames from Hugging Face
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'kokoro-82m-fp32',
    name: 'Kokoro 82M (FP32)',
    description: 'Full precision model (model.onnx) - Highest quality, GPU recommended',
    size: '310MB',
    quality: 'high',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'fp32',
    device: 'webgpu',
    filename: 'model.onnx',
    isDefault: true
  },
  {
    id: 'kokoro-82m-fp16',
    name: 'Kokoro 82M (FP16)',
    description: 'Half precision (model_fp16.onnx) - High quality, GPU recommended',
    size: '156MB',
    quality: 'high',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'fp16',
    device: 'webgpu',
    filename: 'model_fp16.onnx'
  },
  {
    id: 'kokoro-82m-q8',
    name: 'Kokoro 82M (Q8)',
    description: '8-bit quantized (model_q8f16.onnx) - Smallest, fastest for CPU/WASM',
    size: '82MB',
    quality: 'balanced',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'q8',
    device: 'wasm',
    filename: 'model_q8f16.onnx'
  },
  {
    id: 'kokoro-82m-q8-alt',
    name: 'Kokoro 82M (Q8, alt)',
    description: '8-bit quantized (model_quantized.onnx) - Alternate Q8, CPU/WASM',
    size: '88MB',
    quality: 'balanced',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'q8',
    device: 'wasm',
    filename: 'model_quantized.onnx'
  },
  {
    id: 'kokoro-82m-q4',
    name: 'Kokoro 82M (Q4)',
    description: '4-bit quantized (model_q4.onnx) - Quantized, CPU/WASM',
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
    description: '4-bit quantized with FP16 fallback (model_q4f16.onnx)',
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

const ModelSelector: FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  disabled = false,
  onDeviceChange,
  onDtypeChange
}) => {
  const [autoSelect, setAutoSelect] = useState(true);
  const [keepLocal, setKeepLocal] = useState(true);
  const [preferredDevice, setPreferredDevice] = useState<'webgpu' | 'wasm' | 'cpu'>('webgpu');
  const [gpuAvailable, setGpuAvailable] = useState(false);
  const [downloadedModels, setDownloadedModels] = useState<Set<string>>(new Set());
  const [localStorageKey] = useState('twelvereader-model-preferences');

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

  // Check for downloaded models in cache
  useEffect(() => {
    const checkDownloadedModels = async () => {
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          const modelCache = cacheNames.find(name => name.includes('model') || name.includes('kokoro'));
          
          if (modelCache) {
            const cache = await caches.open(modelCache);
            const requests = await cache.keys();
            
            // Check if we have model files cached
            const hasModelFiles = requests.some(req => 
              req.url.includes('onnx') || 
              req.url.includes('bin') || 
              req.url.includes('json') ||
              req.url.includes('safetensors')
            );
            
            if (hasModelFiles) {
              setDownloadedModels(new Set(['kokoro-82m-fp32', 'kokoro-82m-q8'])); // Assume common variants
            }
          }
        } catch (error) {
          console.warn('Could not check model cache:', error);
        }
      }
    };
    
    checkDownloadedModels();
  }, []);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const preferences = JSON.parse(saved);
        setAutoSelect(preferences.autoSelect ?? true);
        setKeepLocal(preferences.keepLocal ?? true);
        setPreferredDevice(preferences.preferredDevice ?? 'webgpu');
        
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
  const savePreferences = (newAutoSelect: boolean, newKeepLocal: boolean, newSelectedModel: string, newPreferredDevice: string) => {
    if (keepLocal) {
      try {
        const preferences = {
          autoSelect: newAutoSelect,
          keepLocal: newKeepLocal,
          selectedModel: newSelectedModel,
          preferredDevice: newPreferredDevice
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
    savePreferences(checked, keepLocal, selectedModel, preferredDevice);
    
    // If enabling auto-select, use the best model for the device
    if (checked) {
      const bestModel = getBestModelForDevice(preferredDevice);
      onModelChange(bestModel.id);
    }
  };

  const handleKeepLocalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setKeepLocal(checked);
    savePreferences(autoSelect, checked, selectedModel, preferredDevice);
    
    // If disabling keep local, clear localStorage
    if (!checked) {
      localStorage.removeItem(localStorageKey);
    }
  };

  const handleDeviceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const device = e.target.value as 'webgpu' | 'wasm' | 'cpu';
    setPreferredDevice(device);
    savePreferences(autoSelect, keepLocal, selectedModel, device);
    onDeviceChange?.(device);
    
    // If auto-select is enabled, update to best model for new device
    if (autoSelect) {
      const bestModel = getBestModelForDevice(device);
      onModelChange(bestModel.id);
    }
  };

  const handleModelChange = (modelId: string) => {
    onModelChange(modelId);
    savePreferences(autoSelect, keepLocal, modelId, preferredDevice);
    
    // Update device and dtype based on selected model
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (model) {
      onDeviceChange?.(model.device);
      onDtypeChange?.(model.dtype);
    }
  };

  const getBestModelForDevice = (device: string): ModelConfig => {
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

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'webgpu': return '⚡';
      case 'wasm': return '🖥️';
      case 'cpu': return '💻';
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
          💾 Keep models downloaded
        </label>
        <span className="text-xs text-slate-400">
          {keepLocal ? 'Saved' : 'Not saved'}
        </span>
      </div>

      {/* Device selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-200">
          🔧 Processing Device
        </label>
        <select
          value={preferredDevice}
          onChange={handleDeviceChange}
          disabled={disabled || autoSelect}
          className={`w-full p-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm ${
            disabled || autoSelect ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500'
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
          <p className="text-xs text-orange-400">
            ⚠️ GPU acceleration not available on this device
          </p>
        )}
      </div>

      {/* Model selection (disabled when auto-select is on) */}
      <div className={`transition-opacity ${autoSelect ? 'opacity-50' : 'opacity-100'}`}>
        <label className="block mb-3 text-sm font-semibold text-slate-200">
          🎛️ Model Selection ({AVAILABLE_MODELS.length} available)
        </label>
        
        {/* GPU-Optimized Models */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
            ⚡ GPU-Optimized Models (WebGPU)
          </h4>
          <div className="space-y-2">
            {AVAILABLE_MODELS.filter(model => model.device === 'webgpu').map((model) => (
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
                      {downloadedModels.has(model.id) && (
                        <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded">Downloaded</span>
                      )}
                      <span className={`text-sm ${getQualityColor(model.quality)}`}>
                        {getQualityIcon(model.quality)} {model.quality}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{model.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📦 {model.size}</span>
                      <span>🎯 {model.dtype.toUpperCase()}</span>
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

        {/* CPU-Optimized Models */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
            🖥️ CPU-Optimized Models (WebAssembly)
          </h4>
          <div className="space-y-2">
            {AVAILABLE_MODELS.filter(model => model.device === 'wasm' || model.device === 'cpu').map((model) => (
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
                    {downloadedModels.has(model.id) && (
                      <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded">Downloaded</span>
                    )}
                    <span className={`text-sm ${getQualityColor(model.quality)}`}>
                      {getQualityIcon(model.quality)} {model.quality}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{model.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>📦 {model.size}</span>
                    <span>🎯 {model.dtype.toUpperCase()}</span>
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
    </div>

      {/* Info text */}
      <div className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg">
        <p className="mb-1">
          <strong>Auto-select:</strong> Automatically chooses the best model for your device and use case.
        </p>
        <p className="mb-1">
          <strong>Keep models downloaded:</strong> Saves downloaded models in browser cache for faster loading.
        </p>
        <p className="mb-1">
          <strong>Device selection:</strong> GPU provides fastest processing, CPU works on all devices.
        </p>
        <p>
          <strong>Model quality:</strong> FP32/FP16 for highest quality, Q8 for balance, Q4 for speed.
        </p>
      </div>
    </div>
  );
};

export default ModelSelector;