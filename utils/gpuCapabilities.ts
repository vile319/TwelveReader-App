export type WebGpuSupportReason =
  | 'navigator-undefined'
  | 'no-navigator-gpu'
  | 'request-adapter-null'
  | 'request-adapter-error'
  | 'supported';

export interface GpuCapabilities {
  hasWebGPU: boolean;
  isGoodWebGPU: boolean;
  isFallbackAdapter: boolean;
  maxStorageBufferBindingSize?: number;
  reason: WebGpuSupportReason;
  hasWebGL: boolean;
}

/**
 * Centralized helper to detect basic GPU capabilities.
 *
 * It is intentionally conservative for WebGPU:
 * - If anything throws or returns null, we report hasWebGPU = false.
 * - "Good" GPU is determined by !isFallbackAdapter and a minimum buffer limit.
 *
 * It also performs a lightweight WebGL probe using an offscreen canvas so that
 * callers (especially iOS configuration) can decide whether to prefer WebGL.
 */
export const detectGpuCapabilities = async (): Promise<GpuCapabilities> => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      hasWebGPU: false,
      isGoodWebGPU: false,
      isFallbackAdapter: false,
      reason: 'navigator-undefined',
      hasWebGL: false
    };
  }

  const navAny = navigator as any;

  let hasWebGPU = false;
  let isGoodWebGPU = false;
  let isFallbackAdapter = false;
  let maxStorageBufferBindingSize: number | undefined;
  let reason: WebGpuSupportReason = 'no-navigator-gpu';

  if (navAny.gpu) {
    try {
      // In practice this can occasionally hang or return null on some platforms,
      // so we treat a null adapter the same as "no usable WebGPU".
      const adapter: GPUAdapter | null = await navAny.gpu.requestAdapter();

      if (!adapter) {
        reason = 'request-adapter-null';
      } else {
        hasWebGPU = true;
        reason = 'supported';

        maxStorageBufferBindingSize =
          (adapter.limits &&
            (adapter.limits as any).maxStorageBufferBindingSize) ??
          undefined;

        // Same threshold currently used in AppContext – centralized here so we can tune it.
        const MIN_STORAGE_BUFFER_BYTES = 128 * 1024 * 1024;

        isFallbackAdapter = !!adapter.isFallbackAdapter;
        const meetsLimit =
          typeof maxStorageBufferBindingSize === 'number'
            ? maxStorageBufferBindingSize >= MIN_STORAGE_BUFFER_BYTES
            : true;

        isGoodWebGPU = !isFallbackAdapter && meetsLimit;
      }
    } catch {
      reason = 'request-adapter-error';
    }
  }

  // Lightweight WebGL probe using an offscreen canvas.
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
  } catch {
    // Ignore WebGL probing errors; hasWebGL stays false.
  }

  return {
    hasWebGPU,
    isGoodWebGPU,
    isFallbackAdapter,
    maxStorageBufferBindingSize,
    reason,
    hasWebGL
  };
};


