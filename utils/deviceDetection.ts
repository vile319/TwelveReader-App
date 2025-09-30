/**
 * Device Detection Utility
 * Detects device capabilities and recommends optimal TTS models
 */

export interface DeviceCapabilities {
  platform: 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'unknown';
  webgpuAvailable: boolean;
  isIPhone: boolean;
  isIPad: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  memoryGB: number | null;
  cores: number | null;
  recommendedModel: 'kitten' | 'kokoro-q8' | 'kokoro-fp16' | 'kokoro-fp32';
  recommendedDevice: 'webgpu' | 'wasm' | 'cpu';
}

/**
 * Detects the current device capabilities
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const ua = navigator.userAgent;
  
  // Platform detection
  const isIPhone = /iPhone/.test(ua);
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOS = isIPhone || isIPad;
  const isAndroid = /Android/.test(ua);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  let platform: DeviceCapabilities['platform'] = 'unknown';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';
  else if (/Win/.test(ua)) platform = 'windows';
  else if (/Mac/.test(ua)) platform = 'mac';
  else if (/Linux/.test(ua)) platform = 'linux';
  
  // Device type
  let deviceType: DeviceCapabilities['deviceType'] = 'desktop';
  if (isIPhone || isAndroid) deviceType = 'mobile';
  else if (isIPad) deviceType = 'tablet';
  
  // Browser detection
  let browser: DeviceCapabilities['browser'] = 'unknown';
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'safari';
  else if (/Chrome/.test(ua)) browser = 'chrome';
  else if (/Firefox/.test(ua)) browser = 'firefox';
  else if (/Edg/.test(ua)) browser = 'edge';
  else if (/Opera/.test(ua)) browser = 'opera';
  
  // WebGPU detection
  let webgpuAvailable = false;
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      webgpuAvailable = !!adapter;
    } catch (e) {
      console.log('WebGPU not available:', e);
    }
  }
  
  // Memory and CPU cores (if available)
  let memoryGB: number | null = null;
  let cores: number | null = null;
  
  try {
    if ((performance as any).memory) {
      const memBytes = (performance as any).memory.jsHeapSizeLimit;
      memoryGB = memBytes / (1024 * 1024 * 1024);
    }
  } catch (e) {
    // Memory API not available
  }
  
  try {
    cores = navigator.hardwareConcurrency || null;
  } catch (e) {
    // Hardware concurrency not available
  }
  
  // Model recommendation logic
  let recommendedModel: DeviceCapabilities['recommendedModel'] = 'kokoro-fp32';
  let recommendedDevice: DeviceCapabilities['recommendedDevice'] = 'webgpu';
  
  if (isIPhone) {
    // iPhones: Use KittenTTS for guaranteed compatibility
    // Kokoro has known issues with iOS Safari
    recommendedModel = 'kitten';
    recommendedDevice = 'wasm';
    console.log('📱 iPhone detected - recommending KittenTTS for best compatibility');
  } else if (isIPad) {
    // iPads: Try KittenTTS first, but Kokoro Q8 might work
    recommendedModel = 'kitten';
    recommendedDevice = 'wasm';
    console.log('📱 iPad detected - recommending KittenTTS for best compatibility');
  } else if (isAndroid && deviceType === 'mobile') {
    // Android phones: Q8 model works well
    recommendedModel = 'kokoro-q8';
    recommendedDevice = 'wasm';
    console.log('📱 Android mobile detected - recommending Kokoro Q8');
  } else if (webgpuAvailable && memoryGB && memoryGB >= 4) {
    // Desktop with WebGPU and good memory: Use FP32 for best quality
    recommendedModel = 'kokoro-fp32';
    recommendedDevice = 'webgpu';
    console.log('💻 Desktop with WebGPU detected - recommending Kokoro FP32');
  } else if (webgpuAvailable) {
    // Desktop with WebGPU but limited memory: Use FP16
    recommendedModel = 'kokoro-fp16';
    recommendedDevice = 'webgpu';
    console.log('💻 Desktop with WebGPU (limited memory) - recommending Kokoro FP16');
  } else {
    // Desktop without WebGPU: Use Q8 on WASM
    recommendedModel = 'kokoro-q8';
    recommendedDevice = 'wasm';
    console.log('💻 Desktop without WebGPU - recommending Kokoro Q8 on WASM');
  }
  
  return {
    platform,
    deviceType,
    browser,
    webgpuAvailable,
    isIPhone,
    isIPad,
    isAndroid,
    isMobile,
    memoryGB,
    cores,
    recommendedModel,
    recommendedDevice,
  };
}

/**
 * Maps recommended model to actual model ID
 */
export function getModelIdFromRecommendation(recommendation: string): string {
  switch (recommendation) {
    case 'kitten':
      return 'kitten-nano';
    case 'kokoro-q8':
      return 'kokoro-82m-q8';
    case 'kokoro-fp16':
      return 'kokoro-82m-fp16';
    case 'kokoro-fp32':
      return 'kokoro-82m-fp32';
    default:
      return 'kokoro-82m-fp32';
  }
}

/**
 * Get user-friendly device description
 */
export function getDeviceDescription(capabilities: DeviceCapabilities): string {
  const { platform, deviceType, browser, webgpuAvailable } = capabilities;
  
  let desc = '';
  
  // Device type and platform
  if (capabilities.isIPhone) desc = 'iPhone';
  else if (capabilities.isIPad) desc = 'iPad';
  else if (platform === 'android' && deviceType === 'mobile') desc = 'Android Phone';
  else if (platform === 'android' && deviceType === 'tablet') desc = 'Android Tablet';
  else if (deviceType === 'desktop') desc = 'Desktop';
  else desc = 'Device';
  
  // Add browser
  if (browser !== 'unknown') {
    desc += ` (${browser.charAt(0).toUpperCase() + browser.slice(1)})`;
  }
  
  // Add capabilities
  const caps: string[] = [];
  if (webgpuAvailable) caps.push('WebGPU');
  if (capabilities.cores) caps.push(`${capabilities.cores} cores`);
  if (capabilities.memoryGB) caps.push(`${capabilities.memoryGB.toFixed(1)}GB RAM`);
  
  if (caps.length > 0) {
    desc += ` - ${caps.join(', ')}`;
  }
  
  return desc;
}

/**
 * Check if a specific model is compatible with the current device
 */
export function isModelCompatible(modelId: string, capabilities: DeviceCapabilities): boolean {
  // KittenTTS works everywhere
  if (modelId.startsWith('kitten')) {
    return true;
  }
  
  // Kokoro models have iOS compatibility issues
  if (modelId.startsWith('kokoro')) {
    if (capabilities.isIPhone || capabilities.isIPad) {
      console.warn('⚠️ Kokoro models may not work reliably on iOS devices');
      return false; // Not recommended, but might work
    }
    
    // WebGPU models require WebGPU support
    if (modelId.includes('fp32') || modelId.includes('fp16')) {
      return capabilities.webgpuAvailable;
    }
    
    // Q8/Q4 models work on WASM
    return true;
  }
  
  return true;
}

/**
 * Get a warning message if user selects an incompatible model
 */
export function getCompatibilityWarning(modelId: string, capabilities: DeviceCapabilities): string | null {
  if (modelId.startsWith('kokoro') && (capabilities.isIPhone || capabilities.isIPad)) {
    return '⚠️ Kokoro models may not work reliably on iOS devices. We recommend KittenTTS for iPhones and iPads.';
  }
  
  if ((modelId.includes('fp32') || modelId.includes('fp16')) && !capabilities.webgpuAvailable) {
    return '⚠️ This model requires WebGPU, which is not available on your device. Consider using Q8 or Q4 models instead.';
  }
  
  return null;
}
