/**
 * Port of `normalize_text` from inflect_nano_v2_frontend.py.
 *
 * This runs BEFORE espeak-ng and does all the work espeak is bad at: money,
 * dates, times, versions, ordinals, acronyms, abbreviations. The ordering of
 * the substitutions is load-bearing — money must expand before the generic
 * number rule, decimals before ordinals, and so on — so the sequence below
 * mirrors the Python line for line.
 */

import { words, digitWords, identifierDigits } from './numbers';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WORD_OVERRIDES: ReadonlyArray<[string, string]> = [
  ['Qwen3', 'Qwen three'],
  ['Qwen', 'Qwen'],
  ['PyTorch', 'pie torch'],
  ['SQLite', 'ess cue lite'],
  ['USB-C', 'you ess bee see'],
  ['RTX 3060', 'ar tee ex thirty sixty'],
  ['RTX 3090', 'ar tee ex thirty ninety'],
  ['RTX 4090', 'ar tee ex forty ninety'],
  ['RTX 5080', 'ar tee ex fifty eighty'],
  ['RTX 5090', 'ar tee ex fifty ninety'],
];

const LETTER_NAMES: Record<string, string> = {
  A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'eff', G: 'gee',
  H: 'aitch', I: 'eye', J: 'jay', K: 'kay', L: 'ell', M: 'em', N: 'en',
  O: 'oh', P: 'pee', Q: 'cue', R: 'ar', S: 'ess', T: 'tee', U: 'you',
  V: 'vee', W: 'double you', X: 'ex', Y: 'why', Z: 'zee',
};

const ABBREVIATIONS: ReadonlyArray<[string, string]> = [
  ['Dr.', 'doctor'],
  ['Mr.', 'mister'],
  ['Mrs.', 'missus'],
  ['Ms.', 'miss'],
  ['Prof.', 'professor'],
  ['St.', 'saint'],
  ['vs.', 'versus'],
  ['etc.', 'et cetera'],
  ['e.g.', 'for example'],
  ['i.e.', 'that is'],
];

/** Port of PUNCT_TRANSLATION (str.maketrans). */
const PUNCT_TRANSLATION: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': ', ',
  '…': '...',
  '(': ', ',
  ')': ', ',
  '[': ', ',
  ']': ', ',
  '{': ', ',
  '}': ', ',
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function translatePunctuation(text: string): string {
  let out = '';
  for (const character of text) {
    out += PUNCT_TRANSLATION[character] ?? character;
  }
  return out;
}

function isValidDate(year: number, month: number, day: number): boolean {
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** Port of `_expand_identifier_token`. */
function expandIdentifierToken(token: string): string {
  const match = /^([A-Za-z]?)(\d+)([A-Za-z]?)$/.exec(token);
  if (!match) return token;
  const [, prefix, digits, suffix] = match;
  const pieces: string[] = [];
  if (prefix) pieces.push(LETTER_NAMES[prefix.toUpperCase()]);
  if (digits.length === 3 || digits.startsWith('0')) {
    pieces.push(identifierDigits(digits));
  } else {
    pieces.push(words(Number(digits)));
  }
  if (suffix) pieces.push(LETTER_NAMES[suffix.toUpperCase()]);
  return pieces.join(' ');
}

/** Port of `_expand_money`. */
function expandMoney(raw: string): string {
  const cleaned = raw.replace(/,/g, '');
  const dotIndex = cleaned.indexOf('.');
  const dollars = dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex);
  let cents = dotIndex === -1 ? '' : cleaned.slice(dotIndex + 1);

  const dollarCount = Number(dollars);
  const parts = [words(dollarCount), dollarCount === 1 ? 'dollar' : 'dollars'];

  if (cents) {
    cents = cents.slice(0, 2).padEnd(2, '0');
    const centCount = Number(cents);
    if (centCount) {
      parts.push('and', words(centCount), centCount === 1 ? 'cent' : 'cents');
    }
  }
  return parts.join(' ');
}

/** Port of `_expand_time`. */
function expandTime(hourText: string, minuteText: string, suffixText?: string): string {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const pieces = [words(hour)];
  if (minute === 0) {
    pieces.push('o clock');
  } else if (minute < 10) {
    pieces.push('oh', words(minute));
  } else {
    pieces.push(words(minute));
  }
  if (suffixText) {
    const suffix = suffixText.toLowerCase().replace(/\./g, '');
    pieces.push(...Array.from(suffix));
  }
  return pieces.join(' ');
}

export function normalizeText(input: string): string {
  let text = translatePunctuation(input);
  text = text.replace(/\s+/g, ' ').trim();

  for (const [source, replacement] of WORD_OVERRIDES) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(source)}\\b`, 'g'), replacement);
  }
  for (const [source, replacement] of ABBREVIATIONS) {
    // Python only anchors the left side, matching e.g. "Dr." but also "Dr.," —
    // the trailing dot is part of the pattern itself.
    text = text.replace(new RegExp(`\\b${escapeRegExp(source)}`, 'gi'), replacement);
  }

  // Dotted initialisms: "U.S.A." -> "U S A"
  text = text.replace(/\b([A-Z])(?:\.([A-Z]))+\./g, (whole) =>
    (whole.match(/[A-Z]/g) ?? []).join(' ')
  );

  // "apartment 4B", "flight 220", ...
  text = text.replace(
    /\b(apartment|apt\.?|suite|unit|room|flight|extension|order|invoice|locker|aisle|gate)\s+([A-Za-z]?\d{1,4}[A-Za-z]?)\b/gi,
    (_whole, label: string, token: string) => `${label} ${expandIdentifierToken(token)}`
  );

  // "742 North ..." -> street number read digit by digit
  text = text.replace(
    /\b(\d{3})(?=\s+(?:North|South|East|West)\b)/gi,
    (_whole, digits: string) => identifierDigits(digits)
  );

  // Money
  text = text.replace(/\$(\d[\d,]*(?:\.\d{1,2})?)/g, (_whole, raw: string) => expandMoney(raw));

  // Slash dates
  text = text.replace(
    /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d{2}|19\d{2})\b/g,
    (whole, monthText: string, dayText: string, yearText: string) => {
      const month = Number(monthText);
      const day = Number(dayText);
      const year = Number(yearText);
      if (!isValidDate(year, month, day)) return whole;
      return `${MONTHS[month - 1]} ${words(day, true)} ${words(year)}`;
    }
  );

  // Clock times, with or without a meridiem
  text = text.replace(
    /\b(\d{1,2}):(\d{2})\s*([AaPp]\.?\s*[Mm]\.?)?\b/g,
    (_whole, hour: string, minute: string, suffix?: string) => expandTime(hour, minute, suffix)
  );

  // Bare "7 pm"
  text = text.replace(
    /\b(\d{1,2})\s*([AaPp]\.?\s*[Mm]\.?)\b/g,
    (_whole, hour: string, suffix: string) => {
      const letters = suffix.replace(/[^A-Za-z]/g, '').toLowerCase();
      return `${words(Number(hour))} ${Array.from(letters).join(' ')}`;
    }
  );

  // Phone tails: "555-0134"
  text = text.replace(
    /\b(\d{3})-(\d{4})\b/g,
    (_whole, left: string, right: string) => `${digitWords(left)}, ${digitWords(right)}`
  );

  // Versions: "1.2.3" -> "one point two point three"
  text = text.replace(/\b\d+(?:\.\d+){2,}\b/g, (whole) =>
    whole.split('.').map((part) => words(Number(part))).join(' point ')
  );

  // Decimals
  text = text.replace(
    /\b(\d+)\.(\d+)\b/g,
    (_whole, whole: string, frac: string) => `${words(Number(whole))} point ${digitWords(frac)}`
  );

  // Ordinals: "21st"
  text = text.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_whole, value: string) =>
    words(Number(value), true)
  );

  // Everything else numeric. Long non-year runs are read digit by digit.
  text = text.replace(/\b\d[\d,]*\b/g, (whole) => {
    const value = whole.replace(/,/g, '');
    if (value.length >= 5 && !value.startsWith('20')) return digitWords(value);
    return words(Number(value));
  });

  // Acronyms: "NASA" -> "en ay ess ay"
  text = text.replace(/\b[A-Z]{2,}\b/g, (acronym) => {
    if (acronym.length <= 1) return acronym;
    return Array.from(acronym).map((ch) => LETTER_NAMES[ch] ?? ch).join(' ');
  });

  // Punctuation tidy-up
  text = text.replace(/,(?:\s*,)+/g, ',');
  text = text.replace(/,\s*([.!?])/g, '$1');
  text = text.replace(/\s+([,;:.!?])/g, '$1');
  text = text.replace(/([,;:.!?])(?=\S)/g, '$1 ');
  return text.replace(/\s+/g, ' ').trim();
}
