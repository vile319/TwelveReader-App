import React, { type FC, useState, useEffect, type ChangeEvent, useCallback } from 'react';
import { modelManager } from '../utils/modelManager';
import { detectGpuCapabilities } from '../utils/gpuCapabilities';

void React;

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  size: string;
  quality: 'fast' | 'balanced' | 'high';
  url: string;
  dtype: 'fp32' | 'q8';
  device: 'webgpu' | 'wasm' | 'cpu' | 'serverless';
  filename: string;
  isDefault?: boolean;
  isDownloaded?: boolean;
  recommended?: boolean;
}

interface ModelSelectorProps {
  preferredDevice?: 'webgpu' | 'wasm' | 'cpu' | 'serverless';
  disabled?: boolean;
  onDeviceChange?: (device: 'webgpu' | 'wasm' | 'cpu' | 'serverless') => void;
}

// Available models configuration with accurate sizes and filenames from Hugging Face
const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'kokoro-82m-fp32',
    name: 'Voice Engine (FP32)',
    description: 'Full precision – highest quality (runs best with GPU or Cloud)',
    size: '310MB',
    quality: 'high',
    url: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    dtype: 'fp32',
    device: 'webgpu',
    filename: 'model.onnx',
    isDefault: true,
    recommended: true
  },
  {
    id: 'kokoro-82m-q8',
    name: 'Voice Engine (Q8)',
    description: '8-bit quantised – balanced quality and speed',
    size: '82MB',
    quality: 'balanced',
    url: 'onnx-community/Kokoro-82M-v1.0-ONNX',
    dtype: 'q8',
    device: 'wasm',
    filename: 'model_q8f16.onnx',
    recommended: true
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
  preferredDevice: preferredDeviceProp,
  disabled = false,
  onDeviceChange
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
  const [gpuUnavailableReason, setGpuUnavailableReason] = useState<string | null>(null);

  // Check GPU availability on mount
  useEffect(() => {
    const checkGPU = async () => {
      const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
      if (isFirefox) {
        setGpuAvailable(false);
        setGpuCheckComplete(true);
        setGpuUnavailableReason('Local GPU is not supported in Firefox.');
        return;
      }
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

      setGpuAvailable(caps.canUseLocalGpu);
      setGpuUnavailableReason(caps.localGpuUnavailableReason ?? null);
      setGpuCheckComplete(true);
    };

    checkGPU();
  }, []);

  // Load preferences from model manager on mount
  useEffect(() => {
    const preferences = modelManager.getPreferences();
    setPreferredDevice(
      preferences.preferredDevice === 'auto'
        ? 'serverless'
        : (preferences.preferredDevice as 'webgpu' | 'wasm' | 'cpu' | 'serverless')
    );
  }, []);

  const handleDeviceChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const device = e.target.value as 'webgpu' | 'wasm' | 'cpu' | 'serverless';
      setPreferredDevice(device);
      modelManager.savePreferences({ preferredDevice: device });
      onDeviceChange?.(device);
    },
    [onDeviceChange]
  );

  // After the useEffect for loading preferences, add this new useEffect for device fallback
  useEffect(() => {
    if (gpuCheckComplete && !gpuAvailable && effectiveDevice === 'webgpu') {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const newDevice: 'serverless' | 'wasm' = isOnline ? 'serverless' : 'wasm';

      setPreferredDevice(newDevice);

      modelManager.savePreferences({ preferredDevice: newDevice });
      onDeviceChange?.(newDevice);
    }
  }, [
    gpuCheckComplete,
    gpuAvailable,
    effectiveDevice,
    onDeviceChange
  ]);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const fallbackDevice: 'serverless' | 'wasm' = isOnline ? 'serverless' : 'wasm';
  const effectiveSelectValue =
    effectiveDevice === 'webgpu' && !gpuAvailable ? fallbackDevice : effectiveDevice;
  const localGpuMessage = gpuCheckComplete && !gpuAvailable
    ? `${gpuUnavailableReason ?? 'Local GPU is unavailable on this browser/device.'} ${isOnline ? 'Using Cloud instead.' : 'Falling back to Local CPU.'}`
    : null;

  return (
    <div className="space-y-4">
      {/* Device Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-200">
          Processing mode
        </label>
        <select
          value={effectiveSelectValue}
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
          ) : gpuCheckComplete ? (
            <option value="webgpu" disabled>Local GPU — WebGPU (unavailable)</option>
          ) : null}
          <option value="wasm">
            Local CPU — offline (may not work on iPhone)
          </option>
          <option value="cpu">
            Local CPU (native) — offline (may not work on iPhone)
          </option>
        </select>
        {localGpuMessage && (
          <p className="text-xs text-slate-400">
            {localGpuMessage}
          </p>
        )}
        {(effectiveDevice === 'wasm' || effectiveDevice === 'cpu' || effectiveDevice === 'webgpu') && (
          <p className="text-xs text-amber-400 flex items-center gap-1">
            Local mode works offline but may crash on iPhone. Use cloud for best experience.
          </p>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;