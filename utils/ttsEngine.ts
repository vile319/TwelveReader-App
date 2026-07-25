/**
 * Engine facade.
 *
 * The TTS hook only ever needed three things from kokoro-js — `from_pretrained`,
 * `generate(text, { voice })`, and `list_voices()`. Both engines are routed
 * through that shape here so the 2000-line synthesis loop stays untouched and
 * the two models can be A/B'd from the existing model selector.
 */

import { KokoroTTS } from 'kokoro-js';
import { InflectTTS, INFLECT_DEFAULT_VOICE } from './inflect';
import type { ModelDtype } from './modelRuntime';

export type EngineFamily = 'kokoro' | 'inflect';

export interface GeneratedAudio {
  audio: Float32Array;
  sampling_rate?: number;
  sample_rate?: number;
  toBlob?: () => Blob;
  toWav?: () => ArrayBuffer;
}

export interface TtsEngine {
  family: EngineFamily;
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

export function getEngineFamily(modelId?: string | null): EngineFamily {
  return modelId && modelId.startsWith('inflect-') ? 'inflect' : 'kokoro';
}

/** Inflect has exactly one voice, so any Kokoro voice id must be remapped. */
export function resolveVoiceForModel(modelId: string | null | undefined, voice: string): string {
  return getEngineFamily(modelId) === 'inflect' ? INFLECT_DEFAULT_VOICE : voice;
}

export async function loadTtsEngine(
  modelId: string | null | undefined,
  options: LoadEngineOptions
): Promise<TtsEngine> {
  if (getEngineFamily(modelId) === 'inflect') {
    const variant = modelId?.includes('micro') ? 'micro' : 'nano';
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

  const engine = await KokoroTTS.from_pretrained(KOKORO_REPO, {
    dtype: options.dtype,
    device: options.device as 'webgpu' | 'wasm',
    progress_callback: options.progress_callback,
  } as any);
  return engine as unknown as TtsEngine;
}
