/**
 * Engine facade — lazy by design.
 *
 * `getEngineFamily` / `resolveVoiceForModel` are re-exported from the
 * featherweight `./engineFamily` module so UI code never pulls the ML stack.
 * The heavy engines (`kokoro-js`, Inflect+phonemizer) are dynamically imported
 * inside `loadTtsEngine`, which only runs on the local (offline) path.
 * Cloud-default users never download that code.
 */

import type { ModelDtype } from './modelRuntime';

export { getEngineFamily, resolveVoiceForModel, INFLECT_DEFAULT_VOICE } from './engineFamily';
export type { EngineFamily } from './engineFamily';

import { getEngineFamily } from './engineFamily';

export interface GeneratedAudio {
  audio: Float32Array;
  sampling_rate?: number;
  sample_rate?: number;
  toBlob?: () => Blob;
  toWav?: () => ArrayBuffer;
}

export interface TtsEngine {
  family: 'kokoro' | 'inflect';
  generate(text: string, options: { voice?: string; speed?: number }): Promise<GeneratedAudio>;
  list_voices?: () => unknown;
}

export interface LoadEngineOptions {
  device: 'webgpu' | 'wasm' | 'cpu' | 'serverless';
  dtype: ModelDtype;
  progress_callback?: (progress: { status: string; progress?: number }) => void;
  signal?: AbortSignal;
}

const KOKORO_REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX';

export async function loadTtsEngine(
  modelId: string | null | undefined,
  options: LoadEngineOptions
): Promise<TtsEngine> {
  if (getEngineFamily(modelId) === 'inflect') {
    const variant = modelId?.includes('micro') ? 'micro' : 'nano';
    const { InflectTTS } = await import('./inflect/InflectTTS');
    const engine = await InflectTTS.from_pretrained(variant, {
      device: options.device === 'webgpu' ? 'webgpu' : 'wasm',
      signal: options.signal,
      progress_callback: (progress) =>
        options.progress_callback?.({
          status: progress.status,
          progress: progress.progress,
        }),
    });
    return engine as unknown as TtsEngine;
  }

  const { KokoroTTS } = await import('kokoro-js');
  const engine = await KokoroTTS.from_pretrained(KOKORO_REPO, {
    dtype: options.dtype,
    device: options.device as 'webgpu' | 'wasm',
    progress_callback: options.progress_callback,
  } as any);
  return engine as unknown as TtsEngine;
}
