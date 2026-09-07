/**
 * Energy-based word timing estimation.
 *
 * Why this exists: none of the synthesis paths provide exact per-word
 * timestamps in practice —
 *   - cloud returns a bare WAV blob (no alignments),
 *   - kokoro-js `generate()` returns audio without word alignments
 *     (the hook's `audioObject.alignments` branch is dead in practice —
 *     no "align" string exists anywhere in the kokoro-js bundle),
 *   - InflectTTS returns waveform only (per-phoneme durations stay inside
 *     the duration ONNX graph and are not exposed as outputs).
 * The old fallback spread words evenly by character count across the whole
 * chunk *including silences*, so highlighting visibly drifted — especially
 * around sentence pauses, and the fixed 250ms trailing-silence guess was
 * wrong more often than right.
 *
 * This module does the next best thing without a forced aligner: it detects
 * actual speech regions (simple energy VAD — TTS audio is clean single-voice,
 * so this is reliable) and distributes words across *speech time only*,
 * proportional to word length. Silences become pauses between words instead
 * of stretching every word. Result: word boundaries snap to real pauses,
 * which is where drift is most visible. Within continuous speech it is still
 * proportional estimation, not ground truth.
 *
 * Pure DSP, zero dependencies, O(n) in samples (a few ms per chunk).
 */

export interface SpeechSegment {
  /** Seconds, relative to the start of the analysed buffer. */
  start: number;
  /** Seconds, relative to the start of the analysed buffer. */
  end: number;
}

export interface EstimatedWordTiming {
  word: string;
  /** Absolute seconds (chunkOffset already applied). */
  start: number;
  /** Absolute seconds (chunkOffset already applied). */
  end: number;
}

const FRAME_SECONDS = 0.02;
const HOP_SECONDS = 0.01;
/** Relative energy gate, as a fraction of the chunk's peak frame energy. */
const RELATIVE_THRESHOLD = 0.1;
/** Absolute floor so digital silence never counts as speech. */
const ABSOLUTE_FLOOR = 0.02;
/** Merge speech across gaps shorter than this (stop consonants, etc). */
const MAX_GAP_SECONDS = 0.15;
/** Drop blips shorter than this (clicks, decoder artifacts). */
const MIN_SEGMENT_SECONDS = 0.06;
/** Never emit a word shorter than this. */
const MIN_WORD_SECONDS = 0.05;

/**
 * Find speech-active regions in mono PCM audio.
 * Times are relative to the buffer start (caller adds any chunk offset).
 */
export function detectSpeechSegments(
  audio: Float32Array,
  sampleRate: number
): SpeechSegment[] {
  if (!audio || audio.length === 0 || !(sampleRate > 0)) return [];

  const frameLen = Math.max(1, Math.floor(FRAME_SECONDS * sampleRate));
  const hop = Math.max(1, Math.floor(HOP_SECONDS * sampleRate));

  // Peak amplitude per frame (cheap; plenty for clean single-voice TTS).
  const peaks: number[] = [];
  for (let i = 0; i < audio.length; i += hop) {
    const end = Math.min(i + frameLen, audio.length);
    let peak = 0;
    for (let j = i; j < end; j++) {
      const abs = Math.abs(audio[j]);
      if (abs > peak) peak = abs;
    }
    peaks.push(peak);
  }
  if (peaks.length === 0) return [];

  let globalPeak = 0;
  for (const p of peaks) if (p > globalPeak) globalPeak = p;
  if (!(globalPeak > 0)) return [];

  const threshold = Math.max(ABSOLUTE_FLOOR, RELATIVE_THRESHOLD * globalPeak);

  // Raw speech runs in frame units, then merge/drop in seconds.
  const segments: SpeechSegment[] = [];
  let runStart = -1;
  for (let f = 0; f <= peaks.length; f++) {
    const isSpeech = f < peaks.length && peaks[f] >= threshold;
    if (isSpeech && runStart < 0) {
      runStart = f;
    } else if (!isSpeech && runStart >= 0) {
      segments.push({
        start: (runStart * hop) / sampleRate,
        end: Math.min(audio.length, f * hop) / sampleRate,
      });
      runStart = -1;
    }
  }

  // Merge across short gaps, drop blips.
  const merged: SpeechSegment[] = [];
  for (const seg of segments) {
    const prev = merged[merged.length - 1];
    if (prev && seg.start - prev.end < MAX_GAP_SECONDS) {
      prev.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged.filter((s) => s.end - s.start >= MIN_SEGMENT_SECONDS);
}

/**
 * Distribute `words` across the speech-active portion of a chunk.
 *
 * @param audio      Chunk PCM (mono).
 * @param sampleRate Hz of `audio`.
 * @param words      Words in the chunk, in order (non-empty recommended).
 * @param chunkOffset Absolute start time of the chunk in the full track.
 * @param chunkDuration Total chunk duration in seconds.
 * @returns Timings in absolute track seconds. The last word holds through
 *          `chunkOffset + chunkDuration` (trailing pause), matching the
 *          previous UX where highlighting rests on the final word.
 */
export function estimateWordTimings(
  audio: Float32Array,
  sampleRate: number,
  words: string[],
  chunkOffset: number,
  chunkDuration: number
): EstimatedWordTiming[] {
  if (!words || words.length === 0) return [];
  if (!(chunkDuration > 0)) return [];

  const chunkEnd = chunkOffset + chunkDuration;
  const segments = detectSpeechSegments(audio, sampleRate);

  // Degenerate input (pure silence / undecodable): even split, old behavior.
  if (segments.length === 0) {
    const per = chunkDuration / words.length;
    return words.map((word, i) => ({
      word,
      start: chunkOffset + i * per,
      end: i === words.length - 1 ? chunkEnd : chunkOffset + (i + 1) * per,
    }));
  }

  const speechTotal = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const weights = words.map((w) => Math.max(1, w.length));
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);

  // Map a cumulative speech-time to buffer-relative audio time.
  const speechToAudio = (t: number): number => {
    const clamped = Math.max(0, Math.min(t, speechTotal));
    let acc = 0;
    for (const seg of segments) {
      const dur = seg.end - seg.start;
      if (clamped <= acc + dur) return seg.start + (clamped - acc);
      acc += dur;
    }
    return segments[segments.length - 1].end;
  };

  const firstSpeechStart = segments[0].start;
  const timings: EstimatedWordTiming[] = [];
  let cursor = 0;
  for (let i = 0; i < words.length; i++) {
    const isLast = i === words.length - 1;
    const dur = Math.max(MIN_WORD_SECONDS, (speechTotal * weights[i]) / weightTotal);
    // First word starts at first speech (skips leading silence); every word
    // starts no earlier than the previous word's end (monotonic).
    const start = Math.max(
      chunkOffset + (i === 0 ? firstSpeechStart : speechToAudio(cursor)),
      i === 0 ? -Infinity : timings[i - 1].end
    );
    cursor += dur;
    const end = isLast ? chunkEnd : chunkOffset + speechToAudio(cursor);
    timings.push({
      word: words[i],
      start: Math.max(chunkOffset, Math.min(start, chunkEnd)),
      end: Math.max(chunkOffset, Math.min(Math.max(end, start), chunkEnd)),
    });
  }
  return timings;
}
