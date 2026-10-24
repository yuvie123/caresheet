// The exact shape Claude must return. Structured outputs guarantee the response matches it,
// and zod gives us TypeScript types for free.
import { z } from "zod";

export const SLOTS = ["morning", "noon", "evening", "bedtime"] as const;

export const Medication = z.object({
  name: z.string().describe("Medication name exactly as written, e.g. 'Metoprolol tartrate'"),
  strength: z.string().nullable().describe("Strength as written, e.g. '25 mg'. null if not stated"),
  dose_amount: z.number().nullable().describe("How many units per dose, e.g. 1 for '1 tablet'. null if not stated"),
  dose_unit: z.string().nullable().describe("Unit of one dose, e.g. 'tablet', 'puff', 'mL'. null if not stated"),
  frequency_verbatim: z.string().describe("Frequency exactly as written, e.g. 'twice daily'"),
  times_per_day: z.number().int().nullable().describe("Doses per day if the sheet makes it unambiguous, else null"),
  as_needed: z.boolean().describe("true only if the sheet says as needed / PRN"),
  slots: z.array(z.enum(SLOTS)).describe("Suggested times of day; empty if as_needed or unclear"),
  with_food: z.enum(["with_food", "empty_stomach", "not_stated"]),
  status: z
    .enum(["new", "changed", "continue", "stop", "unclear"])
    .describe("From the discharge sheet's reconciliation: new, changed dose, continue as before, STOP taking"),
  duration_verbatim: z.string().nullable().describe("e.g. 'for 7 days', null if not stated"),
  source_quote: z.string().describe("The exact sentence from the document this item comes from, copied verbatim"),
  source_doc: z.number().int().describe("Index of the document the quote comes from"),
});

export const PharmacistItem = z.object({
  kind: z.enum(["duplicate", "mismatch", "illegible", "unclear", "conflict", "unverified"]),
  issue: z.string().describe("One plain-English question for the pharmacist"),
  quotes: z.array(z.string()).describe("Verbatim text from the documents this question is about"),
});

export const QuotedNote = z.object({
  text: z.string().describe("Plain-English restatement"),
  source_quote: z.string().describe("Verbatim text it came from"),
});

export const Plan = z.object({
  transcript: z
    .array(z.object({ doc_index: z.number().int(), text: z.string() }))
    .describe("Verbatim transcription of every document, in order"),
  medications: z.array(Medication),
  ask_pharmacist: z.array(PharmacistItem),
  follow_ups: z.array(QuotedNote).describe("Appointments, tests, activity limits"),
  warning_signs: z.array(QuotedNote).describe("Symptoms the sheet says to watch for or call about"),
});

export type Medication = z.infer<typeof Medication>;
export type PharmacistItem = z.infer<typeof PharmacistItem>;
export type QuotedNote = z.infer<typeof QuotedNote>;
export type Plan = z.infer<typeof Plan>;
export type Slot = (typeof SLOTS)[number];
