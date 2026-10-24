// Turns digits written in any script into plain ASCII digits so code can compare them.
// Example: Gurmukhi "੫੦੦" and Devanagari "५००" both become "500".

// Code points of the digit "zero" in each script we expect. Every script's digits 0-9
// are 10 consecutive code points starting at its zero.
const ZEROS = [
  0x30, // ASCII 0-9
  0x660, // Arabic-Indic
  0x6f0, // Extended Arabic-Indic (Persian, Urdu)
  0x966, // Devanagari (Hindi)
  0xa66, // Gurmukhi (Punjabi)
  0xff10, // Full-width (Chinese, Japanese text)
];

function toAsciiDigit(ch: string): string {
  const cp = ch.codePointAt(0)!;
  for (const zero of ZEROS) {
    if (cp >= zero && cp <= zero + 9) return String(cp - zero);
  }
  return ch;
}

/** Replace every digit from a supported script with its ASCII digit, and ½ with .5. */
export function normalizeDigits(text: string): string {
  return text
    .replace(/\p{Nd}/gu, toAsciiDigit)
    .replace(/(\d)\s*½/g, "$1.5") // "1½" -> "1.5"
    .replace(/½/g, "0.5"); // "½" -> "0.5"
}

/**
 * All numbers in a string, as normalized strings.
 * "1,5 mg" and "1.5 mg" both give ["1.5"]; "500mg twice" gives ["500"].
 */
export function extractNumbers(text: string): string[] {
  const normalized = normalizeDigits(text)
    // thousands separators: "1,000" / "5,000" / "1,000,000" -> 1000 / 5000 / 1000000
    // (a leading 0 is a decimal comma instead: "0,125" is 0.125, handled below)
    .replace(/(?<![\d.,])([1-9]\d{0,2})((?:,\d{3})+)(?![\d])/g, (_m, head: string, rest: string) => head + rest.replace(/,/g, ""))
    // decimal comma between digits ("2,5" -> "2.5", "0,125" -> "0.125")
    .replace(/(\d),(\d)/g, "$1.$2");
  const matches = normalized.match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.map((n) => String(Number(n)));
}

/**
 * True if `translated` contains a number that `english` does not.
 * Used after translation: a translation must never introduce a new number.
 */
export function introducesNewNumber(english: string, translated: string): boolean {
  const allowed = new Set(extractNumbers(english));
  return extractNumbers(translated).some((n) => !allowed.has(n));
}
