import { describe, expect, it } from "vitest";
import { extractNumbers, introducesNewNumber, normalizeDigits } from "./digits";
import type { Medication, Plan } from "./schema";
import { doseNumbersInQuote, findQuote, normalizeForMatch, quoteIsGrounded, verifyPlan } from "./verify";

const med = (over: Partial<Medication>): Medication => ({
  name: "Metoprolol tartrate",
  strength: "25 mg",
  dose_amount: 1,
  dose_unit: "tablet",
  frequency_verbatim: "twice daily",
  times_per_day: 2,
  as_needed: false,
  slots: ["morning", "evening"],
  with_food: "with_food",
  status: "new",
  duration_verbatim: null,
  source_quote: "Metoprolol tartrate 25 mg - take 1 tablet by mouth twice daily with food",
  source_doc: 0,
  ...over,
});

const transcript =
  "DISCHARGE MEDICATIONS\nNEW: Metoprolol tartrate 25 mg - take 1 tablet by mouth twice daily with food.\n" +
  "STOP: Amlodipine 5 mg daily.\nCall your doctor if you feel dizzy or faint.";

const plan = (meds: Medication[]): Plan => ({
  transcript: [{ doc_index: 0, text: transcript }],
  medications: meds,
  ask_pharmacist: [],
  follow_ups: [],
  warning_signs: [{ text: "Dizziness or fainting", source_quote: "Call your doctor if you feel dizzy or faint" }],
});

describe("digits", () => {
  it("normalizes Gurmukhi, Devanagari, Arabic-Indic and full-width digits", () => {
    expect(normalizeDigits("੫੦੦")).toBe("500");
    expect(normalizeDigits("५००")).toBe("500");
    expect(normalizeDigits("٢٥")).toBe("25");
    expect(normalizeDigits("１２")).toBe("12");
  });
  it("reads decimal commas and halves", () => {
    expect(extractNumbers("2,5 mg")).toEqual(["2.5"]);
    expect(extractNumbers("½ tablet")).toEqual(["0.5"]);
    expect(extractNumbers("1½ tablets")).toEqual(["1.5"]);
  });
  it("flags a translation that adds a number", () => {
    expect(introducesNewNumber("Take with food", "ਭੋਜਨ ਨਾਲ ਲਓ")).toBe(false);
    expect(introducesNewNumber("Take with food", "ਦਿਨ ਵਿੱਚ ੨ ਵਾਰ ਲਓ")).toBe(true);
    expect(introducesNewNumber("25 mg", "੨੫ ਮਿ.ਗ੍ਰਾ.")).toBe(false);
  });
});

describe("grounding", () => {
  it("keeps decimal points and removes punctuation", () => {
    expect(normalizeForMatch("Take 0.5 Tablet, twice!")).toBe("take 0.5 tablet twice");
  });
  it("accepts an exact quote", () => {
    expect(quoteIsGrounded("Metoprolol tartrate 25 mg - take 1 tablet by mouth twice daily with food", transcript)).toBe(true);
  });
  it("accepts a quote with a small transcription slip", () => {
    expect(quoteIsGrounded("Metoprolol tartrate 25 mg take 1 tablet by mouth twice daily wth food", transcript)).toBe(true);
  });
  it("rejects an invented sentence", () => {
    expect(quoteIsGrounded("Aspirin 500 mg take 1 tablet every morning", transcript)).toBe(false);
  });
  it("requires dose numbers to appear in the quote", () => {
    expect(doseNumbersInQuote(med({}))).toBe(true);
    expect(doseNumbersInQuote(med({ strength: "50 mg" }))).toBe(false);
  });
});

describe("verifyPlan", () => {
  it("keeps a grounded medication on the schedule", () => {
    const v = verifyPlan(plan([med({})]));
    expect(v.verified_medications).toHaveLength(1);
    expect(v.failures).toHaveLength(0);
  });
  it("moves an invented medication to the pharmacist list", () => {
    const fake = med({ name: "Aspirin", strength: "500 mg", source_quote: "Aspirin 500 mg every morning" });
    const v = verifyPlan(plan([med({}), fake]));
    expect(v.verified_medications.map((m) => m.name)).toEqual(["Metoprolol tartrate"]);
    expect(v.ask_pharmacist.some((q) => q.kind === "unverified" && q.issue.includes("Aspirin"))).toBe(true);
  });
  it("moves a medication whose dose was changed", () => {
    const v = verifyPlan(plan([med({ strength: "50 mg" })]));
    expect(v.verified_medications).toHaveLength(0);
    expect(v.failures[0].reason).toMatch(/dose numbers/);
  });
  it("accepts a dose written later on the same line as the name", () => {
    const p = plan([]);
    p.transcript[0].text += "\nCHANGED: Atorvastatin - dose increased. Now take 40 mg (1 tablet) at bedtime.";
    p.medications = [med({ name: "Atorvastatin", strength: "40 mg", source_quote: "Atorvastatin - dose increased." })];
    expect(verifyPlan(p).verified_medications).toHaveLength(1);
  });
  it("accepts a pill label with the brand and strength on adjacent lines", () => {
    const p = plan([]);
    p.transcript.push({
      doc_index: 1,
      text: "Extra Strength TYLENOL\nAcetaminophen 500 mg caplets\nDirections: adults take 2 caplets every 6 hours.",
    });
    p.medications = [
      med({ name: "TYLENOL", strength: "500 mg", dose_amount: 2, source_quote: "Extra Strength TYLENOL", source_doc: 1 }),
    ];
    expect(verifyPlan(p).verified_medications).toHaveLength(1);
  });
  it("rejects a quote where Claude changed a number (25 mg -> 50 mg)", () => {
    const p = plan([]);
    p.medications = [
      med({ strength: "50 mg", source_quote: "Metoprolol tartrate 50 mg - take 1 tablet by mouth twice daily with food" }),
    ];
    expect(verifyPlan(p).verified_medications).toHaveLength(0);
  });
  it("rejects an invented pill count that only appears elsewhere in the papers", () => {
    const p = plan([]);
    p.transcript[0].text += "\nFOLLOW-UP: See your doctor in 2 weeks.";
    p.medications = [med({ dose_amount: 2, source_quote: "Metoprolol tartrate 25 mg - take 1 tablet by mouth twice daily with food" })];
    expect(verifyPlan(p).verified_medications).toHaveLength(0);
  });
  it("does not accept 'a' in 'twice a day' as a pill count of one", () => {
    const p = plan([]);
    p.transcript[0].text = "Lisinopril 10 mg by mouth twice a day.";
    p.medications = [med({ name: "Lisinopril", strength: "10 mg", dose_amount: 1, dose_unit: "tablet", source_quote: "Lisinopril 10 mg by mouth twice a day." })];
    expect(verifyPlan(p).verified_medications).toHaveLength(0);
  });
  it("accepts 'one tablet' and 'a tablet' written in words", () => {
    const p = plan([]);
    p.transcript[0].text = "Lisinopril 10 mg - take one tablet by mouth daily.";
    p.medications = [med({ name: "Lisinopril", strength: "10 mg", dose_amount: 1, dose_unit: "tablet", source_quote: "Lisinopril 10 mg - take one tablet by mouth daily." })];
    expect(verifyPlan(p).verified_medications).toHaveLength(1);
  });
  it("rejects a course length that isn't in the papers", () => {
    const p = plan([]);
    p.medications = [med({ duration_verbatim: "for 3 days" })];
    expect(verifyPlan(p).verified_medications).toHaveLength(0);
  });
  it("still rejects a dose that appears nowhere near the medicine", () => {
    const p = plan([]);
    p.medications = [med({ name: "Metoprolol tartrate", strength: "75 mg", source_quote: "Metoprolol tartrate 25 mg" })];
    expect(verifyPlan(p).verified_medications).toHaveLength(0);
  });
  it("drops warning signs that are not in the documents", () => {
    const p = plan([med({})]);
    p.warning_signs.push({ text: "Rash", source_quote: "Stop if you get a rash" });
    expect(verifyPlan(p).warning_signs).toHaveLength(1);
  });
});

describe("quote matching respects word boundaries", () => {
  it("does not match a truncated number inside a longer one", () => {
    expect(findQuote("Warfarin 5", "Warfarin 50 mg take 1 tablet daily")).toBeNull();
    expect(quoteIsGrounded("Lisinopril take 1", "Lisinopril take 10 mg daily")).toBe(false);
  });
  it("still matches a whole-word quote", () => {
    expect(quoteIsGrounded("Warfarin 5 mg", "Warfarin 5 mg take 1 tablet daily")).toBe(true);
  });
  it("rejects a medicine whose strength was truncated mid-number", () => {
    const p = plan([]);
    p.transcript[0].text = "Warfarin 50 mg - take 1 tablet by mouth daily.";
    p.medications = [med({ name: "Warfarin", strength: "5 mg", source_quote: "Warfarin 5", dose_amount: 1 })];
    expect(verifyPlan(p).verified_medications).toHaveLength(0);
  });
});
