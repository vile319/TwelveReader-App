/**
 * Exact port of `runtime/text/symbols.py` from owensong/Inflect-Micro-v2.
 *
 * Source (Tacotron lineage, via VITS):
 *   _pad         = '_'
 *   _punctuation = ';:,.!?¡¿—…"«»“” '
 *   _letters     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
 *   _letters_ipa = "ɑɐɒæ...↓↑→↗↘'̩'ᵻ"
 *   symbols      = [_pad] + list(_punctuation) + list(_letters) + list(_letters_ipa)
 *
 * IMPORTANT QUIRK — do not "fix" this:
 * `_letters_ipa` contains the ASCII apostrophe TWICE (at list positions 174 and
 * 176, around the U+0329 combining vertical line below). The Python reference
 * builds its lookup with
 *
 *     SYMBOL_TO_ID = {symbol: index for index, symbol in enumerate(symbols)}
 *
 * so the *later* index wins and "'" maps to 176, not 174. The symbols list has
 * 178 entries but the map has only 177 keys. We reproduce that exactly, because
 * the embedding table was trained against these IDs.
 */

const PAD = '_';
const PUNCTUATION = ';:,.!?¡¿—…"«»“” ';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// Note the trailing sequence: U+0027, U+0329 (combining vertical line below),
// U+0027, U+1D7B. Written with escapes so no editor can silently normalise it.
const LETTERS_IPA =
  'ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘' +
  '\u0027\u0329\u0027\u1D7B';

/** 178 entries, positionally identical to the Python `symbols` list. */
export const SYMBOLS: readonly string[] = Object.freeze([
  PAD,
  // Spread (not split) so we iterate code points, matching Python's list().
  ...PUNCTUATION,
  ...LETTERS,
  ...LETTERS_IPA,
]);

/**
 * 177 entries. Built last-wins, exactly like the Python dict comprehension.
 */
export const SYMBOL_TO_ID: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  SYMBOLS.forEach((symbol, index) => map.set(symbol, index));
  return map;
})();

export const SPACE_ID = SYMBOLS.indexOf(' ');

export const SAMPLE_RATE = 24_000;

export class UnspeakableTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnspeakableTextError';
  }
}

/**
 * Port of `phonemes_to_tokens` in onnx/inference_onnx.py.
 *
 * The Python version indexes SYMBOL_TO_ID directly and throws KeyError on an
 * unknown character. espeak-ng in the browser can emit a slightly different
 * inventory than the Linux build the model shipped against (language-switch
 * flags, rare diacritics), and a hard crash mid-book is a much worse outcome
 * than dropping one phone, so unknown symbols are skipped and reported.
 *
 * `add_blank` is true in config.json, so tokens are interleaved with the pad
 * symbol: [0, t0, 0, t1, 0, ..., 0], length 2n + 1.
 */
export function phonemesToTokens(phonemeText: string): {
  tokens: BigInt64Array;
  length: number;
  dropped: string[];
} {
  const sequence: number[] = [];
  const dropped: string[] = [];

  for (const symbol of phonemeText) {
    const id = SYMBOL_TO_ID.get(symbol);
    if (id === undefined) {
      dropped.push(symbol);
      continue;
    }
    sequence.push(id);
  }

  if (sequence.length === 0) {
    throw new UnspeakableTextError('The text frontend produced no speakable tokens.');
  }

  const withBlanks = new BigInt64Array(sequence.length * 2 + 1);
  for (let i = 0; i < sequence.length; i += 1) {
    withBlanks[i * 2 + 1] = BigInt(sequence[i]);
  }

  return { tokens: withBlanks, length: withBlanks.length, dropped };
}
