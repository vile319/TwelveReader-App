/**
 * espeak-ng phonemization for Inflect, via phonemizer.js.
 *
 * The Python frontend calls phonemizer with:
 *   language="en-us", backend="espeak", strip=True,
 *   preserve_punctuation=True, with_stress=True
 *
 * phonemizer.js (Xenova's WASM build of espeak-ng — already in the tree as a
 * kokoro-js dependency) is configured equivalently by default for en-us and
 * returns one string per input line, so we join its output with spaces.
 */

import { phonemize as espeakPhonemize } from 'phonemizer';
import { SYMBOL_TO_ID } from './symbols';

/**
 * Port of PHONEME_OVERRIDES. The model card notes every entry here is covered
 * by a regression test upstream; these are verified espeak mistakes, not
 * general-purpose fixes.
 */
const PHONEME_OVERRIDES: ReadonlyArray<[string, string]> = [
  ['sˈæskɐtʃˌuːən', 'sɐskˈætʃəwən'],
  ['flʊɹɹˈɛsənt', 'flʊˈɹɛsənt'],
];

function applyPhonemeOverrides(phonemeText: string): string {
  let text = phonemeText;
  for (const [source, replacement] of PHONEME_OVERRIDES) {
    text = text.split(source).join(replacement);
  }
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * espeak can emit language-switch markers like "(en)" or "(fr)" when it hits a
 * foreign-looking word. The Python side passes `language_switch="remove-flags"`;
 * phonemizer.js has no such option, so we strip them here. Left in, they would
 * tokenize as literal parentheses the model has never seen.
 */
function stripLanguageFlags(text: string): string {
  return text.replace(/\([a-z]{2,3}\)/gi, ' ');
}

let warnedAboutDropped = false;

export async function phonemizeNormalized(normalizedText: string): Promise<string> {
  if (!normalizedText.trim()) return '';

  const lines = await espeakPhonemize(normalizedText, 'en-us');
  const joined = Array.isArray(lines) ? lines.join(' ') : String(lines);
  const cleaned = applyPhonemeOverrides(stripLanguageFlags(joined));

  if (!warnedAboutDropped) {
    const unknown = new Set(
      Array.from(cleaned).filter((character) => !SYMBOL_TO_ID.has(character))
    );
    if (unknown.size > 0) {
      warnedAboutDropped = true;
      console.warn(
        '[inflect] espeak produced symbols outside the model vocabulary; they will be dropped:',
        Array.from(unknown).map((c) => `${c} (U+${c.codePointAt(0)!.toString(16).toUpperCase()})`)
      );
    }
  }

  return cleaned;
}
