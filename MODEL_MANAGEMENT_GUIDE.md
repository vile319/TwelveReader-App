# Model Management System Guide

## Overview

The new model management system provides a seamless, user-friendly, and intelligent way to handle AI model selection, caching, and storage. It ensures that only models explicitly chosen by users are kept locally, optimizing storage and performance.

## Key Features

### 🤖 Smart Model Selection
- **Automatic Device Detection**: Automatically detects GPU availability and recommends the best model
- **Performance Optimization**: Chooses models based on device capabilities and user preferences
- **Intelligent Fallbacks**: Gracefully falls back to CPU models when GPU is unavailable

### 🎛️ Manual Model Selection
- **Full Control**: Choose specific models for custom quality/performance requirements
- **Device-Specific Options**: See models optimized for your current device
- **Quality Indicators**: Clear visual indicators for model quality (High/Balanced/Fast)

### 💾 Intelligent Local Storage
- **User-Controlled Caching**: Only keep models that users explicitly choose to keep
- **Automatic Cleanup**: Removes unwanted models to save storage space
- **Cache Management**: Real-time cache size monitoring and cleanup tools

## Model Types

### GPU-Optimized Models (WebGPU)
- **Kokoro 82M (FP32)**: Full precision - Highest quality, 310MB
- **Kokoro 82M (FP16)**: Half precision - High quality, 156MB

### CPU-Optimized Models (WASM)
- **Kokoro 82M (Q8)**: 8-bit quantized - Balanced quality and speed, 82MB
- **Kokoro 82M (Q4)**: 4-bit quantized - Fastest, works on all devices, 290MB
- **Kokoro 82M (Q4F16)**: 4-bit with FP16 fallback - Good balance, 147MB

## Usage Guide

### Smart Selection Mode (Recommended)
1. **Enable Smart Selection**: The system automatically chooses the best model
2. **Device Awareness**: Automatically detects GPU/CPU and selects appropriate models
3. **Performance Optimization**: Prioritizes downloaded models for faster loading

### Manual Selection Mode
1. **Switch to Manual**: Choose "Manual Selection" for full control
2. **Browse Models**: View recommended models for your device
3. **Select Model**: Click on any model to select it
4. **Set Keep Local**: Check "Keep downloaded" for models you want to cache

### Model Management
1. **Advanced Options**: Click "Show Advanced Options" in the sidebar
2. **Cleanup Models**: Remove unwanted cached models
3. **Cache Info**: View current cache size and file count
4. **Reset All**: Clear all model data and start fresh

## Technical Implementation

### Model Manager Class
The `ModelManager` class provides:
- **Singleton Pattern**: Ensures consistent state across the application
- **Local Storage Management**: Handles preferences, cache status, and keep-local settings
- **Cache Operations**: Automatic cleanup and size calculation
- **Recommendation Engine**: Intelligent model selection based on device and preferences

### Key Methods
```typescript
// Save user preferences
modelManager.savePreferences({ autoSelect: true, selectedModel: 'model-id' });

// Set model keep local preference
modelManager.setModelKeepLocal('model-id', true);

// Update cache status
modelManager.updateModelCacheStatus('model-id', true, fileSize);

// Cleanup unwanted models
await modelManager.cleanupUnwantedModels();

// Get cache information
const cacheInfo = await modelManager.getCacheSize();
```

### Local Storage Structure
```typescript
// Model preferences
'twelvereader-model-preferences': {
  autoSelect: boolean,
  selectedModel: string,
  preferredDevice: 'webgpu' | 'wasm' | 'cpu',
  lastUpdated: number
}

// Keep local settings
'twelvereader-model-keep-local': {
  [modelId: string]: boolean
}

// Cache status
'twelvereader-model-cache-status': [
  {
    modelId: string,
    isDownloaded: boolean,
    downloadDate: number,
    fileSize: number,
    lastAccessed: number
  }
]
```

## Best Practices

### For Users
1. **Start with Smart Selection**: Let the system choose the best model initially
2. **Keep Frequently Used Models**: Check "Keep downloaded" for models you use often
3. **Regular Cleanup**: Use the cleanup feature to free up storage space
4. **Monitor Cache Size**: Check cache info to understand storage usage

### For Developers
1. **Use Model Manager**: Always use the ModelManager singleton for model operations
2. **Update Cache Status**: Call `updateModelCacheStatus` when models are downloaded/removed
3. **Respect User Preferences**: Always check keep-local settings before cleanup
4. **Error Handling**: Implement proper error handling for cache operations

## Troubleshooting

### Common Issues
1. **Model Not Loading**: Try the "Reset All Models" option
2. **High Storage Usage**: Use "Cleanup Models" to remove unwanted cached models
3. **Slow Performance**: Switch to a faster model (Q4/Q8) or enable GPU acceleration
4. **Cache Issues**: Check cache info and reset if necessary

### Performance Tips
1. **GPU Models**: Use FP32/FP16 models for highest quality on GPU devices
2. **CPU Models**: Use Q8/Q4 models for better performance on CPU devices
3. **Caching**: Keep frequently used models cached for faster loading
4. **Cleanup**: Regularly remove unused models to optimize storage

## Future Enhancements

### Planned Features
- **Model Versioning**: Support for multiple model versions
- **Automatic Updates**: Background model updates and notifications
- **Cloud Sync**: Sync model preferences across devices
- **Performance Analytics**: Track model performance and usage statistics
- **Custom Models**: Support for user-uploaded custom models

### Technical Improvements
- **Progressive Loading**: Load models in chunks for better performance
- **Compression**: Implement model compression to reduce storage requirements
- **CDN Integration**: Use CDN for faster model downloads
- **Offline Support**: Better offline model management and fallbacks