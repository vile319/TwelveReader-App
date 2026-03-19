export type ModelDtype = 'fp32' | 'q8';
export type PreferredDevice = 'webgpu' | 'wasm' | 'cpu' | 'serverless';
export type RuntimeDevice = 'webgpu' | 'wasm' | 'serverless';

const WEBGPU_DTYPES: ModelDtype[] = ['fp32'];
const WASM_DTYPES: ModelDtype[] = ['q8'];

export const inferPreferredDtype = (selectedModel?: string): ModelDtype => {
  if (!selectedModel) return 'fp32';
  if (selectedModel.includes('q8')) return 'q8';
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
      return { modelId: 'kokoro-82m-q8', dtype: 'q8' };
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
    return WEBGPU_DTYPES.includes(dtype) ? dtype : 'fp32';
  }

  if (device === 'wasm') {
    return WASM_DTYPES.includes(dtype) ? dtype : 'q8';
  }

  return 'q8';
};

export const isLocalDevice = (device?: PreferredDevice | RuntimeDevice | null): boolean =>
  device === 'webgpu' || device === 'wasm' || device === 'cpu';
