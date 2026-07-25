/**
 * Inflect v2 text-to-speech in the browser, on onnxruntime-web.
 *
 * Deliberately mirrors the slice of the kokoro-js surface that this app uses —
 * `from_pretrained`, `generate`, `list_voices` — so it can be dropped into the
 * existing TTS hook without rewriting the synthesis loop.
 *
 * Faithful port of owensong/Inflect-Micro-v2-ONNX `onnx/inference_onnx.py`,
 * with two documented deviations:
 *   1. The latent noise RNG differs (see rng.ts) — seeds are reproducible here
 *      but will not bit-match the Python reference.
 *   2. espeak-ng comes from phonemizer.js rather than the Linux shared library.
 *
 * Model repos (FP32, no quantized variant is published — the author warns that
 * naive INT8 audibly damages the integrated waveform decoder):
 *   owensong/Inflect-Micro-v2-ONNX  ~37.8 MB
 *   owensong/Inflect-Nano-v2-ONNX   ~16.2 MB
 */

import type { InferenceSession, Tensor as OrtTensor } from 'onnxruntime-web';

import { SAMPLE_RATE, phonemesToTokens, UnspeakableTextError } from './symbols';
import { normalizeText } from './normalize';
import { phonemizeNormalized } from './phonemize';
import { splitText, boundaryPauseSeconds, edgeFade, concatWithPauses } from './chunk';
import { standardNormal } from './rng';

export type InflectVariant = 'micro' | 'nano';

export interface InflectProgress {
  status: 'initiate' | 'progress' | 'done' | 'ready';
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export interface InflectLoadOptions {
  device?: 'webgpu' | 'wasm' | 'cpu' | 'webgl';
  progress_callback?: (progress: InflectProgress) => void;
  /** Aborts an in-flight download. */
  signal?: AbortSignal;
}

export interface InflectGenerateOptions {
  /** Accepted and ignored — Inflect ships a single fixed voice. */
  voice?: string;
  speed?: number;
  variation?: number;
  seed?: number;
}

export interface InflectAudio {
  audio: Float32Array;
  sampling_rate: number;
  /** kokoro-js compatibility alias. */
  sample_rate: number;
  toWav: () => ArrayBuffer;
  toBlob: () => Blob;
}

const REPOS: Record<InflectVariant, { repo: string; bytes: number }> = {
  micro: { repo: 'owensong/Inflect-Micro-v2-ONNX', bytes: 39_600_000 },
  nano: { repo: 'owensong/Inflect-Nano-v2-ONNX', bytes: 17_000_000 },
};

const GRAPHS = ['duration.onnx', 'decode.onnx'] as const;
const MODEL_CACHE = 'models';

/**
 * Inflect ships one fixed synthetic male voice. There is no speaker embedding
 * and no cloning, so this is not a placeholder we can fill in later — it is a
 * property of the model. Shaped like a kokoro-js voice entry so existing voice
 * UI keeps rendering.
 */
export const INFLECT_VOICES = Object.freeze({
  im_owen: Object.freeze({
    name: 'Owen',
    language: 'en-us',
    gender: 'Male',
    traits: 'Fixed voice',
    targetQuality: 'B',
    overallGrade: 'B',
  }),
});

export const INFLECT_DEFAULT_VOICE = 'im_owen';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as Mac; the touch-point check disambiguates.
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)
  );
}

/**
 * Downloads with progress and persists into the Cache API so repeat visits and
 * offline use behave like the kokoro path already does.
 */
async function fetchGraph(
  url: string,
  onProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(MODEL_CACHE);
      const hit = await cache.match(url);
      if (hit) {
        const buffer = await hit.arrayBuffer();
        onProgress(buffer.byteLength, buffer.byteLength);
        return buffer;
      }
    } catch (error) {
      console.warn('[inflect] cache lookup failed, downloading fresh:', error);
    }
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const declared = Number(response.headers.get('content-length') ?? 0);

  // Stream so the progress bar is real rather than a two-state guess.
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        parts.push(value);
        loaded += value.byteLength;
        onProgress(loaded, declared || loaded);
      }
    }
    const buffer = new Uint8Array(loaded);
    let offset = 0;
    for (const part of parts) {
      buffer.set(part, offset);
      offset += part.byteLength;
    }

    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(MODEL_CACHE);
        await cache.put(url, new Response(buffer.slice(0), { headers: response.headers }));
      } catch (error) {
        console.warn('[inflect] could not cache model graph:', error);
      }
    }
    return buffer.buffer;
  }

  const buffer = await response.arrayBuffer();
  onProgress(buffer.byteLength, buffer.byteLength);
  return buffer;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

export class InflectTTS {
  private constructor(
    private readonly duration: InferenceSession,
    private readonly decode: InferenceSession,
    private readonly ort: typeof import('onnxruntime-web'),
    public readonly variant: InflectVariant,
    public readonly device: string
  ) {}

  static async from_pretrained(
    model: InflectVariant | string = 'nano',
    options: InflectLoadOptions = {}
  ): Promise<InflectTTS> {
    const variant: InflectVariant =
      model === 'micro' || String(model).toLowerCase().includes('micro') ? 'micro' : 'nano';
    const { repo, bytes: estimatedTotal } = REPOS[variant];
    const { progress_callback: onProgress, signal } = options;

    const ort = await import('onnxruntime-web');

    // Inflect's decoder is a HiFi-GAN-style stack of dilated convolutions and
    // transposed convs. The WebGL EP does not implement ConvTranspose, so it is
    // never a valid target here regardless of what the iOS config prefers for
    // kokoro. WASM is the only provider that runs the full graph on Safari.
    let executionProviders: string[];
    if (options.device === 'webgpu') {
      executionProviders = ['webgpu', 'wasm'];
    } else {
      executionProviders = ['wasm'];
    }

    if (isIOS()) {
      ort.env.wasm.simd = false;
      ort.env.wasm.numThreads = 1;
      executionProviders = ['wasm'];
    }

    const downloaded = new Map<string, number>();
    const report = (file: string, loaded: number, total: number) => {
      downloaded.set(file, loaded);
      let sum = 0;
      for (const value of downloaded.values()) sum += value;
      const denominator = total > 0 && downloaded.size === GRAPHS.length ? sum : estimatedTotal;
      onProgress?.({
        status: 'progress',
        file,
        loaded: sum,
        total: denominator,
        progress: Math.min(sum / Math.max(denominator, 1), 1),
      });
    };

    const buffers = await Promise.all(
      GRAPHS.map((graph) =>
        fetchGraph(
          `https://huggingface.co/${repo}/resolve/main/onnx/${graph}`,
          (loaded, total) => report(graph, loaded, total),
          signal
        )
      )
    );

    const sessionOptions: InferenceSession.SessionOptions = {
      executionProviders,
      graphOptimizationLevel: 'all',
    };

    const [duration, decode] = await Promise.all([
      ort.InferenceSession.create(buffers[0], sessionOptions),
      ort.InferenceSession.create(buffers[1], sessionOptions),
    ]);

    onProgress?.({ status: 'ready' });
    return new InflectTTS(duration, decode, ort, variant, executionProviders[0]);
  }

  // eslint-disable-next-line class-methods-use-this
  list_voices() {
    return INFLECT_VOICES;
  }

  private async synthesizeChunk(
    text: string,
    speed: number,
    variation: number,
    seed: number
  ): Promise<Float32Array> {
    const { Tensor } = this.ort;

    const phonemeText = await phonemizeNormalized(normalizeText(text));
    const { tokens, length, dropped } = phonemesToTokens(phonemeText);
    if (dropped.length) {
      console.warn(`[inflect] dropped ${dropped.length} out-of-vocabulary symbol(s)`);
    }

    const durationOutputs = await this.duration.run({
      tokens: new Tensor('int64', tokens, [1, length]),
      lengths: new Tensor('int64', BigInt64Array.from([BigInt(length)]), [1]),
      length_scale: new Tensor('float32', Float32Array.from([1 / speed]), []),
    });

    const mP = durationOutputs.m_p_exp as OrtTensor;
    const logsP = durationOutputs.logs_p_exp as OrtTensor;
    const yMask = durationOutputs.y_mask as OrtTensor;

    const noiseLength = (mP.data as Float32Array).length;
    const noise = standardNormal(noiseLength, seed);

    const decodeOutputs = await this.decode.run({
      m_p_exp: mP,
      logs_p_exp: logsP,
      y_mask: yMask,
      zp_noise: new Tensor('float32', noise, mP.dims as number[]),
      noise_scale: new Tensor('float32', Float32Array.from([variation]), []),
    });

    const waveform = decodeOutputs.waveform as OrtTensor;
    return edgeFade(Float32Array.from(waveform.data as Float32Array));
  }

  async generate(text: string, options: InflectGenerateOptions = {}): Promise<InflectAudio> {
    const { speed = 1.0, variation = 0.667, seed = 0 } = options;

    const normalized = text.split(/\s+/).filter(Boolean).join(' ');
    if (!normalized) throw new Error('Text must not be empty.');
    if (speed < 0.5 || speed > 2.0) throw new RangeError('speed must be between 0.5 and 2.0');
    if (variation < 0 || variation > 1) {
      throw new RangeError('variation must be between 0.0 and 1.0');
    }

    const chunks = splitText(normalized);
    const pieces: Float32Array[] = [];
    const pauses: number[] = [];

    for (let index = 0; index < chunks.length; index += 1) {
      if (index) pauses.push(boundaryPauseSeconds(chunks[index - 1]));
      try {
        pieces.push(await this.synthesizeChunk(chunks[index], speed, variation, seed + index));
      } catch (error) {
        if (error instanceof UnspeakableTextError) {
          // A chunk of pure punctuation or symbols. Skipping it beats aborting
          // a whole book, but the pause bookkeeping has to stay consistent.
          console.warn(`[inflect] skipping unspeakable chunk: ${JSON.stringify(chunks[index])}`);
          if (index) pauses.pop();
          continue;
        }
        throw error;
      }
    }

    if (!pieces.length) throw new UnspeakableTextError('Nothing speakable in the supplied text.');

    const audio = concatWithPauses(pieces, pauses);
    return {
      audio,
      sampling_rate: SAMPLE_RATE,
      sample_rate: SAMPLE_RATE,
      toWav: () => encodeWav(audio, SAMPLE_RATE),
      toBlob: () => new Blob([encodeWav(audio, SAMPLE_RATE)], { type: 'audio/wav' }),
    };
  }

  async dispose(): Promise<void> {
    await Promise.allSettled([
      (this.duration as any).release?.(),
      (this.decode as any).release?.(),
    ]);
  }
}
