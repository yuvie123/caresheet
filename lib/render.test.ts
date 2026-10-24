import { describe, expect, it } from "vitest";
import type { PlanResult } from "./claude";
import { activeOnDay, cadenceUnclear, durationDays, everyNDays, scheduledMeds, unscheduledMeds } from "./render";
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
