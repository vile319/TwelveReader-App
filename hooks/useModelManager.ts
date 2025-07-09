import { useState, useEffect, useCallback } from 'react';
import { modelManager } from '../utils/modelManager';
import { ModelConfig } from '../components/ModelSelector';

export const useModelManager = () => {
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [cacheSize, setCacheSize] = useState<{ totalSize: number; fileCount: number; sizeFormatted: string }>({
    totalSize: 0,
    fileCount: 0,
    sizeFormatted: '0 B'
  });
  const [keepLocalSettings, setKeepLocalSettings] = useState<Record<string, boolean>>({});

  // Load initial data
  useEffect(() => {
    refreshModelData();
  }, []);

  const refreshModelData = useCallback(async () => {
    const downloaded = modelManager.getDownloadedModels();
    const keepLocal = modelManager.getAllKeepLocalSettings();
    const cacheInfo = await modelManager.getCacheSize();

    setDownloadedModels(downloaded);
    setKeepLocalSettings(keepLocal);
    setCacheSize(cacheInfo);
  }, []);

  const setModelKeepLocal = useCallback((modelId: string, keepLocal: boolean) => {
    modelManager.setModelKeepLocal(modelId, keepLocal);
    setKeepLocalSettings((prev: Record<string, boolean>) => ({ ...prev, [modelId]: keepLocal }));
  }, []);

  const updateModelCacheStatus = useCallback((modelId: string, isDownloaded: boolean, fileSize?: number) => {
    modelManager.updateModelCacheStatus(modelId, isDownloaded, fileSize);
    if (isDownloaded) {
      setDownloadedModels((prev: string[]) => 
        prev.includes(modelId) ? prev : [...prev, modelId]
      );
    } else {
      setDownloadedModels((prev: string[]) => prev.filter((id: string) => id !== modelId));
    }
    refreshModelData(); // Refresh cache size
  }, [refreshModelData]);

  const cleanupUnwantedModels = useCallback(async () => {
    await modelManager.cleanupUnwantedModels();
    await refreshModelData();
  }, [refreshModelData]);

  const resetAllModelData = useCallback(async () => {
    await modelManager.resetAllModelData();
    await refreshModelData();
  }, [refreshModelData]);

  const getRecommendedModel = useCallback((device: 'webgpu' | 'wasm' | 'cpu', models: ModelConfig[]) => {
    return modelManager.getRecommendedModel(device, models);
  }, []);

  return {
    downloadedModels,
    cacheSize,
    keepLocalSettings,
    setModelKeepLocal,
    updateModelCacheStatus,
    cleanupUnwantedModels,
    resetAllModelData,
    getRecommendedModel,
    refreshModelData
  };
};