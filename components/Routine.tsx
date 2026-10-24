// The default results tab: what to give, and when. One day at a time, grouped by time of day.
"use client";
import { useState } from "react";
import type { PlanResult } from "@/lib/claude";
import {
  activeOnDay, asNeededMeds, confirmFirst, daysLabel, doseText, scheduledMeds, stoppedMeds,
  UI_STRINGS, unscheduledMeds, usedSlots,
} from "@/lib/render";
import type { Medication, Slot } from "@/lib/schema";
import { Alert, Ban, ChevronRight, Plate, SLOT_ICON } from "./Icons";
import Notes from "./Notes";
import type { ResultTab } from "./ResultsView";

const LID_HEAD: Record<Slot, string> = {
  morning: "bg-lid-morning-tint text-lid-morning-ink",
  noon: "bg-lid-noon-tint text-lid-noon-ink",
  evening: "bg-lid-evening-tint text-lid-evening-ink",
  bedtime: "bg-lid-bedtime-tint text-lid-bedtime-ink",
};
const CLOCK: Record<Slot, string> = { morning: "8:00", noon: "12:30", evening: "18:00", bedtime: "21:30" };
const DAYS = [1, 2, 3, 4, 5, 6, 7];

function MedRow({
  med, doubtful, where, onOpen, detail,
}: { med: Medication; doubtful: boolean; where: string; onOpen: (m: Medication) => void; detail?: string }) {
  const dose = doseText(med);
  return (
    <button
      type="button"
      onClick={() => onOpen(med)}
      aria-label={`${med.name} ${med.strength ?? ""}${dose ? `, ${dose}` : ""}, ${where}${doubtful ? ", confirm with the pharmacist first" : ""}. Show details.`}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-mist"
    >
      <span className="min-w-0 flex-1 break-words">
        <span className="block text-[1.15rem] font-bold leading-snug">
          {med.name}{" "}
          {med.strength ? <span className="num whitespace-nowrap font-bold">{med.strength}</span> : null}
        </span>
        {dose || med.with_food === "with_food" || detail ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-base text-muted">
            {dose ? <span className="num">{dose}</span> : null}
            {detail ? <span>{detail}</span> : null}
            {med.with_food === "with_food" ? (
              <span className="inline-flex items-center gap-1"><Plate className="h-5 w-5 shrink-0" />{UI_STRINGS.with_food}</span>
            ) : null}
          </span>
        ) : null}
        {doubtful ? (
          <span className="mt-1 inline-flex items-center gap-1.5 text-[0.95rem] font-bold text-ask">
            <Alert className="h-5 w-5 shrink-0" />Confirm first
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-6 w-6 shrink-0 text-caption" />
    </button>
  );
}

export default function Routine({
  plan, onOpenMed, onNavigate,
}: { plan: PlanResult; onOpenMed: (m: Medication) => void; onNavigate: (tab: ResultTab) => void }) {
  const [day, setDay] = useState(0);
  const meds = scheduledMeds(plan);
  const slots = usedSlots(plan);
  const stopped = stoppedMeds(plan);
  const asNeeded = asNeededMeds(plan);
  const unscheduled = unscheduledMeds(plan);

  return (
    <div className="space-y-8">
      <h2 className="sr-only">Daily routine</h2>
      {stopped.length ? (
        <div className="flex items-center gap-3 border-y border-stop-line bg-stop-wash px-4 py-2 text-stop">
          <Ban className="h-6 w-6 shrink-0" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0 text-[1.05rem] leading-snug">
            <span className="font-bold">Stop taking:</span>
            {stopped.map((m) => (
              <button
                key={plan.verified_medications.indexOf(m)}
                type="button"
                onClick={() => onOpenMed(m)}
                className="inline-flex min-h-11 items-center py-1 font-bold underline underline-offset-2"
                aria-label={`${m.name}, stop taking. Show details.`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {meds.length === 0 ? (
        <p className="text-lg text-muted">No daily medicines were found that could be checked. See the questions for the pharmacist.</p>
      ) : (
        <section aria-labelledby="rt-day">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h3 id="rt-day" className="text-xl font-bold">Day</h3>
            <p className="text-base text-muted">Day 1 is the first day at home</p>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label="Choose a day">
            {DAYS.map((n, i) => (
              <button
                key={n}
                type="button"
                aria-pressed={day === i}
                aria-current={day === i ? "true" : undefined}
                aria-label={`Day ${n}`}
                onClick={() => setDay(i)}
                className={`num min-h-12 min-w-0 rounded-md border-2 px-0 text-lg font-bold sm:text-xl ${
                  day === i ? "border-action bg-action text-white" : "border-field bg-white text-ink hover:bg-action-tint"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-base text-muted" aria-live="polite">Day {day + 1} of 7</p>

          <div className={`mt-6 grid items-start gap-x-8 gap-y-6 md:grid-cols-2 ${slots.length > 2 ? "xl:grid-cols-4" : ""}`}>
            {slots.map((slot) => {
              const Icon = SLOT_ICON[slot];
              const label = UI_STRINGS[`slot_${slot}` as const];
              const items = meds.filter((m) => m.slots.includes(slot) && activeOnDay(m, day));
              return (
                <section key={slot} aria-label={`${label}, day ${day + 1}`} className="border-t-2 border-ink">
                  <h3 className={`flex items-center gap-2 px-4 py-2 text-xl font-bold ${LID_HEAD[slot]}`}>
                    <Icon className="h-6 w-6 shrink-0" />
                    {label}
                    <span className="num ml-auto text-base font-semibold">{CLOCK[slot]}</span>
                  </h3>
                  {items.length ? (
                    <ul className="divide-y divide-rule border-b border-rule">
                      {items.map((m) => (
                        <li key={plan.verified_medications.indexOf(m)}>
                          <MedRow med={m} doubtful={confirmFirst(plan, m)} where={`${label}, day ${day + 1}`} onOpen={onOpenMed} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="border-b border-rule px-4 py-4 text-base text-muted">Nothing at this time</p>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      )}

      {asNeeded.length ? (
        <section aria-labelledby="rt-prn" className="border-t-2 border-ink">
          <h3 id="rt-prn" className="px-4 py-2 text-xl font-bold">{UI_STRINGS.as_needed}</h3>
          <ul className="divide-y divide-rule border-y border-rule">
            {asNeeded.map((m) => (
              <li key={plan.verified_medications.indexOf(m)}>
                <MedRow med={m} doubtful={confirmFirst(plan, m)} where="only when needed" onOpen={onOpenMed} detail={daysLabel(m) === UI_STRINGS.as_needed ? undefined : daysLabel(m)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unscheduled.length ? (
        <section aria-labelledby="rt-ask" className="accent-l bg-ask-wash" style={{ "--accent": "var(--color-ask-solid)" } as React.CSSProperties}>
          <h3 id="rt-ask" className="flex items-center gap-2 pr-4 pt-3 text-xl font-bold text-ask">
            <Alert className="h-6 w-6 shrink-0" />Ask the pharmacist when to take these
          </h3>
          <ul className="mt-1 divide-y divide-ask-line">
            {unscheduled.map((m) => (
              <li key={plan.verified_medications.indexOf(m)}>
                <MedRow med={m} doubtful={false} where="time of day not clear" onOpen={onOpenMed} detail={m.frequency_verbatim} />
              </li>
            ))}
          </ul>
          <div className="pb-4 pr-4 pt-2">
            <button type="button" onClick={() => onNavigate("ask")} className="btn btn-secondary min-h-12">
              See questions
            </button>
          </div>
        </section>
      ) : null}

      <Notes plan={plan} />
    </div>
  );
}
