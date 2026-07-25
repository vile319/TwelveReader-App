/**
 * Minimal English number speller matching the subset of `num2words` that the
 * Inflect frontend actually uses: `num2words(n)` and `num2words(n, to="ordinal")`.
 *
 * num2words' en locale is British-style: it inserts "and" before a trailing
 * sub-hundred group and joins higher groups with ", ".
 *
 *   101      -> "one hundred and one"
 *   1001     -> "one thousand and one"
 *   1100     -> "one thousand, one hundred"
 *   1234     -> "one thousand, two hundred and thirty-four"
 *   2024     -> "two thousand and twenty-four"
 *   1234567  -> "one million, two hundred and thirty-four thousand, five hundred and sixty-seven"
 *
 * The caller (`_words`) then strips hyphens and commas, so the punctuation only
 * matters for word ordering — but the "and" placement is audible, so it is
 * reproduced faithfully.
 */

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
];

// Enough headroom for anything a book will contain; larger values fall back to
// digit-by-digit reading in the normalizer anyway.
const SCALES = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion'];

const ORDINAL_OVERRIDES: Record<string, string> = {
  one: 'first',
  two: 'second',
  three: 'third',
  four: 'fourth',
  five: 'fifth',
  six: 'sixth',
  seven: 'seventh',
  eight: 'eighth',
  nine: 'ninth',
  ten: 'tenth',
  eleven: 'eleventh',
  twelve: 'twelfth',
  twenty: 'twentieth',
  thirty: 'thirtieth',
  forty: 'fortieth',
  fifty: 'fiftieth',
  sixty: 'sixtieth',
  seventy: 'seventieth',
  eighty: 'eightieth',
  ninety: 'ninetieth',
  hundred: 'hundredth',
  thousand: 'thousandth',
  million: 'millionth',
  billion: 'billionth',
  trillion: 'trillionth',
  zero: 'zeroth',
};

/** 1..99 */
function underHundred(value: number): string {
  if (value < 20) return ONES[value];
  const tens = Math.floor(value / 10);
  const unit = value % 10;
  return unit ? `${TENS[tens]}-${ONES[unit]}` : TENS[tens];
}

/** 1..999 */
function underThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (!hundreds) return underHundred(value);
  const head = `${ONES[hundreds]} hundred`;
  return remainder ? `${head} and ${underHundred(remainder)}` : head;
}

export function cardinal(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError(`Cannot spell ${value}`);
  const rounded = Math.trunc(value);
  if (rounded === 0) return 'zero';
  if (rounded < 0) return `minus ${cardinal(-rounded)}`;

  // Split into 3-digit groups, least significant first.
  const groups: number[] = [];
  let remaining = rounded;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  if (groups.length > SCALES.length) {
    throw new RangeError(`Number too large to spell: ${value}`);
  }

  const parts: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (!group) continue;
    parts.push(`${underThousand(group)}${SCALES[index]}`);
  }

  // num2words joins with ", " but uses " and " when the final group is a bare
  // sub-hundred value hanging off something larger.
  const last = groups[0];
  if (parts.length > 1 && last > 0 && last < 100) {
    const tail = parts.pop() as string;
    return `${parts.join(', ')} and ${tail}`;
  }
  return parts.join(', ');
}

export function ordinal(value: number): string {
  const words = cardinal(value);
  // Replace the final word (which may be hyphen-attached, e.g. "twenty-one").
  const match = /([A-Za-z]+)$/.exec(words);
  if (!match) return words;
  const finalWord = match[1];
  const replacement = ORDINAL_OVERRIDES[finalWord] ?? `${finalWord}th`;
  return words.slice(0, match.index) + replacement;
}

/** Port of `_words(value, ordinal=...)` — spelling, then hyphen/comma stripping. */
export function words(value: number, asOrdinal = false): string {
  const text = asOrdinal ? ordinal(value) : cardinal(value);
  return text.split('-').join(' ').split(',').join('');
}

/** Port of `_digit_words` — read every digit individually. */
export function digitWords(text: string): string {
  const out: string[] = [];
  for (const character of text) {
    if (character >= '0' && character <= '9') out.push(words(Number(character)));
  }
  return out.join(' ');
}

/** Port of `_identifier_digits` — like digitWords but non-leading 0 becomes "oh". */
export function identifierDigits(text: string): string {
  const out: string[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character < '0' || character > '9') continue;
    out.push(character === '0' && index > 0 ? 'oh' : words(Number(character)));
  }
  return out.join(' ');
}
