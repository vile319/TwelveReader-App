export type ModelDtype = 'fp32' | 'q8';
export type PreferredDevice = 'webgpu' | 'wasm' | 'cpu' | 'serverless';
export type RuntimeDevice = 'webgpu' | 'wasm' | 'serverless';

const WEBGPU_DTYPES: ModelDtype[] = ['fp32'];
const WASM_DTYPES: ModelDtype[] = ['q8'];

/**
 * Inflect ships FP32 only — there is no quantized export — so the generic
 * "wasm implies q8" rule below must not be applied to it.
 */
export const isInflectModel = (selectedModel?: string | null): boolean =>
  !!selectedModel && selectedModel.startsWith('inflect-');

export const inferPreferredDtype = (selectedModel?: string): ModelDtype => {
  if (!selectedModel) return 'fp32';
  if (isInflectModel(selectedModel)) return 'fp32';
  if (selectedModel.includes('q8')) return 'q8';
  return 'fp32';
};

/**
 * Which engine to use in local (offline) mode. Kokoro sounds better and has 50+
 * voices; Inflect is 5-20x smaller and is the only one that reliably survives
 * iOS Safari. "auto" picks Inflect on iOS and Kokoro everywhere else.
 */
export type LocalEngineChoice = 'auto' | 'kokoro' | 'inflect-nano' | 'inflect-micro';

const LOCAL_ENGINE_KEY = 'twelvereader.localVoiceEngine';

export const getLocalEngineChoice = (): LocalEngineChoice => {
  if (typeof localStorage === 'undefined') return 'auto';
  const stored = localStorage.getItem(LOCAL_ENGINE_KEY);
  if (stored === 'kokoro' || stored === 'inflect-nano' || stored === 'inflect-micro') return stored;
  return 'auto';
};

export const setLocalEngineChoice = (choice: LocalEngineChoice): void => {
  if (typeof localStorage === 'undefined') return;
  if (choice === 'auto') localStorage.removeItem(LOCAL_ENGINE_KEY);
  else localStorage.setItem(LOCAL_ENGINE_KEY, choice);
};

const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)
  );
};

export const getDefaultModelForDevice = (device: PreferredDevice): { modelId: string; dtype: ModelDtype } => {
  switch (device) {
    case 'webgpu':
      return { modelId: 'kokoro-82m-fp32', dtype: 'fp32' };
    case 'wasm':
    case 'cpu':
      // iPhone safety first: Kokoro 82M OOMs in iOS Safari even when explicitly
      // selected, so always use Inflect there (Micro if chosen, else Nano).
      if (isIOSDevice()) {
        if (getLocalEngineChoice() === 'inflect-micro') {
          return { modelId: 'inflect-micro-v2', dtype: 'fp32' };
        }
        return { modelId: 'inflect-nano-v2', dtype: 'fp32' };
      }
      switch (getLocalEngineChoice()) {
        case 'inflect-nano':
          return { modelId: 'inflect-nano-v2', dtype: 'fp32' };
        case 'inflect-micro':
          return { modelId: 'inflect-micro-v2', dtype: 'fp32' };
        case 'kokoro':
          return { modelId: 'kokoro-82m-q8', dtype: 'q8' };
        default:
          return { modelId: 'kokoro-82m-q8', dtype: 'q8' };
      }
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

  if (isInflectModel(selectedModel)) return 'fp32';

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
