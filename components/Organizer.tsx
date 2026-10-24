// The weekly pill organizer: rows are times of day (one lid colour each), columns are days.
// Each compartment lists exactly what goes in it. This is the screen families recognise from
// the plastic box on the kitchen counter.
"use client";
import { useEffect, useRef, useState } from "react";
import type { PlanResult } from "@/lib/claude";
import { activeOnDay, confirmFirst, doseText, scheduledMeds, UI_STRINGS, unscheduledMeds, usedSlots } from "@/lib/render";
import type { Medication, Slot } from "@/lib/schema";
import { Plate, SLOT_ICON, SLOT_LID } from "./Icons";

const DAY = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];

function Pill({
  med, onQuote, doubtful, where,
}: { med: Medication; onQuote: (m: Medication) => void; doubtful: boolean; where: string }) {
  const dose = doseText(med);
  return (
    <button
      type="button"
      onClick={() => onQuote(med)}
      aria-label={`${med.name} ${med.strength ?? ""}${dose ? `, ${dose}` : ""}, ${where}${doubtful ? ", confirm with the pharmacist first" : ""}. Show the line it came from.`}
      className="block min-h-11 w-full break-words rounded-md bg-mist px-2 py-1.5 text-left text-[0.9rem] leading-snug ring-1 ring-rule hover:bg-white hover:ring-2 hover:ring-action"
    >
      <span className="font-bold">
        {/* break only after a hyphen ("Amoxicillin-" / "clavulanate"), never leaving a lone "-" on a line */}
        {med.name.split(/(?<=-)/).map((part, i) => (
          <span key={i} className="inline-block">{part}</span>
        ))}
      </span>{" "}
      <span className="whitespace-nowrap">{med.strength}</span>
      {dose ? <span className="block text-muted">{dose}</span> : null}
      {med.with_food === "with_food" ? (
        <Plate className="mt-0.5 h-4 w-4 text-muted" title={UI_STRINGS.with_food} />
      ) : null}
      {doubtful ? <span className="mt-1 block rounded bg-ask-wash px-1 text-[0.75rem] font-bold text-ask">Confirm first</span> : null}
    </button>
  );
}

export default function Organizer({ plan }: { plan: PlanResult }) {
  const meds = scheduledMeds(plan);
  const slots = usedSlots(plan); // hide times of day with nothing in them
  const [quoted, setQuoted] = useState<Medication | null>(null);
  const [day, setDay] = useState(0); // phone view shows one day at a time
  const panel = useRef<HTMLDivElement>(null);

  // Tapping a medicine opens its source line below the grid; bring it into view and move focus there so
  // it is obvious on a phone and announced to screen readers.
  useEffect(() => {
    if (!quoted) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    panel.current?.focus({ preventScroll: true });
  }, [quoted]);

  if (meds.length === 0) {
    return <p className="text-muted">No daily medications were found that could be verified. See the pharmacist questions below.</p>;
  }

  const cell = (slot: Slot, d: number) =>
    meds.filter((m) => m.slots.includes(slot) && activeOnDay(m, d));

  return (
    <div>
      {/* Phone: one day at a time */}
      <div className="md:hidden">
        <div className="mb-3 flex gap-1 overflow-x-auto" role="group" aria-label="Choose a day">
          {DAY.map((label, i) => (
            <button key={label} type="button" aria-pressed={day === i} onClick={() => setDay(i)}
              className={`min-h-11 shrink-0 rounded-full px-4 py-1 text-sm font-bold ${day === i ? "bg-night text-white" : "bg-white text-ink ring-1 ring-rule"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {slots.map((slot) => {
            const Icon = SLOT_ICON[slot];
            const items = cell(slot, day);
            return (
              <div key={slot} className="card overflow-hidden">
                <div className={`flex items-center gap-2 px-3 py-2 font-bold ${SLOT_LID[slot]}`}>
                  <Icon className="h-5 w-5" /> {UI_STRINGS[`slot_${slot}`]}
                </div>
                <div className="space-y-1.5 bg-wash/60 p-2">
                  {items.length ? items.map((m) => <Pill key={plan.verified_medications.indexOf(m)} med={m} onQuote={setQuoted} doubtful={confirmFirst(plan, m)} where={`${UI_STRINGS[`slot_${slot}`]}, ${DAY[day]}`} />) : (
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
        <div className="grid grid-cols-[7.5rem_repeat(7,minmax(0,1fr))] gap-1.5 rounded-2xl bg-[#d5dfe5] p-3 shadow-inner">
          <div />
          {DAY.map((d) => (
            <div key={d} className="pb-1 text-center text-sm font-bold text-muted">{d}</div>
          ))}
          {slots.map((slot) => {
            const Icon = SLOT_ICON[slot];
            return (
              <div key={slot} className="contents">
                <div className={`flex items-center gap-2 rounded-l-xl px-3 font-bold ${SLOT_LID[slot]}`}>
                  <Icon className="h-5 w-5 shrink-0" /> <span className="text-sm">{UI_STRINGS[`slot_${slot}`]}</span>
                </div>
                {DAY.map((d, i) => {
                  const items = cell(slot, i);
                  return (
                    <div key={d} className="min-h-20 space-y-1 rounded-lg border-t-4 bg-white p-1.5 shadow-sm"
                      style={{ borderTopColor: `var(--color-lid-${slot})` }}>
                      {items.map((m) => <Pill key={plan.verified_medications.indexOf(m)} med={m} onQuote={setQuoted} doubtful={confirmFirst(plan, m)} where={`${UI_STRINGS[`slot_${slot}`]}, ${DAY[i]}`} />)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {unscheduledMeds(plan).length ? (
        <div className="mt-4 rounded-xl border-2 border-dashed border-ask bg-ask-wash p-3">
          <p className="font-bold text-ask">Not on the grid: ask the pharmacist when to take these</p>
          <ul className="mt-1 list-disc pl-5">
            {unscheduledMeds(plan).map((m) => (
              <li key={plan.verified_medications.indexOf(m)}>
                <span className="font-bold">{m.name}</span> {m.strength}: {m.frequency_verbatim}
                {m.duration_verbatim ? `, ${m.duration_verbatim}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        Times of day are suggestions based on the sheet&apos;s wording. Tap any medicine to see the exact line it came from.
      </p>

      {quoted ? (
        <div ref={panel} tabIndex={-1} role="region" aria-label={`Source for ${quoted.name}`}
          className="card mt-3 border-l-4 border-action p-4">
          <p className="text-sm text-muted">From the hospital papers:</p>
          <blockquote className="mt-1 text-lg">&ldquo;{quoted.source_quote}&rdquo;</blockquote>
          <p className="mt-2 text-sm text-muted">Written as: {quoted.frequency_verbatim}</p>
          <button type="button" className="mt-3 min-h-11 rounded-lg border-2 border-action px-4 py-1 font-bold text-action" onClick={() => setQuoted(null)}>Close</button>
        </div>
      ) : null}
    </div>
  );
}
