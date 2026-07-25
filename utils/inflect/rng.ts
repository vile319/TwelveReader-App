/**
 * Seeded Gaussian noise for Inflect's latent sampler.
 *
 * The Python reference uses `np.random.default_rng(seed).standard_normal(...)`,
 * which is PCG64 feeding numpy's ziggurat sampler. Reproducing that bit-exactly
 * in JS would mean porting both, and it buys nothing here: the noise is an
 * i.i.d. standard normal draw, so any correctly-distributed source gives
 * equally valid speech.
 *
 * The practical consequence, and it is worth being clear about it:
 *   - A given seed is reproducible WITHIN TwelveReader (same seed -> same audio).
 *   - A given seed will NOT match the audio the Python reference produces.
 *
 * Everything else in the pipeline is numerically faithful; only the latent
 * draw differs, the same way two runs with different seeds would.
 */

/** splitmix32 — small, fast, and well-distributed enough for this. */
function splitmix32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 4294967296;
  };
}

/**
 * Fills a Float32Array with standard normal samples using the polar
 * (Marsaglia) form of Box-Muller, which avoids trig calls.
 */
export function standardNormal(length: number, seed: number): Float32Array {
  const next = splitmix32(seed);
  const output = new Float32Array(length);

  let index = 0;
  while (index < length) {
    let u: number;
    let v: number;
    let s: number;
    do {
      u = next() * 2 - 1;
      v = next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const factor = Math.sqrt((-2 * Math.log(s)) / s);
    output[index] = u * factor;
    index += 1;
    if (index < length) {
      output[index] = v * factor;
      index += 1;
    }
  }

  return output;
}
