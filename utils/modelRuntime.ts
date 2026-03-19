export type ModelDtype = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
export type PreferredDevice = 'webgpu' | 'wasm' | 'cpu' | 'serverless';
export type RuntimeDevice = 'webgpu' | 'wasm' | 'serverless';

const WEBGPU_DTYPES: ModelDtype[] = ['fp32', 'fp16'];
const WASM_DTYPES: ModelDtype[] = ['q8', 'q4', 'q4f16', 'fp32'];

export const inferPreferredDtype = (selectedModel?: string): ModelDtype => {
  if (!selectedModel) return 'fp32';
  if (selectedModel.includes('q4f16')) return 'q4f16';
  if (selectedModel.includes('q4')) return 'q4';
  if (selectedModel.includes('q8')) return 'q8';
  if (selectedModel.includes('fp16')) return 'fp16';
  return 'fp32';
};

export const getDefaultModelForDevice = (device: PreferredDevice): { modelId: string; dtype: ModelDtype } => {
  switch (device) {
    case 'webgpu':
      return { modelId: 'kokoro-82m-fp32', dtype: 'fp32' };
    case 'wasm':
    case 'cpu':
      return { modelId: 'kokoro-82m-q8', dtype: 'q8' };
    case 'serverless':
    default:
      return { modelId: 'kokoro-82m-fp32', dtype: 'fp32' };
  }
};

export const mapPreferredDeviceToRuntimeDevice = (device?: PreferredDevice | null): RuntimeDevice | undefined => {
  if (!device) return undefined;
  if (device === 'cpu') return 'wasm';
  return device;
};

export const getCompatibleDtypeForDevice = (
  device: RuntimeDevice,
  requestedDtype?: ModelDtype,
  selectedModel?: string
): ModelDtype => {
  const dtype = requestedDtype ?? inferPreferredDtype(selectedModel);

  if (device === 'webgpu') {
    // fp32 is the working WebGPU variant; fp16 produces NaN/invalid output on WebGPU ONNX backend
    if (dtype === 'fp16') return 'fp32';
    return WEBGPU_DTYPES.includes(dtype) ? dtype : 'fp32';
  }

  if (device === 'wasm') {
    return WASM_DTYPES.includes(dtype) ? dtype : 'q8';
  }

  return 'fp32';
};

export const isLocalDevice = (device?: PreferredDevice | RuntimeDevice | null): boolean =>
  device === 'webgpu' || device === 'wasm' || device === 'cpu';
