// The deterministic safety layer: plain code that double-checks Claude's answer.
// Nothing in here calls an AI. If Claude invents a medication or a dose, these checks catch it
// and move the item to "Ask your pharmacist" instead of the schedule.
import { extractNumbers, normalizeDigits } from "./digits";
import type { Medication, PharmacistItem, Plan } from "./schema";

/** Lowercase, plain digits, punctuation removed, single spaces. Decimal points inside numbers are kept. */
export function normalizeForMatch(text: string): string {
  return normalizeDigits(text)
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, "$1DOT$2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/DOT/gi, ".")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Finds `quote` in `transcript` and returns the matching stretch of the transcript (normalized), or null.
 * Exact match first; otherwise the best stretch of the same length where at least `threshold` of the
 * quote's words appear (tolerates small transcription slips).
 */
export function findQuote(quote: string, transcript: string, threshold = 0.85): string | null {
  const q = normalizeForMatch(quote);
  const t = normalizeForMatch(transcript);
  if (!q) return null;
  // Whole words only: "warfarin 5" must NOT match inside "warfarin 50".
  if (` ${t} `.includes(` ${q} `)) return q;

  const qWords = q.split(" ");
  const tWords = t.split(" ");
  const n = qWords.length;
  if (tWords.length === 0) return null;

  let best = 0;
  let bestStart = 0;
  const windowSize = Math.min(n, tWords.length);
  for (let start = 0; start + windowSize <= tWords.length; start++) {
    const pool = new Map<string, number>();
    for (const w of tWords.slice(start, start + windowSize)) pool.set(w, (pool.get(w) ?? 0) + 1);
    let hits = 0;
    for (const w of qWords) {
      const c = pool.get(w) ?? 0;
      if (c > 0) {
        hits++;
        pool.set(w, c - 1);
      }
    }
    if (hits / n > best) {
      best = hits / n;
      bestStart = start;
    }
  }
  return best >= threshold ? tWords.slice(bestStart, bestStart + windowSize).join(" ") : null;
}

/**
 * Does `quote` really appear in `transcript`? The words must match (allowing small slips) AND every
 * number in the quote must appear in the matching stretch. A quote where Claude changed "25" to "50"
 * matches 9 of 10 words, so the number check is what catches it.
 */
export function quoteIsGrounded(quote: string, transcript: string, threshold = 0.85): boolean {
  const match = findQuote(quote, transcript, threshold);
  if (match === null) return false;
  const have = new Set(extractNumbers(match));
  return extractNumbers(quote).every((n) => have.has(n));
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

function unitStem(unit: string | null): string | null {
  const stem = (unit ?? "").toLowerCase().replace(/s$/, "").replace(/[^a-z]/g, "");
  return stem || null;
}

/**
 * True if `n` appears as a number in `text`, or is written as a word right before the dose unit:
 * "one/a/an tablet", "two tablets", "half a tablet". Anchored to the unit so the "a" in "twice a day"
 * and the "two" in "two weeks" don't count.
 */
function hasNumber(n: string, text: string, unit: string | null): boolean {
  if (extractNumbers(text).includes(n)) return true;
  const stem = unitStem(unit);
  if (!stem) return false;
  const u = `(?:[a-z-]+\\s+)?${stem}`;
  if (n === "1" && new RegExp(`\\b(one|a|an|single)\\s+${u}`, "i").test(text)) return true;
  const i = Number(n);
  if (Number.isInteger(i) && i >= 2 && i <= 12 && new RegExp(`\\b${WORDS[i]}\\s+${u}`, "i").test(text)) return true;
  if (n === "0.5" && new RegExp(`\\b(half|one[- ]half)\\s+(?:of\\s+)?(?:a\\s+|an\\s+)?${u}`, "i").test(text)) return true;
  return false;
}

/**
 * A range written next to the dose unit ("1 to 2 tablets", "1-2 caplets", "1 or 2 tablets"). A single
 * dose_amount can't represent it, and picking one end is a dosing decision CareSheet must not make.
 */
function doseRangeNear(med: Medication, texts: string[]): string | null {
  const stem = unitStem(med.dose_unit);
  const unit = stem ? `(?:[a-z-]+\\s+)?${stem}` : "(?:tablet|capsule|caplet|pill|puff|drop|spray|patch|ml|unit|teaspoon|tsp|tablespoon|tbsp)";
  const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:to|-|–|—|or)\\s*(\\d+(?:\\.\\d+)?)\\s+${unit}`, "i");
  for (const t of texts) {
    const m = normalizeDigits(t).match(re);
    if (m) return `${m[1]} to ${m[2]}`;
  }
  return null;
}

/** Every number shown to the family for this medicine. */
function requiredNumbers(med: Medication): { n: string; nearName: "strength" | "other" }[] {
  return [
    ...extractNumbers(med.strength ?? "").map((n) => ({ n, nearName: "strength" as const })),
    ...(med.dose_amount !== null ? [{ n: String(med.dose_amount), nearName: "other" as const }] : []),
    ...extractNumbers(med.frequency_verbatim).map((n) => ({ n, nearName: "other" as const })),
    ...extractNumbers(med.duration_verbatim ?? "").map((n) => ({ n, nearName: "other" as const })),
  ];
}

/** Every number in the medication's strength and dose amount must also appear in its quote. */
export function doseNumbersInQuote(med: Medication): boolean {
  return requiredNumbers(med)
    .filter((r) => r.nearName === "strength" || r.n === String(med.dose_amount))
    .every((r) => hasNumber(r.n, med.source_quote, med.dose_unit));
}

/**
 * Every number the family will see (strength, pill count, frequency, course length) must be written
 * in the papers right where this medicine is: in the matched quote, or on the line naming the medicine
 * (strength: that line or the next; other numbers: up to two lines after). Handles "Atorvastatin - dose
 * increased. Now take 40 mg" and pill labels with the brand, strength and directions on separate lines,
 * but rejects a number that only appears somewhere else (e.g. "follow up in 2 weeks").
 */
const STRENGTH = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ml|units?|iu|meq|%)\b/i;
const LIST_MARKER = /^\s*(?:[-•*·–—]|\d+[.)]\s)/;

/**
 * The text that belongs to the medicine named on line `i`: that line plus up to `extra` following lines,
 * stopping at the next list item or at any line carrying its own strength (a different medicine). Keeps
 * "Metformin ... with breakfast and / dinner." together but not Metformin + the Acetaminophen line below,
 * while still joining a pill label's brand line to the strength and directions lines under it.
 */
function medicineBlock(lines: string[], i: number, extra: number): string {
  let text = lines[i];
  for (let k = 1; k <= extra && i + k < lines.length; k++) {
    const next = lines[i + k];
    if (!next.trim() || LIST_MARKER.test(next)) break;
    if (STRENGTH.test(text) && STRENGTH.test(next)) break;
    text += " " + next;
  }
  return text;
}

/** The block of text for each place the medicine is named. */
function linesNaming(med: Medication, doc: string): string[] {
  const lines = doc.split(/\r?\n/);
  const words = normalizeForMatch(med.name).split(" ").filter((w) => w.length > 2);
  const out: string[] = [];
  lines.forEach((l, i) => {
    if (words.some((w) => normalizeForMatch(l).includes(w))) out.push(medicineBlock(lines, i, 2));
  });
  return out;
}

export function numbersGrounded(med: Medication, matchedQuote: string, doc: string): boolean {
  const required = requiredNumbers(med);
  const lines = doc.split(/\r?\n/);
  const nameWords = normalizeForMatch(med.name).split(" ").filter((w) => w.length > 2);
  const windows: { strength: string; other: string }[] = [{ strength: matchedQuote, other: matchedQuote }];
  for (let i = 0; i < lines.length; i++) {
    const line = normalizeForMatch(lines[i]);
    if (!nameWords.some((w) => line.includes(w))) continue;
    windows.push({
      strength: `${matchedQuote} ${medicineBlock(lines, i, 1)}`,
      other: `${matchedQuote} ${medicineBlock(lines, i, 2)}`,
    });
  }
  return windows.some((w) =>
    required.every((r) => hasNumber(r.n, r.nearName === "strength" ? w.strength : w.other, med.dose_unit)),
  );
}

/** A multi-step schedule: the word "taper", or "then" followed by a next dose ("then 20 mg"), not "then stop". */
export function isTaper(m: Medication): boolean {
  return /taper|\bthen\s+(?:take\s+|reduce\s+to\s+|decrease\s+to\s+|increase\s+to\s+)?(?:\d|half|one|two|three)/i.test(
    `${m.duration_verbatim ?? ""} ${m.frequency_verbatim}`,
  );
}

export type VerifyFailure = { medication: string; reason: string };

export type VerifiedPlan = Plan & {
  /** Medications that passed every check. Only these may appear on the schedule. */
  verified_medications: Medication[];
  failures: VerifyFailure[];
};

/** Run every check. Failed medications are removed from the schedule and turned into pharmacist questions. */
export function verifyPlan(plan: Plan): VerifiedPlan {
  const fullTranscript = plan.transcript.map((d) => d.text).join("\n");
  const verified: Medication[] = [];
  const failures: VerifyFailure[] = [];
  const extraQuestions: PharmacistItem[] = [];

  for (const med of plan.medications) {
    const doc = plan.transcript.find((d) => d.doc_index === med.source_doc)?.text ?? fullTranscript;
    let reason: string | null = null;
    const inDoc = quoteIsGrounded(med.source_quote, doc);
    const matched = inDoc ? findQuote(med.source_quote, doc) : findQuote(med.source_quote, fullTranscript);
    if (!med.source_quote.trim()) reason = "no source sentence was given";
    else if (!inDoc && !quoteIsGrounded(med.source_quote, fullTranscript))
      reason = "the quoted sentence could not be found in the documents";
    else if (med.dose_amount !== null && doseRangeNear(med, [matched ?? "", ...linesNaming(med, inDoc ? doc : fullTranscript)]))
      reason = `the papers give a range (${doseRangeNear(med, [matched ?? "", ...linesNaming(med, inDoc ? doc : fullTranscript)])}), so CareSheet won't pick one number`;
    else if (!numbersGrounded(med, matched ?? "", inDoc ? doc : fullTranscript))
      reason = "the dose numbers do not appear next to this medicine in the documents";
    else if (!quoteIsGrounded(med.name, med.source_quote, 0.5) && !quoteIsGrounded(med.name, fullTranscript, 0.5))
      reason = "the medication name does not appear in the documents";

    if (reason) {
      failures.push({ medication: med.name, reason });
      extraQuestions.push({
        kind: "unverified",
        issue: `Please confirm "${med.name}"${med.strength ? ` ${med.strength}` : ""}: CareSheet could not verify it because ${reason}.`,
        quotes: med.source_quote ? [med.source_quote] : [],
      });
    } else {
      verified.push(med);
    }
  }

  // Automatic pharmacist cards for things the family must not miss, only when no existing card already
  // covers that medicine (so the list stays short).
  const covered = (m: Medication, cards: PharmacistItem[]) => {
    const words = normalizeForMatch(m.name).split(" ").filter((w) => w.length >= 4);
    const q = normalizeForMatch(m.source_quote);
    return cards.some((c) => {
      const issue = c.issue.toLowerCase();
      const quotesMatch = c.quotes.some((x) => {
        const n = normalizeForMatch(x);
        return n === q || (n.length > 12 && q.includes(n)) || (q.length > 12 && n.includes(q));
      });
      return words.some((w) => issue.includes(w)) || quotesMatch;
    });
  };
  const allCards = [...plan.ask_pharmacist, ...extraQuestions];
  for (const m of verified) {
    if (covered(m, allCards)) continue;
    if (m.status === "unclear") {
      const c: PharmacistItem = {
        kind: "unclear",
        issue: `The papers don't say clearly whether to start, change, continue or stop ${m.name}${m.strength ? ` ${m.strength}` : ""}. Please confirm.`,
        quotes: [m.source_quote],
      };
      extraQuestions.push(c);
      allCards.push(c);
    } else if (m.status !== "stop" && isTaper(m)) {
      const c: PharmacistItem = {
        kind: "unclear",
        issue: `${m.name} has more than one step (a taper). CareSheet shows the first step only. Please go through the later steps with the pharmacist.`,
        quotes: [m.source_quote],
      };
      extraQuestions.push(c);
      allCards.push(c);
    }
  }

  // Follow-ups and warning signs must also be grounded; ungrounded ones are dropped silently
  // because they never reach the schedule, but we keep the count for the evals.
  const grounded = <T extends { source_quote: string }>(items: T[]) =>
    items.filter((i) => quoteIsGrounded(i.source_quote, fullTranscript));

  return {
    ...plan,
    follow_ups: grounded(plan.follow_ups),
    warning_signs: grounded(plan.warning_signs),
    ask_pharmacist: [...plan.ask_pharmacist, ...extraQuestions],
    verified_medications: verified,
    failures,
  };
}
