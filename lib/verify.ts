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
 * Does `quote` really appear in `transcript`?
 * Passes if the cleaned quote appears exactly, or if at least `threshold` of its words appear in the
 * best stretch of the transcript that is the same length as the quote (tolerates small OCR slips).
 */
export function quoteIsGrounded(quote: string, transcript: string, threshold = 0.85): boolean {
  const q = normalizeForMatch(quote);
  const t = normalizeForMatch(transcript);
  if (!q) return false;
  if (t.includes(q)) return true;

  const qWords = q.split(" ");
  const tWords = t.split(" ");
  const n = qWords.length;
  if (tWords.length === 0) return false;

  let best = 0;
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
    best = Math.max(best, hits / n);
    if (best >= threshold) return true;
  }
  return best >= threshold;
}

/** Every number in the medication's strength and dose amount must also appear in its quote. */
export function doseNumbersInQuote(med: Medication): boolean {
  const quoteNumbers = new Set(extractNumbers(med.source_quote));
  const doseNumbers = [
    ...extractNumbers(med.strength ?? ""),
    ...(med.dose_amount !== null ? [String(med.dose_amount)] : []),
  ];
  // A dose amount of 1 is often implied ("take one tablet" written as a word); allow word forms.
  return doseNumbers.every((n) => quoteNumbers.has(n) || (n === "1" && /\b(one|a|an)\b/i.test(med.source_quote)));
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
    if (!med.source_quote.trim()) reason = "no source sentence was given";
    else if (!quoteIsGrounded(med.source_quote, doc) && !quoteIsGrounded(med.source_quote, fullTranscript))
      reason = "the quoted sentence could not be found in the documents";
    else if (!doseNumbersInQuote(med)) reason = "the dose numbers do not appear in the quoted sentence";
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
