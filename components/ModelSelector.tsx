import React, { type FC, useState, useEffect, type ChangeEvent, useCallback } from 'react';
import { modelManager } from '../utils/modelManager';
import { useModelManager } from '../hooks/useModelManager';
import { detectGpuCapabilities } from '../utils/gpuCapabilities';

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  size: string;
  quality: 'fast' | 'balanced' | 'high';
  url: string;
  dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
  device: 'webgpu' | 'wasm' | 'cpu' | 'serverless';
  filename: string;
  isDefault?: boolean;
  isDownloaded?: boolean;
  recommended?: boolean;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  preferredDevice?: 'webgpu' | 'wasm' | 'cpu' | 'serverless';
  disabled?: boolean;
  onDeviceChange?: (device: 'webgpu' | 'wasm' | 'cpu' | 'serverless') => void;
  onDtypeChange?: (dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16') => void;
  modelKeepLocal?: Record<string, boolean>;
  onModelKeepLocalChange?: (modelId: string, keepLocal: boolean) => void;
}

// Available models configuration with accurate sizes and filenames from Hugging Face
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'kokoro-82m-fp32',
    name: 'Voice Engine (FP32)',
    description: 'Full precision – highest quality (runs best with GPU or Cloud)',
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
    name: 'Voice Engine (FP16)',
    description: 'Half precision – high quality (GPU-optimized, falls back to CPU if needed)',
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
    name: 'Voice Engine (Q8)',
    description: '8-bit quantised – balanced quality and speed',
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
    name: 'Voice Engine (Q4)',
    description: '4-bit quantised – fastest, works on all devices',
    size: '290MB',
    quality: 'fast',
    url: 'onnx-community/Kokoro-82M-ONNX',
    dtype: 'q4',
    device: 'wasm',
    filename: 'model_q4.onnx'
  },
  {
    id: 'kokoro-82m-q4f16',
    name: 'Voice Engine (Q4F16)',
    description: '4-bit with FP16 fallback – good balance',
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
export const getRecommendedModels = (device: 'webgpu' | 'wasm' | 'cpu' | 'serverless'): ModelConfig[] => {
  return AVAILABLE_MODELS.filter(model =>
    model.recommended &&
    (device === 'webgpu' ? model.device === 'webgpu' : model.device !== 'webgpu')
  );
};

const ModelSelector: FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  preferredDevice: preferredDeviceProp,
  disabled = false,
  onDeviceChange,
  onDtypeChange,
  modelKeepLocal = {},
  onModelKeepLocalChange
}: ModelSelectorProps) => {
  const [preferredDevice, setPreferredDevice] = useState<'webgpu' | 'wasm' | 'cpu' | 'serverless'>(
    () => {
      const pref = modelManager.getPreferences().preferredDevice;
      return pref === 'auto' ? 'serverless' : (pref as 'webgpu' | 'wasm' | 'cpu' | 'serverless');
    }
  );
  const effectiveDevice = preferredDeviceProp ?? preferredDevice;

  useEffect(() => {
    if (preferredDeviceProp !== undefined) {
      setPreferredDevice(preferredDeviceProp);
    }
  }, [preferredDeviceProp]);
  const [gpuAvailable, setGpuAvailable] = useState(false);
  const [gpuCheckComplete, setGpuCheckComplete] = useState(false);
  const { downloadedModels: downloadedModelIds } = useModelManager();
  const downloadedModels = new Set(downloadedModelIds);

  // Check GPU availability on mount
  useEffect(() => {
    const checkGPU = async () => {
      console.log('🔍 [ModelSelector] Checking GPU availability via shared helper...');
      const caps = await detectGpuCapabilities();

      if (caps.hasWebGPU) {
        console.log('🔍 [ModelSelector] WebGPU adapter detected.', {
          isFallback: caps.isFallbackAdapter,
          maxStorage: caps.maxStorageBufferBindingSize
        });
      } else {
        console.log(`❌ [ModelSelector] WebGPU not usable. Reason: ${caps.reason}`);
      }

      setGpuAvailable(caps.hasWebGPU);
      setGpuCheckComplete(true);
    };

    checkGPU();
  }, []);

  // Load preferences from model manager on mount
  useEffect(() => {
    const preferences = modelManager.getPreferences();
    setPreferredDevice(preferences.preferredDevice as 'webgpu' | 'wasm' | 'cpu' | 'serverless');

    // Use the saved model if exists
    if (preferences.selectedModel) {
      onModelChange(preferences.selectedModel);
    }
  }, [onModelChange]);

  // Save preferences using model manager
  const savePreferences = useCallback(
    (
      newSelectedModel: string,
      newPreferredDevice: 'webgpu' | 'wasm' | 'cpu' | 'serverless'
    ) => {
      modelManager.savePreferences({
        selectedModel: newSelectedModel,
        preferredDevice: newPreferredDevice
      });
    },
    []
  );

  const getBestModelForDevice = useCallback((device: string): ModelConfig => {
    switch (device) {
      case 'webgpu':
        return AVAILABLE_MODELS.find(m => m.dtype === 'fp32') || AVAILABLE_MODELS[0];
      case 'wasm':
        return AVAILABLE_MODELS.find(m => m.dtype === 'q8') || AVAILABLE_MODELS[2];
      case 'cpu':
        return AVAILABLE_MODELS.find(m => m.dtype === 'q8') || AVAILABLE_MODELS[2];
      case 'serverless':
        return AVAILABLE_MODELS.find(m => m.dtype === 'fp32') || AVAILABLE_MODELS[0];
      default:
        return AVAILABLE_MODELS[0];
    }
  }, []);

  const handleDeviceChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const device = e.target.value as 'webgpu' | 'wasm' | 'cpu' | 'serverless';
      setPreferredDevice(device);

      const bestModel = getBestModelForDevice(device);
      onModelChange(bestModel.id);
      onDtypeChange?.(bestModel.dtype);

      savePreferences(bestModel.id, device);
      onDeviceChange?.(device);
    },
    [getBestModelForDevice, onDeviceChange, onDtypeChange, onModelChange, savePreferences]
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      onModelChange(modelId);

      const model = AVAILABLE_MODELS.find(m => m.id === modelId);
      if (model) {
        onDtypeChange?.(model.dtype);
      }

      // Persist the chosen model, but keep the device preference
      // controlled solely by the Processing Mode dropdown.
      savePreferences(modelId, effectiveDevice);
    },
    [onDtypeChange, onModelChange, effectiveDevice, savePreferences]
  );

  const getQualityBadge = useCallback((quality: string) => {
    switch (quality) {
      case 'fast': return { label: 'fast', cls: 'text-green-400 bg-green-400/10 border-green-400/30' };
      case 'balanced': return { label: 'balanced', cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
      case 'high': return { label: 'high', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/30' };
      default: return { label: quality, cls: 'text-slate-400' };
    }
  }, []);

  // After the useEffect for loading preferences, add this new useEffect for device fallback
  useEffect(() => {
    if (gpuCheckComplete && !gpuAvailable && effectiveDevice === 'webgpu') {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const newDevice: 'serverless' | 'wasm' = isOnline ? 'serverless' : 'wasm';

      setPreferredDevice(newDevice);

      const bestModel = getBestModelForDevice(newDevice);
      onModelChange(bestModel.id);
      onDtypeChange?.(bestModel.dtype);

      savePreferences(bestModel.id, newDevice);
      onDeviceChange?.(newDevice);
    }
  }, [
    gpuCheckComplete,
    gpuAvailable,
    effectiveDevice,
    getBestModelForDevice,
    onDeviceChange,
    onDtypeChange,
    onModelChange,
    savePreferences
  ]);

  return (
    <div className="space-y-4">
      {/* Device Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-200">
          Processing mode
        </label>
        <select
          value={effectiveDevice === 'webgpu' && !gpuAvailable ? 'serverless' : effectiveDevice}
          onChange={handleDeviceChange}
          disabled={disabled}
          className={`w-full p-2 bg-[#111827] border border-slate-700 rounded-sm text-slate-200 text-sm font-semibold transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
        >
          <option value="serverless">
            Cloud (recommended — best quality)
          </option>
          {gpuAvailable ? (
            <option value="webgpu">Local GPU — WebGPU</option>
          ) : null}
          <option value="wasm">
            Local CPU — offline (may not work on iPhone)
          </option>
          <option value="cpu">
            Local CPU (native) — offline (may not work on iPhone)
          </option>
        </select>
        {(effectiveDevice === 'wasm' || effectiveDevice === 'cpu' || effectiveDevice === 'webgpu') && (
          <p className="text-xs text-amber-400 flex items-center gap-1">
            Local mode works offline but may crash on iPhone. Use cloud for best experience.
          </p>
        )}
      </div>

      {/* All Models — flat list, always visible */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
          Models ({AVAILABLE_MODELS.length})
        </h4>
        <div className="space-y-2">
          {AVAILABLE_MODELS.map((model) => {
            const isSelected = selectedModel === model.id;
            const isDownloaded = downloadedModels.has(model.id);
            const { label: qLabel, cls: qCls } = getQualityBadge(model.quality);
            return (
              <div
                key={model.id}
                className={`p-3 rounded-sm border cursor-pointer transition-all duration-200 ${isSelected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-[#111827] hover:border-slate-500'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                onClick={() => !disabled && handleModelChange(model.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="font-medium text-slate-200 text-sm">{model.name}</span>
                      {model.isDefault && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded-sm">Default</span>
                      )}
                      {model.recommended && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-sm">⭐ rec</span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider border rounded-sm ${qCls}`}>{qLabel}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1.5 leading-snug">{model.description}</p>
                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">{model.size}</span>
                      {/* Download status — always shown */}
                      {isDownloaded ? (
                        <span className="text-emerald-400 font-medium">✓ Cached</span>
                      ) : (
                        <span className="text-slate-600">○ Not cached</span>
                      )}
                    </div>
                    {/* Keep local toggle */}
                    <label className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400 cursor-pointer" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={modelKeepLocal[model.id] ?? false}
                        onChange={(e) => onModelKeepLocalChange?.(model.id, e.target.checked)}
                        disabled={disabled}
                        className="w-3 h-3 text-blue-600 bg-slate-700 border-slate-600 rounded"
                      />
                      Keep cached between refreshes
                    </label>
                  </div>
                  {/* Right: radio */}
                  <input
                    type="radio"
                    name="model-selection"
                    value={model.id}
                    checked={isSelected}
                    onChange={() => !disabled && handleModelChange(model.id)}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 shrink-0"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;