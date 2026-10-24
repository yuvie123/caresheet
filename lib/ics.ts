// Builds a calendar file (.ics) with a reminder for each time of day, for the next 7 days.
// Opening it on a phone adds alarms to the family's own calendar. Runs in the browser; nothing is sent
// anywhere. Times are suggestions the family can edit in their calendar.
import type { PlanResult } from "./claude";
import { activeOnDay, doseText, scheduledMeds, UI_STRINGS } from "./render";
import type { Slot } from "./schema";

export const SLOT_TIME: Record<Slot, [number, number]> = {
  morning: [8, 0],
  noon: [12, 30],
  evening: [18, 0],
  bedtime: [21, 30],
};

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
// iCalendar text escaping and 75-octet line folding (RFC 5545).
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 74) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

/** Calendar file text. `start` is the first day home (defaults to tomorrow). */
export function buildIcs(plan: PlanResult, start = new Date(Date.now() + 86_400_000)): string {
  const meds = scheduledMeds(plan);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CareSheet//Medicine reminders//EN", "CALSCALE:GREGORIAN"];
  const now = stamp(new Date());

  for (let day = 0; day < 7; day++) {
    for (const slot of Object.keys(SLOT_TIME) as Slot[]) {
      const items = meds.filter((m) => m.slots.includes(slot) && activeOnDay(m, day));
      if (!items.length) continue;
      const [h, min] = SLOT_TIME[slot];
      const at = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day, h, min);
      const end = new Date(at.getTime() + 15 * 60_000);
      const list = items.map((m) => `${m.name} ${m.strength ?? ""} ${doseText(m) ? `(${doseText(m)})` : ""}`.replace(/\s+/g, " ").trim());
      const title = `${UI_STRINGS[`slot_${slot}`]} medicines: ${items.map((m) => m.name).join(", ")}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:caresheet-${day}-${slot}-${at.getTime()}@caresheet`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(at)}`,
        `DTEND:${stamp(end)}`,
        fold(`SUMMARY:${esc(title)}`),
        fold(`DESCRIPTION:${esc(`${list.join("\n")}\n\nFrom the hospital papers via CareSheet. Check with your pharmacist.`)}`),
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:PT0M",
        fold(`DESCRIPTION:${esc(title)}`),
        "END:VALARM",
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcs(plan: PlanResult) {
  const blob = new Blob([buildIcs(plan)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medicine-reminders.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
