import { describe, expect, it } from "vitest";
import type { PlanResult } from "./claude";
import { buildIcs } from "./ics";
import type { Medication } from "./schema";

const med = (over: Partial<Medication>): Medication => ({
  name: "Metoprolol tartrate", strength: "25 mg", dose_amount: 1, dose_unit: "tablet",
  frequency_verbatim: "twice daily", times_per_day: 2, as_needed: false, slots: ["morning", "evening"],
  with_food: "with_food", status: "new", duration_verbatim: null, source_quote: "x", source_doc: 0, ...over,
});
const plan = (meds: Medication[]) =>
  ({ verified_medications: meds, medications: meds, transcript: [], ask_pharmacist: [], follow_ups: [],
     warning_signs: [], failures: [], first_failures: [], retried: false, model: "test" }) as PlanResult;

describe("calendar reminders", () => {
  const start = new Date(2026, 9, 24);
  it("creates one reminder per time of day per day", () => {
    const ics = buildIcs(plan([med({})]), start);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(14); // morning + evening, 7 days
    expect(ics).toContain("DTSTART:20261024T080000");
    expect(ics).toContain("DTSTART:20261030T180000");
    expect(ics).toContain("BEGIN:VALARM");
  });
  it("stops reminders after a 'for 5 days' medicine ends", () => {
    const ics = buildIcs(plan([med({ name: "Furosemide", slots: ["morning"], duration_verbatim: "for 5 days, then stop" })]), start);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(5);
  });
  it("treats 'every 2 days' as every other day, not a 2-day course", () => {
    const ics = buildIcs(plan([med({ slots: ["morning"], frequency_verbatim: "every 2 days", duration_verbatim: null })]), start);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4); // days 1, 3, 5, 7
    const other = buildIcs(plan([med({ slots: ["morning"], frequency_verbatim: "every other day" })]), start);
    expect(other.match(/BEGIN:VEVENT/g)).toHaveLength(4);
  });
  it("never includes stopped or as-needed medicines", () => {
    const ics = buildIcs(plan([med({ name: "Amlodipine", status: "stop" }), med({ name: "Acetaminophen", as_needed: true, slots: [] })]), start);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
  it("folds long lines to the iCalendar limit", () => {
    const ics = buildIcs(plan([med({ name: "A very long medicine name ".repeat(6) })]), start);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
