// Turns the structured plan into words. Every number shown to a family is printed by this code
// from Claude's structured fields, never typed by Claude inside a sentence. Translation only ever
// touches the words, so a translation can't change a dose.
import type { Medication, Slot } from "./schema";
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

/** Number of days from "for 5 days", "x 7 days", "for 3 days, then stop". null = ongoing. */
export function durationDays(med: Medication): number | null {
  const m = `${med.duration_verbatim ?? ""} ${med.frequency_verbatim}`.match(/(\d+)\s*days?\b/i);
  return m ? Number(m[1]) : null;
}

/** Is this medicine taken on day `dayIndex` (0 = first day home)? */
export function activeOnDay(med: Medication, dayIndex: number): boolean {
  const d = durationDays(med);
  return d === null || dayIndex < d;
}

/** Slots that have at least one medicine during the week. */
export function usedSlots(plan: PlanResult): Slot[] {
  const meds = scheduledMeds(plan);
  return SLOT_ORDER.filter((s) => meds.some((m) => m.slots.includes(s)));
}

/** Medications that belong in the daily organizer. */
export function scheduledMeds(plan: PlanResult): Medication[] {
  return plan.verified_medications.filter((m) => m.status !== "stop" && !m.as_needed && m.slots.length > 0);
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
  const stopped = stoppedMeds(plan);
  if (stopped.length) lines.push(`\nSTOPPED, do not take: ${stopped.map((m) => m.name).join(", ")}`);
  if (plan.ask_pharmacist.length) lines.push(`\n${plan.ask_pharmacist.length} question(s) to ask the pharmacist before starting.`);
  return lines.join("\n");
}
