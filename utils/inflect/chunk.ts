/**
 * Port of the long-text handling in onnx/inference_onnx.py: `split_text`,
 * `boundary_pause_seconds`, and `edge_fade`.
 *
 * Inflect is not a long-form model — it synthesizes punctuation-bounded chunks
 * and stitches them with short silences and 5 ms fades. Getting this wrong is
 * immediately audible as clicks at every join, so it is ported precisely.
 */

import { SAMPLE_RATE } from './symbols';

const DEFAULT_LIMIT = 280;

const PAUSE_SECONDS: Record<string, number> = {
  '?': 0.28,
  '!': 0.24,
  '.': 0.22,
  ';': 0.16,
  ':': 0.13,
  ',': 0.09,
};

/**
 * Equivalent to Python's `re.split(r"(?<=[.!?;:])\s+", text)` but written
 * without a lookbehind. Safari only gained lookbehind support in 16.4 and this
 * app explicitly targets older iPhones, so we split by hand.
 */
function splitAfterSentencePunctuation(text: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let index = 0;

  while (index < text.length) {
    const character = text[index];
    if ('.!?;:'.includes(character)) {
      let cursor = index + 1;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
      if (cursor > index + 1) {
        parts.push(text.slice(start, index + 1));
        start = cursor;
        index = cursor;
        continue;
      }
    }
    index += 1;
  }

  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function splitText(text: string, limit: number = DEFAULT_LIMIT): string[] {
  const normalized = text.split(/\s+/).filter(Boolean).join(' ');
  const sentences = splitAfterSentencePunctuation(normalized);
  const chunks: string[] = [];
  const half = Math.floor(limit / 2);

  for (let sentence of sentences.length ? sentences : [normalized]) {
    while (sentence.length > limit) {
      const search = sentence.slice(0, limit + 1);
      const punctuation = Math.max(
        search.lastIndexOf(','),
        search.lastIndexOf(';'),
        search.lastIndexOf(':')
      );
      let splitAt =
        punctuation >= half ? punctuation + 1 : sentence.lastIndexOf(' ', limit);
      if (splitAt < half) splitAt = limit;
      chunks.push(sentence.slice(0, splitAt).trim());
      sentence = sentence.slice(splitAt).trim();
    }
    if (sentence) chunks.push(sentence);
  }

  return chunks;
}

export function boundaryPauseSeconds(chunk: string): number {
  const trimmed = chunk.replace(/\s+$/, '');
  const ending = trimmed ? trimmed.slice(-1) : '';
  return PAUSE_SECONDS[ending] ?? 0.08;
}

/** 5 ms linear ramp at both ends, in place on a copy. */
export function edgeFade(
  waveform: Float32Array,
  sampleRate: number = SAMPLE_RATE,
  milliseconds = 5
): Float32Array {
  const frames = Math.min(
    Math.round((sampleRate * milliseconds) / 1000),
    Math.floor(waveform.length / 2)
  );
  if (frames <= 0) return waveform;

  // np.linspace(0.0, 1.0, frames, endpoint=True) — note this is [0.] when
  // frames == 1, which is why we materialise the array instead of guessing.
  const ramp = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) ramp[i] = frames === 1 ? 0 : i / (frames - 1);

  const output = new Float32Array(waveform);
  const tail = output.length - frames;
  for (let i = 0; i < frames; i += 1) {
    output[i] *= ramp[i];
    output[tail + i] *= ramp[frames - 1 - i]; // ramp[::-1]
  }
  return output;
}

export function concatWithPauses(
  pieces: Float32Array[],
  pauseSeconds: number[],
  sampleRate: number = SAMPLE_RATE
): Float32Array {
  let total = 0;
  for (const piece of pieces) total += piece.length;
  const pauseFrames = pauseSeconds.map((seconds) => Math.round(sampleRate * seconds));
  for (const frames of pauseFrames) total += frames;

  const output = new Float32Array(total);
  let offset = 0;
  for (let index = 0; index < pieces.length; index += 1) {
    if (index > 0) offset += pauseFrames[index - 1];
    output.set(pieces[index], offset);
    offset += pieces[index].length;
  }

  for (let i = 0; i < output.length; i += 1) {
    if (output[i] > 1) output[i] = 1;
    else if (output[i] < -1) output[i] = -1;
  }
  return output;
}
