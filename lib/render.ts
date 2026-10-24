// Turns the structured plan into words. Every number shown to a family is printed by this code
// from Claude's structured fields, never typed by Claude inside a sentence. Translation only ever
// touches the words, so a translation can't change a dose.
import type { Medication, Slot } from "./schema";
import { normalizeForMatch } from "./verify";
import type { PlanResult } from "./claude";

export const SLOT_ORDER: Slot[] = ["morning", "noon", "evening", "bedtime"];

export const UI_STRINGS = {
  slot_morning: "Morning",
  slot_noon: "Midday",
  slot_evening: "Evening",
  slot_bedtime: "Bedtime",
  with_food: "with food",
  empty_stomach: "on an empty stomach",
  as_needed: "Only when needed",
  stop: "Do not take any more",
  sheet_title: "Medicine plan",
  stop_title: "Stopped: do not take",
  as_needed_title: "Only when needed",
  warning_title: "Call the doctor if",
  followup_title: "Appointments and tests",
  not_advice: "Made from the hospital papers. Check with your pharmacist.",
  tick_hint: "Tick a box each time it is taken. A grey box means none that day.",
  day: "Day",
  then_stop: "then stop",
  pharmacist_title: "Questions for the pharmacist",
  page2_title: "Also important",
  confirm_first: "Confirm with the pharmacist first",
  unscheduled_title: "Ask the pharmacist when to take",
} as const;

export type UiKey = keyof typeof UI_STRINGS;

/** "25 mg" / "1 tablet" style pieces, numbers rendered by code. */
export function strengthText(med: Medication): string {
  return med.strength ?? "";
}

export function doseNumber(med: Medication): string {
  if (med.dose_amount === null) return "";
  return String(med.dose_amount);
}

/** "2 caplets", "1 tablet", "0.5 tablet". Empty when the sheet gives no amount ("1 to 2 tablets"). */
export function doseText(med: Medication): string {
  if (med.dose_amount === null || !med.dose_unit) return "";
  const unit = med.dose_amount > 1 && !/s$/i.test(med.dose_unit) ? `${med.dose_unit}s` : med.dose_unit;
  return `${doseNumber(med)} ${unit}`;
}

const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

/**
 * Course length in days from the duration text, e.g. "for 5 days", "5-day course", "for 2 weeks",
 * "40 mg for 3 days, then 20 mg for 3 days" (stages are added up). null = ongoing or unknown.
 * Only reads the duration (never "every 2 days" in the frequency, which is a cadence, not a course).
 */
export function durationDays(med: Medication): number | null {
  const text = med.duration_verbatim ?? "";
  if (/\buntil\b|\bwhile\b/i.test(text) && !/\d/.test(text)) return null;
  let total = 0;
  for (const m of text.matchAll(/(\d+)\s*(?:-|\s)?\s*(day|week|month)s?\b/gi)) {
    total += Number(m[1]) * UNIT_DAYS[m[2].toLowerCase()];
  }
  return total >= 1 && total <= 90 ? total : null;
}

const ORDINAL: Record<string, number> = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7 };

/** How many days between doses: "every other day" 2, "every 3 days" 3, "once weekly" 7, "every 48 hours" 2, else 1. */
export function everyNDays(med: Medication): number {
  const f = med.frequency_verbatim.toLowerCase();
  if (/every\s+other\s+day/.test(f)) return 2;
  const ord = f.match(/every\s+(second|third|fourth|fifth|sixth|seventh)\s+day/);
  if (ord) return ORDINAL[ord[1]];
  const weeks = f.match(/every\s+(\d+)\s*weeks?\b/);
  if (weeks) return 7 * Number(weeks[1]);
  if (/\b(once\s+(a|per)\s+week|once\s+weekly|weekly|every\s+week)\b/.test(f)) return 7;
  const hours = f.match(/every\s+(\d+)\s*(?:hours?|hrs?|h)\b/);
  if (hours && Number(hours[1]) >= 24) return Math.round(Number(hours[1]) / 24);
  const days = f.match(/every\s+(\d+)\s*days?\b/);
  return days && Number(days[1]) > 1 ? Number(days[1]) : 1;
}

/** "twice weekly", "3 times a week", "Mondays and Thursdays": a cadence we can't place on a 7-day grid. */
export function cadenceUnclear(med: Medication): boolean {
  const f = med.frequency_verbatim.toLowerCase();
  const weekday = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(day|days|s)?\b/;
  const multiWeekly = /\b(twice|two|2|three|3|four|4)\s*(times)?\s*(a|per|each|\/)?\s*week(ly)?\b|\b(twice|biweekly)\b.*\bweek/;
  return weekday.test(f) || multiWeekly.test(f);
}

/** Is this medicine taken on day `dayIndex` (0 = first day home)? */
export function activeOnDay(med: Medication, dayIndex: number): boolean {
  const d = durationDays(med);
  if (d !== null && dayIndex >= d) return false;
  return dayIndex % everyNDays(med) === 0;
}

/** Slots that have at least one medicine during the week. */
export function usedSlots(plan: PlanResult): Slot[] {
  const meds = scheduledMeds(plan);
  return SLOT_ORDER.filter((s) => meds.some((m) => m.slots.includes(s)));
}

/** Medications that belong in the daily organizer. */
export function scheduledMeds(plan: PlanResult): Medication[] {
  return plan.verified_medications.filter(
    (m) => m.status !== "stop" && !m.as_needed && m.slots.length > 0 && !cadenceUnclear(m),
  );
}

/** Still being taken, not as-needed, but with no time of day or a cadence we can't place: shown separately. */
export function unscheduledMeds(plan: PlanResult): Medication[] {
  return plan.verified_medications.filter(
    (m) => m.status !== "stop" && !m.as_needed && (m.slots.length === 0 || cadenceUnclear(m)),
  );
}

export function asNeededMeds(plan: PlanResult): Medication[] {
  return plan.verified_medications.filter((m) => m.status !== "stop" && m.as_needed);
}

export function stoppedMeds(plan: PlanResult): Medication[] {
  return plan.verified_medications.filter((m) => m.status === "stop");
}

/** Every English string the fridge sheet needs translated, keyed by a stable id. No ids carry numbers. */
export function translatableStrings(plan: PlanResult): Record<string, string> {
  const out: Record<string, string> = { ...UI_STRINGS };
  plan.verified_medications.forEach((m, i) => {
    if (m.dose_unit) out[`unit_${i}`] = m.dose_unit;
    out[`freq_${i}`] = m.frequency_verbatim;
    if (m.duration_verbatim) out[`dur_${i}`] = m.duration_verbatim;
  });
  plan.warning_signs.forEach((w, i) => (out[`warn_${i}`] = w.text));
  plan.follow_ups.forEach((f, i) => (out[`follow_${i}`] = f.text));
  return out;
}

/** Plain-text summary for sharing to a family WhatsApp group. */
export function shareText(plan: PlanResult): string {
  const lines: string[] = ["Medicine plan from the hospital papers (made with CareSheet). Please check with the pharmacist."];
  for (const slot of SLOT_ORDER) {
    const meds = scheduledMeds(plan).filter((m) => m.slots.includes(slot));
    if (meds.length === 0) continue;
    lines.push(`\n${UI_STRINGS[`slot_${slot}` as UiKey]}:`);
    for (const m of meds) {
      const dose = [doseNumber(m), m.dose_unit].filter(Boolean).join(" ");
      lines.push(`- ${m.name} ${strengthText(m)}${dose ? ` (${dose})` : ""}${m.with_food === "with_food" ? ", with food" : ""}`);
    }
  }
  const unscheduled = unscheduledMeds(plan);
  if (unscheduled.length)
    lines.push(`\nAsk the pharmacist when to take: ${unscheduled.map((m) => `${m.name} (${m.frequency_verbatim})`).join("; ")}`);
  const doubtful = plan.verified_medications.filter((m) => m.status !== "stop" && confirmFirst(plan, m));
  if (doubtful.length) lines.push(`\nConfirm with the pharmacist first: ${[...new Set(doubtful.map((m) => m.name))].join(", ")}`);
  const stopped = stoppedMeds(plan);
  if (stopped.length) lines.push(`\nSTOPPED, do not take: ${stopped.map((m) => m.name).join(", ")}`);
  if (plan.ask_pharmacist.length) lines.push(`\n${plan.ask_pharmacist.length} question(s) to ask the pharmacist before starting.`);
  return lines.join("\n");
}

/**
 * True when a pharmacist question is about this medicine's own line of the papers (illegible, conflicting,
 * mismatched or unclear), or its status is unclear. These stay visible but are marked "confirm first" and
 * get no phone reminders, so a doubtful dose isn't nagged at the family.
 */
export function confirmFirst(plan: PlanResult, med: Medication): boolean {
  if (med.status === "unclear") return true;
  const q = normalizeForMatch(med.source_quote);
  return plan.ask_pharmacist.some(
    (c) =>
      (c.kind === "illegible" || c.kind === "conflict" || c.kind === "unclear" || c.kind === "mismatch") &&
      c.quotes.some((x) => {
        const n = normalizeForMatch(x);
        return n === q || (n.length > 12 && q.includes(n)) || (q.length > 12 && n.includes(q));
      }),
  );
}
