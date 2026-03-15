export type WebGpuSupportReason =
  | 'navigator-undefined'
  | 'no-navigator-gpu'
  | 'request-adapter-null'
  | 'request-adapter-error'
  | 'supported';

export interface GpuCapabilities {
  hasWebGPU: boolean;
  isGoodWebGPU: boolean;
  canUseLocalGpu: boolean;
  isFallbackAdapter: boolean;
  maxStorageBufferBindingSize?: number;
  reason: WebGpuSupportReason;
  hasWebGL: boolean;
  localGpuUnavailableReason?: string;
}

/** Cached promise so all callers get the same GPU detection result (avoids race). */
let gpuCapabilitiesPromise: Promise<GpuCapabilities> | null = null;
const MIN_STORAGE_BUFFER_BYTES = 128 * 1024 * 1024;

function getLocalGpuUnavailableReason({
  reason,
  isFallbackAdapter,
  maxStorageBufferBindingSize
}: {
  reason: WebGpuSupportReason;
  isFallbackAdapter: boolean;
  maxStorageBufferBindingSize?: number;
}): string {
  if (reason === 'navigator-undefined') {
    return 'Local GPU is unavailable while the app is still loading.';
  }

  if (reason === 'no-navigator-gpu') {
    return 'Local GPU is unavailable in this browser/device.';
  }

  if (reason === 'request-adapter-null' || reason === 'request-adapter-error') {
    return 'Local GPU is unavailable because WebGPU could not be initialized.';
  }

  if (isFallbackAdapter) {
    return 'Local GPU is unavailable because only a fallback WebGPU adapter was found.';
  }

  if (
    typeof maxStorageBufferBindingSize === 'number' &&
    maxStorageBufferBindingSize < MIN_STORAGE_BUFFER_BYTES
  ) {
    return 'Local GPU is unavailable because this device does not meet the minimum WebGPU memory limits.';
  }

  return 'Local GPU is unavailable on this browser/device.';
}

function detectGpuCapabilitiesImpl(): Promise<GpuCapabilities> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return Promise.resolve({
      hasWebGPU: false,
      isGoodWebGPU: false,
      canUseLocalGpu: false,
      isFallbackAdapter: false,
      reason: 'navigator-undefined',
      hasWebGL: false,
      localGpuUnavailableReason: getLocalGpuUnavailableReason({
        reason: 'navigator-undefined',
        isFallbackAdapter: false
      })
    });
  }

  const navAny = navigator as any;

  let hasWebGPU = false;
  let isGoodWebGPU = false;
  let isFallbackAdapter = false;
  let maxStorageBufferBindingSize: number | undefined;
  let reason: WebGpuSupportReason = 'no-navigator-gpu';

  const run = async (): Promise<GpuCapabilities> => {
    if (navAny.gpu) {
      try {
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

    const canUseLocalGpu = hasWebGPU && isGoodWebGPU;

    return {
      hasWebGPU,
      isGoodWebGPU,
      canUseLocalGpu,
      isFallbackAdapter,
      maxStorageBufferBindingSize,
      reason,
      hasWebGL,
      localGpuUnavailableReason: canUseLocalGpu
        ? undefined
        : getLocalGpuUnavailableReason({
          reason,
          isFallbackAdapter,
          maxStorageBufferBindingSize
        })
    };
  };

  return run();
}

/**
 * Centralized helper to detect basic GPU capabilities.
 * Result is cached so all callers get the same answer and avoid race conditions.
 *
 * It is intentionally conservative for WebGPU:
 * - If anything throws or returns null, we report hasWebGPU = false.
 * - "Good" GPU is determined by !isFallbackAdapter and a minimum buffer limit.
 *
 * It also performs a lightweight WebGL probe using an offscreen canvas so that
 * callers (especially iOS configuration) can decide whether to prefer WebGL.
 */
export const detectGpuCapabilities = async (): Promise<GpuCapabilities> => {
  if (!gpuCapabilitiesPromise) {
    gpuCapabilitiesPromise = detectGpuCapabilitiesImpl();
  }
  return gpuCapabilitiesPromise;
};


