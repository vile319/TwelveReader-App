/**
 * ONNX Runtime iOS Compatibility Configuration
 * This must be called before any kokoro-js initialization to ensure iPhone compatibility
 */

export const configureOnnxRuntimeForIOS = async () => {
  // Only configure if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Import ONNX Runtime Web
    const ort = await import('onnxruntime-web');
    
    console.log('🔧 Configuring ONNX Runtime for iOS compatibility...');
    
    // Configure WASM environment settings for iOS
    // These settings address known iOS Safari compatibility issues
    ort.env.wasm.wasmPaths = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.17.3/';
    ort.env.wasm.simd = false; // Disable SIMD - known to be problematic on iOS 16.4+
    ort.env.wasm.numThreads = 1; // Disable multi-threading for iOS stability
    ort.env.debug = true; // Enable debug mode for better error reporting
    
    // Detect if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      console.log('📱 iOS detected - probing for WebGL support (WebGPU will not be touched in this path)...');

      // IMPORTANT: Do NOT call navigator.gpu.requestAdapter() here.
      // It can hang on some platforms and this function runs during early app init.
      let hasWebGL = false;
      try {
        const doc: any = typeof document !== 'undefined' ? document : null;
        const canvas =
          doc && typeof doc.createElement === 'function'
            ? (doc.createElement('canvas') as HTMLCanvasElement)
            : null;

        if (canvas) {
          const gl =
            canvas.getContext('webgl2') || canvas.getContext('webgl') || null;
          if (gl) {
            hasWebGL = true;
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to probe WebGL capabilities on iOS:', e);
      }

      if (hasWebGL) {
        console.log('📱 iOS: WebGL detected – using WebGL execution provider for better compatibility');
        // Store preferred execution provider for kokoro-js
        window.PREFERRED_EXECUTION_PROVIDER = 'webgl';
      } else {
        console.log('📱 iOS: WebGL not available – falling back to default WASM execution provider');
        window.PREFERRED_EXECUTION_PROVIDER = 'wasm';
      }
    } else {
      console.log('💻 Non-iOS device - using default execution provider');
    }
    
    console.log('✅ ONNX Runtime configured for iOS compatibility');
    
  } catch (error) {
    console.error('❌ Failed to configure ONNX Runtime for iOS:', error);
    throw error;
  }
};

// Helper function to get recommended device/dtype settings for iOS
export const getIosOptimizedSettings = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    return {
      device: 'wasm' as const, // Use WASM with our iOS-optimized settings
      dtype: 'q8' as const, // Use quantized model for better memory efficiency on iOS
      executionProviders: ['webgl'] // Prefer WebGL over default WASM
    };
  }
  
  return {
    device: 'wasm' as const,
    dtype: 'fp32' as const,
    executionProviders: ['wasm']
  };
};

// Extend window type for TypeScript
declare global {
  interface Window {
    PREFERRED_EXECUTION_PROVIDER?: string;
  }
} 