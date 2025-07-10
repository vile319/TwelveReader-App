import { ModelConfig } from '../components/ModelSelector';

// Local storage keys
const MODEL_PREFERENCES_KEY = 'twelvereader-model-preferences';
const MODEL_KEEP_LOCAL_KEY = 'twelvereader-model-keep-local';
const MODEL_CACHE_STATUS_KEY = 'twelvereader-model-cache-status';

export interface ModelPreferences {
  selectedModel: string;
  preferredDevice: 'webgpu' | 'wasm' | 'cpu';
  lastUpdated: number;
}

export interface ModelCacheStatus {
  modelId: string;
  isDownloaded: boolean;
  downloadDate: number;
  fileSize: number;
  lastAccessed: number;
}

export interface ModelKeepLocalSettings {
  [modelId: string]: boolean;
}

export class ModelManager {
  private static instance: ModelManager;
  private preferences: ModelPreferences;
  private keepLocalSettings: ModelKeepLocalSettings;
  private cacheStatus: ModelCacheStatus[];

  private constructor() {
    this.preferences = this.loadPreferences();
    this.keepLocalSettings = this.loadKeepLocalSettings();
    this.cacheStatus = this.loadCacheStatus();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  // Preferences management
  private loadPreferences(): ModelPreferences {
    try {
      const saved = localStorage.getItem(MODEL_PREFERENCES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          selectedModel: parsed.selectedModel ?? 'kokoro-82m-fp32',
          preferredDevice: parsed.preferredDevice ?? 'webgpu',
          lastUpdated: parsed.lastUpdated ?? Date.now()
        };
      }
    } catch (error) {
      console.warn('Failed to load model preferences:', error);
    }
    
    return {
      selectedModel: 'kokoro-82m-fp32',
      preferredDevice: 'webgpu',
      lastUpdated: Date.now()
    };
  }

  public savePreferences(preferences: Partial<ModelPreferences>): void {
    try {
      this.preferences = { ...this.preferences, ...preferences, lastUpdated: Date.now() };
      localStorage.setItem(MODEL_PREFERENCES_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save model preferences:', error);
    }
  }

  public getPreferences(): ModelPreferences {
    return { ...this.preferences };
  }

  // Keep local settings management
  private loadKeepLocalSettings(): ModelKeepLocalSettings {
    try {
      const saved = localStorage.getItem(MODEL_KEEP_LOCAL_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load keep local settings:', error);
    }
    return {};
  }

  public setModelKeepLocal(modelId: string, keepLocal: boolean): void {
    try {
      this.keepLocalSettings[modelId] = keepLocal;
      localStorage.setItem(MODEL_KEEP_LOCAL_KEY, JSON.stringify(this.keepLocalSettings));
      
      // If user doesn't want to keep the model, clean up cache
      if (!keepLocal) {
        this.cleanupModelCache(modelId);
      }
    } catch (error) {
      console.warn('Failed to save keep local setting:', error);
    }
  }

  public getModelKeepLocal(modelId: string): boolean {
    return this.keepLocalSettings[modelId] ?? false;
  }

  public getAllKeepLocalSettings(): ModelKeepLocalSettings {
    return { ...this.keepLocalSettings };
  }

  // Cache status management
  private loadCacheStatus(): ModelCacheStatus[] {
    try {
      const saved = localStorage.getItem(MODEL_CACHE_STATUS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load cache status:', error);
    }
    return [];
  }

  public updateModelCacheStatus(modelId: string, isDownloaded: boolean, fileSize?: number): void {
    try {
      const existingIndex = this.cacheStatus.findIndex(status => status.modelId === modelId);
      const cacheEntry: ModelCacheStatus = {
        modelId,
        isDownloaded,
        downloadDate: isDownloaded ? Date.now() : 0,
        fileSize: fileSize ?? 0,
        lastAccessed: Date.now()
      };

      if (existingIndex >= 0) {
        this.cacheStatus[existingIndex] = cacheEntry;
      } else {
        this.cacheStatus.push(cacheEntry);
      }

      localStorage.setItem(MODEL_CACHE_STATUS_KEY, JSON.stringify(this.cacheStatus));
    } catch (error) {
      console.warn('Failed to update cache status:', error);
    }
  }

  public getModelCacheStatus(modelId: string): ModelCacheStatus | undefined {
    return this.cacheStatus.find(status => status.modelId === modelId);
  }

  public getAllCacheStatus(): ModelCacheStatus[] {
    return [...this.cacheStatus];
  }

  public getDownloadedModels(): string[] {
    return this.cacheStatus
      .filter(status => status.isDownloaded)
      .map(status => status.modelId);
  }

  // Cache cleanup
  public async cleanupModelCache(modelId: string): Promise<void> {
    try {
      // Remove from cache status
      this.cacheStatus = this.cacheStatus.filter(status => status.modelId !== modelId);
      localStorage.setItem(MODEL_CACHE_STATUS_KEY, JSON.stringify(this.cacheStatus));

      // Clear browser cache for this model
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        const modelCaches = cacheNames.filter(name => 
          name.includes('model') || 
          name.includes('kokoro') || 
          name.includes(modelId)
        );

        for (const cacheName of modelCaches) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          // Remove files related to this model
          for (const request of requests) {
            if (request.url.includes(modelId) || 
                request.url.includes('onnx') || 
                request.url.includes('bin') || 
                request.url.includes('json')) {
              await cache.delete(request);
            }
          }
        }
      }

      console.log(`🧹 Cleaned up cache for model: ${modelId}`);
    } catch (error) {
      console.warn('Failed to cleanup model cache:', error);
    }
  }

  public async cleanupUnwantedModels(): Promise<void> {
    try {
      const downloadedModels = this.getDownloadedModels();
      const modelsToKeep = downloadedModels.filter(modelId => 
        this.getModelKeepLocal(modelId)
      );

      const modelsToRemove = downloadedModels.filter(modelId => 
        !this.getModelKeepLocal(modelId)
      );

      console.log(`🧹 Cleaning up ${modelsToRemove.length} unwanted models...`);
      
      for (const modelId of modelsToRemove) {
        await this.cleanupModelCache(modelId);
      }

      console.log(`✅ Kept ${modelsToKeep.length} models, removed ${modelsToRemove.length} models`);
    } catch (error) {
      console.warn('Failed to cleanup unwanted models:', error);
    }
  }

  // Model recommendation system
  public getRecommendedModel(device: 'webgpu' | 'wasm' | 'cpu', models: ModelConfig[]): ModelConfig {
    const deviceModels = models.filter(model => 
      device === 'webgpu' ? model.device === 'webgpu' : model.device !== 'webgpu'
    );

    // Prefer downloaded models
    const downloadedModels = this.getDownloadedModels();
    const downloadedDeviceModels = deviceModels.filter(model => 
      downloadedModels.includes(model.id)
    );

    if (downloadedDeviceModels.length > 0) {
      // Return the highest quality downloaded model
      return downloadedDeviceModels.sort((a, b) => {
        const qualityOrder = { high: 3, balanced: 2, fast: 1 };
        return qualityOrder[b.quality] - qualityOrder[a.quality];
      })[0];
    }

    // If no downloaded models, return the best available model for the device
    return deviceModels.sort((a, b) => {
      const qualityOrder = { high: 3, balanced: 2, fast: 1 };
      return qualityOrder[b.quality] - qualityOrder[a.quality];
    })[0];
  }

  // Cache size calculation
  public async getCacheSize(): Promise<{ totalSize: number; fileCount: number; sizeFormatted: string }> {
    try {
      let totalSize = 0;
      let fileCount = 0;

      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        const modelCaches = cacheNames.filter(name => 
          name.includes('model') || name.includes('kokoro')
        );

        for (const cacheName of modelCaches) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
              fileCount++;
            }
          }
        }
      }

      const sizeFormatted = this.formatBytes(totalSize);
      
      return { totalSize, fileCount, sizeFormatted };
    } catch (error) {
      console.warn('Failed to calculate cache size:', error);
      return { totalSize: 0, fileCount: 0, sizeFormatted: '0 B' };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Reset all model data
  public async resetAllModelData(): Promise<void> {
    try {
      // Clear all local storage
      localStorage.removeItem(MODEL_PREFERENCES_KEY);
      localStorage.removeItem(MODEL_KEEP_LOCAL_KEY);
      localStorage.removeItem(MODEL_CACHE_STATUS_KEY);

      // Clear all caches
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        const modelCaches = cacheNames.filter(name => 
          name.includes('model') || name.includes('kokoro')
        );

        for (const cacheName of modelCaches) {
          await caches.delete(cacheName);
        }
      }

      // Reset instance data
      this.preferences = this.loadPreferences();
      this.keepLocalSettings = this.loadKeepLocalSettings();
      this.cacheStatus = this.loadCacheStatus();

      console.log('🔄 Reset all model data');
    } catch (error) {
      console.warn('Failed to reset model data:', error);
    }
  }
}

// Export singleton instance
export const modelManager = ModelManager.getInstance();