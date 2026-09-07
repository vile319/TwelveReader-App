import { describe, it, expect } from 'vitest';
import { detectSpeechSegments, estimateWordTimings } from '../utils/wordAlign';

const SR = 24000;

/** Sine burst (fake "speech") of given seconds at full-ish scale. */
function tone(seconds: number, freq = 220, amp = 0.5): Float32Array {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

function silence(seconds: number): Float32Array {
  return new Float32Array(Math.floor(seconds * SR));
}

function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Assert every timing sits inside [lo, hi] with tolerance. */
function inside(t: { start: number; end: number }, lo: number, hi: number, tol = 0.1) {
  expect(t.start).toBeGreaterThanOrEqual(lo - tol);
  expect(t.end).toBeLessThanOrEqual(hi + tol);
}

describe('detectSpeechSegments', () => {
  it('finds two bursts separated by silence', () => {
    const audio = concat(tone(1.0), silence(1.0), tone(1.0));
    const segs = detectSpeechSegments(audio, SR);
    expect(segs.length).toBe(2);
    inside(segs[0], 0, 1.0);
    inside(segs[1], 2.0, 3.0);
  });

  it('returns empty for pure silence', () => {
    expect(detectSpeechSegments(silence(2.0), SR)).toEqual([]);
    expect(detectSpeechSegments(new Float32Array(0), SR)).toEqual([]);
  });

  it('bridges stop-consonant-like micro gaps but keeps real pauses', () => {
    // 0.1s gap (< 0.15 merge threshold) vs 0.5s real pause.
    const audio = concat(tone(0.5), silence(0.1), tone(0.5), silence(0.5), tone(0.5));
    const segs = detectSpeechSegments(audio, SR);
    expect(segs.length).toBe(2);
  });
});

describe('estimateWordTimings', () => {
  it('places word boundaries at pause edges instead of smearing across them', () => {
    // "hello" in [0,1s], 1s pause, "world" in [2s,3s], equal word weights.
    // Proportional-by-speech-time puts the boundary at half the speech (1.005s
    // of 2.01s), which lands on the pause END — so "hello" holds through the
    // pause and "world" lights exactly as its speech starts.
    // The old char-proportional code split at 1.375s wall-clock (mid-pause).
    const audio = concat(tone(1.0, 220), silence(1.0), tone(1.0, 300));
    const timings = estimateWordTimings(audio, SR, ['hello', 'world'], 0, 3.0);
    expect(timings.length).toBe(2);
    expect(timings[0].start).toBeCloseTo(0, 1);
    // Snaps to the pause edge (~1.99), NOT mid-pause like the old 1.375.
    expect(timings[0].end).toBeGreaterThan(1.9);
    expect(timings[0].end).toBeLessThanOrEqual(2.05);
    // Words are contiguous: no unowned gaps, no overlaps.
    expect(timings[1].start).toBeCloseTo(timings[0].end, 5);
    // Last word holds through chunk end (existing UX).
    expect(timings[1].end).toBeCloseTo(3.0, 5);
  });

  it('keeps short words inside their own burst when bursts are uneven', () => {
    // 1.5s burst, 0.5s pause, 0.5s burst; equal weights split 2.0s of speech
    // at 1.0s — inside the first burst. Word 0 must not leak past 1.5s.
    const audio = concat(tone(1.5, 220), silence(0.5), tone(0.5, 300));
    const timings = estimateWordTimings(audio, SR, ['hello', 'world'], 0, 2.5);
    expect(timings.length).toBe(2);
    expect(timings[0].start).toBeCloseTo(0, 1);
    expect(timings[0].end).toBeGreaterThan(0.9);
    expect(timings[0].end).toBeLessThan(1.2);
    expect(timings[1].start).toBeCloseTo(timings[0].end, 5);
    expect(timings[1].end).toBeCloseTo(2.5, 5);
  });

  it('skips leading silence and honors the chunk offset', () => {
    const audio = concat(silence(0.5), tone(1.0), silence(0.5));
    const timings = estimateWordTimings(audio, SR, ['one', 'two', 'three'], 10.0, 2.0);
    expect(timings.length).toBe(3);
    // First word starts at speech onset (10.5), not at chunk start (10.0).
    expect(timings[0].start).toBeGreaterThan(10.3);
    for (const t of timings) inside(t, 10.0, 12.0);
    expect(timings[2].end).toBeCloseTo(12.0, 5);
  });

  it('stays monotonic and covers every word', () => {
    const audio = concat(tone(0.4), silence(0.3), tone(0.4), silence(0.3), tone(0.4));
    const words = ['a', 'bb', 'ccc', 'dddd', 'ee'];
    const timings = estimateWordTimings(audio, SR, words, 0, 1.8);
    expect(timings.map((t) => t.word)).toEqual(words);
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].start).toBeGreaterThanOrEqual(timings[i - 1].end - 1e-9);
    }
  });

  it('falls back to an even split on pure silence', () => {
    const timings = estimateWordTimings(silence(2.0), SR, ['a', 'b'], 5.0, 2.0);
    expect(timings.length).toBe(2);
    expect(timings[0].start).toBeCloseTo(5.0, 5);
    expect(timings[1].end).toBeCloseTo(7.0, 5);
  });

  it('handles single word and empty input', () => {
    const audio = concat(silence(0.5), tone(1.0));
    const single = estimateWordTimings(audio, SR, ['hello'], 0, 1.5);
    expect(single.length).toBe(1);
    expect(single[0].start).toBeGreaterThan(0.3);
    expect(single[0].end).toBeCloseTo(1.5, 5);
    expect(estimateWordTimings(audio, SR, [], 0, 1.5)).toEqual([]);
  });
});
