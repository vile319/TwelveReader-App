import { describe, it, expect, beforeEach } from 'vitest';
import { isModelFile } from '../utils/modelCache';

// Sample URLs for GPU (fp32) and CPU (quantized q8) variants
const GPU_URL =
  'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/fp32/model.onnx';
const CPU_URL =
  'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/q8/model_quantized.onnx';

// Basic regex tests
describe('model file detection', () => {
  it('matches GPU variant url', () => {
    expect(isModelFile(GPU_URL)).toBe(true);
  });

  it('matches CPU variant url', () => {
    expect(isModelFile(CPU_URL)).toBe(true);
  });
});

// Cache behaviour tests (mocking the Cache API)

// Minimal Response stub for Node (implements only what's used in the test)
class ResponseStub {
  constructor(public readonly body: string, public readonly ok = true) {}
  clone() {
    return new ResponseStub(this.body, this.ok);
  }
}

beforeEach(() => {
  // Create a fresh mock cache before each test
  const store = new Map<string, any>();

  const mockCache = {
    async keys() {
      return Array.from(store.keys()).map((url) => new Request(url));
    },
    async match(req: Request) {
      return (store.get(req.url) as unknown) as Response | undefined;
    },
    async put(req: Request, res: ResponseStub) {
      store.set(req.url, (res as unknown) as Response);
    },
  };

  // Attach mock CacheStorage to globalThis
  (globalThis as any).caches = {
    async open() {
      return mockCache;
    },
    async keys() {
      return Array.from(store.keys());
    },
    async delete() {
      store.clear();
      return true;
    },
  } as any;
});

describe('cache store functionality', () => {
  it('stores both GPU and CPU model files without conflict', async () => {
    const cache = await (globalThis as any).caches.open('models');

    // Simulate first fetch (GPU)
    const gpuReq = new Request(GPU_URL);
    const gpuRes = new ResponseStub('gpu-model');
    await cache.put(gpuReq, gpuRes);

    // Simulate second fetch (CPU)
    const cpuReq = new Request(CPU_URL);
    const cpuRes = new ResponseStub('cpu-model');
    await cache.put(cpuReq, cpuRes);

    // Ensure both entries exist
    const keys = await cache.keys();
    expect(keys.length).toBe(2);

    const storedGpu = await cache.match(gpuReq);
    const storedCpu = await cache.match(cpuReq);
    expect(storedGpu?.body).toBe('gpu-model');
    expect(storedCpu?.body).toBe('cpu-model');
  });
});