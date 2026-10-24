// The weekly pill organizer: rows are times of day (one lid colour each), columns are days.
// Each compartment lists exactly what goes in it. This is the screen families recognise from
// the plastic box on the kitchen counter.
"use client";
import { useState } from "react";
import type { PlanResult } from "@/lib/claude";
import { doseNumber, scheduledMeds, SLOT_ORDER, UI_STRINGS } from "@/lib/render";
import type { Medication, Slot } from "@/lib/schema";
import { Plate, SLOT_ICON, SLOT_LID } from "./Icons";

const DAY = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

/** True if the med is still being taken on this day, given "for N days" style durations. */
function activeOnDay(med: Medication, dayIndex: number): boolean {
  const m = med.duration_verbatim?.match(/(\d+)\s*day/i);
  if (!m) return true;
  return dayIndex < Number(m[1]);
}

function Pill({ med, onQuote }: { med: Medication; onQuote: (m: Medication) => void }) {
  const dose = [doseNumber(med), med.dose_unit].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      onClick={() => onQuote(med)}
      className="block w-full rounded-md bg-paper px-2 py-1.5 text-left text-[0.8rem] leading-snug shadow-[0_1px_0_var(--color-rule)] hover:ring-2 hover:ring-action"
    >
      <span className="font-bold">{med.name}</span> {med.strength}
      {dose ? <span className="block text-muted">{dose}</span> : null}
      {med.with_food === "with_food" ? (
        <Plate className="mt-0.5 h-4 w-4 text-muted" title={UI_STRINGS.with_food} />
      ) : null}
    </button>
  );
}

export default function Organizer({ plan }: { plan: PlanResult }) {
  const meds = scheduledMeds(plan);
  const [quoted, setQuoted] = useState<Medication | null>(null);
  const [day, setDay] = useState(0); // phone view shows one day at a time

  if (meds.length === 0) {
    return <p className="text-muted">No daily medications were found that could be verified. See the pharmacist questions below.</p>;
  }

  const cell = (slot: Slot, d: number) =>
    meds.filter((m) => m.slots.includes(slot) && activeOnDay(m, d));

  return (
    <div>
      {/* Phone: one day at a time */}
      <div className="md:hidden">
        <div className="mb-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Choose a day">
          {DAY.map((label, i) => (
            <button key={label} role="tab" aria-selected={day === i} onClick={() => setDay(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm ${day === i ? "bg-ink text-white" : "bg-paper text-ink"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {SLOT_ORDER.map((slot) => {
            const Icon = SLOT_ICON[slot];
            const items = cell(slot, day);
            return (
              <div key={slot} className="overflow-hidden rounded-xl bg-paper">
                <div className={`flex items-center gap-2 px-3 py-2 font-bold ${SLOT_LID[slot]}`}>
                  <Icon className="h-5 w-5" /> {UI_STRINGS[`slot_${slot}`]}
                </div>
                <div className="space-y-1.5 bg-wash/60 p-2">
                  {items.length ? items.map((m) => <Pill key={m.name} med={m} onQuote={setQuoted} />) : (
                    <p className="px-1 text-sm text-muted">Nothing</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Laptop: the whole week like a pill organizer */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
          <div />
          {DAY.map((d) => (
            <div key={d} className="pb-1 text-center text-sm font-bold text-muted">{d}</div>
          ))}
          {SLOT_ORDER.map((slot) => {
            const Icon = SLOT_ICON[slot];
            return (
              <div key={slot} className="contents">
                <div className={`flex items-center gap-2 rounded-l-xl px-3 font-bold ${SLOT_LID[slot]}`}>
                  <Icon className="h-5 w-5 shrink-0" /> <span className="text-sm">{UI_STRINGS[`slot_${slot}`]}</span>
                </div>
                {DAY.map((d, i) => {
                  const items = cell(slot, i);
                  return (
                    <div key={d} className="min-h-20 space-y-1 rounded-lg border-t-4 bg-paper/70 p-1.5"
                      style={{ borderTopColor: `var(--color-lid-${slot})` }}>
                      {items.map((m) => <Pill key={m.name} med={m} onQuote={setQuoted} />)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        Times of day are suggestions based on the sheet&apos;s wording. Tap any medicine to see the exact line it came from.
      </p>

      {quoted ? (
        <div role="dialog" aria-label={`Source for ${quoted.name}`} className="mt-3 rounded-xl border-l-4 border-action bg-paper p-4">
          <p className="text-sm text-muted">From the hospital papers:</p>
          <blockquote className="mt-1 text-lg">&ldquo;{quoted.source_quote}&rdquo;</blockquote>
          <p className="mt-2 text-sm text-muted">Written as: {quoted.frequency_verbatim}</p>
          <button className="mt-3 text-action underline" onClick={() => setQuoted(null)}>Close</button>
        </div>
      ) : null}
    </div>
  );
}
