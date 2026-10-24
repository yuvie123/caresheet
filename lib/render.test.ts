import { describe, expect, it } from "vitest";
import type { PlanResult } from "./claude";
import { activeOnDay, cadenceUnclear, daysLabel, durationDays, everyNDays, scheduledMeds, slotWords, TRANSLATE_MAX_KEYS, TRANSLATE_MAX_VALUE, translatableStrings, unscheduledMeds } from "./render";
import type { Medication } from "./schema";

const med = (over: Partial<Medication>): Medication => ({
  name: "X", strength: "10 mg", dose_amount: 1, dose_unit: "tablet", frequency_verbatim: "once daily",
  times_per_day: 1, as_needed: false, slots: ["morning"], with_food: "not_stated", status: "new",
  duration_verbatim: null, source_quote: "x", source_doc: 0, ...over,
});
const plan = (meds: Medication[]) => ({ verified_medications: meds }) as unknown as PlanResult;

describe("durationDays", () => {
  const cases: [string | null, number | null][] = [
    ["for 5 days", 5], ["for 5 days, then stop", 5], ["x 7 days", 7], ["5-day course", 5], ["a 5 day course", 5],
    ["for 2 weeks", 14], ["for 1 week", 7], ["for 1 month", 30], ["40 mg for 3 days, then 20 mg for 3 days, then stop", 6],
    ["until finished", null], ["until the bottle is empty", null], [null, null], ["", null],
    ["for 400 days", null], // implausible, treated as unknown rather than trusted
  ];
  for (const [text, want] of cases) it(`${JSON.stringify(text)} -> ${want}`, () => expect(durationDays(med({ duration_verbatim: text }))).toBe(want));
  it("does not read 'every 2 days' in the frequency as a course length", () => {
    expect(durationDays(med({ frequency_verbatim: "every 2 days", duration_verbatim: null }))).toBeNull();
  });
});

describe("everyNDays and activeOnDay", () => {
  const cases: [string, number][] = [
    ["once daily", 1], ["twice daily", 1], ["every other day", 2], ["every 2 days", 2], ["every 3 days", 3],
    ["every third day", 3], ["once weekly", 7], ["once a week", 7], ["weekly", 7], ["every 2 weeks", 14],
    ["every 48 hours", 2], ["every 8 hours", 1], ["every 6 hours as needed", 1],
  ];
  for (const [f, want] of cases) it(`${f} -> ${want}`, () => expect(everyNDays(med({ frequency_verbatim: f }))).toBe(want));
  it("schedules a weekly medicine on day 1 only", () => {
    const w = med({ frequency_verbatim: "once weekly" });
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => activeOnDay(w, d))).toEqual([true, false, false, false, false, false, false]);
  });
  it("ends a 5-day course after day 5", () => {
    const m = med({ duration_verbatim: "for 5 days" });
    expect([0, 4, 5, 6].map((d) => activeOnDay(m, d))).toEqual([true, true, false, false]);
  });
});

describe("unclear cadence and unscheduled medicines", () => {
  it("flags 'twice weekly' and weekday lists as an unclear cadence", () => {
    for (const f of ["twice weekly", "3 times a week", "Mondays and Thursdays", "on Mon/Wed/Fri"])
      expect(cadenceUnclear(med({ frequency_verbatim: f }))).toBe(true);
    for (const f of ["twice daily", "once weekly", "every other day"]) expect(cadenceUnclear(med({ frequency_verbatim: f }))).toBe(false);
  });
  it("keeps unclear-cadence and slot-less medicines off the organizer and lists them as unscheduled", () => {
    const meds = [
      med({ name: "A" }),
      med({ name: "NoSlots", slots: [], frequency_verbatim: "every 8 hours" }),
      med({ name: "Weekdays", frequency_verbatim: "twice weekly" }),
      med({ name: "Stopped", status: "stop" }),
      med({ name: "Prn", as_needed: true, slots: [] }),
    ];
    expect(scheduledMeds(plan(meds)).map((m) => m.name)).toEqual(["A"]);
    expect(unscheduledMeds(plan(meds)).map((m) => m.name)).toEqual(["NoSlots", "Weekdays"]);
  });
});

describe("translatableStrings stays within the endpoint limits", () => {
  const big = (n: number): PlanResult =>
    ({
      verified_medications: Array.from({ length: n }, (_, i) => med({ name: `Med${i}`, dose_unit: "tablet", duration_verbatim: "for 5 days" })),
      ask_pharmacist: Array.from({ length: 12 }, (_, i) => ({ kind: "unclear", issue: `Question ${i}`, quotes: [] })),
      warning_signs: [{ text: "x".repeat(800), source_quote: "x" }, { text: "Chest pain", source_quote: "x" }],
      follow_ups: [{ text: "See the doctor", source_quote: "x" }],
    }) as unknown as PlanResult;
  for (const n of [1, 12, 40]) {
    it(`${n} medicines: keys valid, values short, count capped`, () => {
      const s = translatableStrings(big(n));
      expect(Object.keys(s).length).toBeLessThanOrEqual(TRANSLATE_MAX_KEYS);
      for (const [k, v] of Object.entries(s)) {
        expect(k).toMatch(/^[a-z_0-9]{1,40}$/);
        expect(v.length).toBeLessThanOrEqual(TRANSLATE_MAX_VALUE);
      }
      expect(Object.keys(s)).toContain("warn_1"); // the short warning still goes through
      expect(Object.keys(s)).not.toContain("warn_0"); // the 800-character one is skipped, not fatal
    });
  }
  it("includes pharmacist questions and skips stopped medicines' lines", () => {
    const p = { ...big(2), verified_medications: [med({ name: "A" }), med({ name: "B", status: "stop" })] } as unknown as PlanResult;
    const keys = Object.keys(translatableStrings(p));
    expect(keys).toContain("pharm_0");
    expect(keys).toContain("freq_0");
    expect(keys).not.toContain("freq_1");
  });
});

describe("daysLabel and slotWords", () => {
  const base = med({ slots: ["morning", "evening"], status: "continue" });

  it("says every day when nothing limits it", () => expect(daysLabel(base)).toBe("Every day"));
  it("says the days of a short course", () => expect(daysLabel(med({ duration_verbatim: "for 5 days" }))).toBe("Days 1 to 5"));
  it("says a one-day course plainly", () => expect(daysLabel(med({ duration_verbatim: "for 1 day" }))).toBe("Day 1 only"));
  it("says a long course in words", () => expect(daysLabel(med({ duration_verbatim: "for 14 days" }))).toBe("Every day for 14 days"));
  it("says every other day", () => expect(daysLabel(med({ frequency_verbatim: "every other day" }))).toBe("Every other day"));
  it("says every 3 days", () => expect(daysLabel(med({ frequency_verbatim: "every 3 days" }))).toBe("Every 3 days"));
  it("says only when needed", () => expect(daysLabel(med({ as_needed: true }))).toBe("Only when needed"));
  it("repeats an unclear cadence in the sheet's own words", () =>
    expect(daysLabel(med({ frequency_verbatim: "twice weekly" }))).toBe("Twice weekly"));
  it("names the times of day", () => {
    expect(slotWords(base)).toBe("Morning and evening");
    expect(slotWords(med({ slots: ["morning", "noon", "bedtime"] }))).toBe("Morning, midday and bedtime");
    expect(slotWords(med({ slots: [] }))).toBe("");
  });
});
