"use client";
// Everything in one list: a filter row, then plain rows separated by thin rules. Tap a row for the full story.
import type { PlanResult } from "@/lib/claude";
import { confirmFirst, daysLabel, doseText, slotWords } from "@/lib/render";
import type { Medication } from "@/lib/schema";
import { Ban, Check, ChevronRight, Pencil, Plus, Question } from "./Icons";

export type MedFilter = "all" | "stop" | "new" | "changed" | "continue" | "unclear";

type Mark = (p: { className?: string }) => React.ReactElement;
export const STATUS_INFO: Record<Medication["status"], { word: string; group: string; filter: string; color: string; Icon: Mark }> = {
  stop: { word: "Stop taking", group: "Stop taking", filter: "Stop", color: "text-stop", Icon: Ban },
  new: { word: "New medicine", group: "New", filter: "New", color: "text-ok", Icon: Plus },
  changed: { word: "Dose changed", group: "Dose changed", filter: "Changed", color: "text-action", Icon: Pencil },
  continue: { word: "Keep taking", group: "Keep taking", filter: "Keep taking", color: "text-muted", Icon: Check },
  unclear: { word: "Status unclear", group: "Status unclear", filter: "Unclear", color: "text-ask", Icon: Question },
};
const ORDER: Medication["status"][] = ["stop", "new", "changed", "continue", "unclear"];

function Row({ plan, med, onOpenMed, showStopTag }: { plan: PlanResult; med: Medication; onOpenMed: (m: Medication) => void; showStopTag: boolean }) {
  const info = STATUS_INFO[med.status];
  const stop = med.status === "stop";
  const strength = med.strength?.trim();
  const detail = [slotWords(med), daysLabel(med), doseText(med)].filter(Boolean).join(" · ");
  const doubtful = !stop && confirmFirst(plan, med);
  return (
    <li className={stop ? "bg-stop-wash" : ""}>
      <button
        type="button"
        onClick={() => onOpenMed(med)}
        aria-label={`${med.name}${strength ? ` ${strength}` : ""}, ${info.word}. Open details`}
        className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-mist"
      >
        <info.Icon className={`h-7 w-7 shrink-0 ${info.color}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[1.15rem] font-bold leading-snug text-ink">{med.name}</span>
            {strength ? <span className="num text-[1.05rem] font-bold text-ink">{strength}</span> : null}
            {stop && showStopTag ? <span className="tag-stop self-center text-[0.8125rem]">STOP</span> : null}
          </span>
          <span className="mt-0.5 block text-[0.95rem] text-muted">
            {stop ? "Take it out of the pill box" : detail || info.word}
          </span>
          {doubtful ? (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.95rem]">
              <span className="inline-flex items-center gap-1 font-bold text-ask">
                <Question className="h-4 w-4" /> Confirm first
              </span>
            </span>
          ) : null}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-caption" />
      </button>
    </li>
  );
}

export default function Medicines({
  plan, onOpenMed, filter, onFilter,
}: { plan: PlanResult; onOpenMed: (m: Medication) => void; filter: MedFilter; onFilter: (f: MedFilter) => void }) {
  const meds = plan.verified_medications;
  const count = (s: Medication["status"]) => meds.filter((m) => m.status === s).length;
  const options: { key: MedFilter; label: string; n: number }[] = [
    { key: "all", label: "All", n: meds.length },
    ...ORDER.map((s) => ({ key: s as MedFilter, label: STATUS_INFO[s].filter, n: count(s) })),
  ];
  const visible = options.filter((o) => o.n > 0 || o.key === "all");
  // If the chosen filter has nothing, show everything rather than an empty list.
  const active: MedFilter = filter !== "all" && count(filter) === 0 ? "all" : filter;

  return (
    <div>
      <div className="relative -mx-4 sm:mx-0 print:mx-0">
      <div role="group" aria-label="Show" className="flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:px-0 print:flex-wrap print:overflow-visible print:px-0">
        {visible.map((o) => {
          const on = active === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onFilter(o.key)}
              className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3.5 text-[1rem] font-bold ${
                on ? "border-night bg-night text-white" : "border-field bg-white text-ink hover:border-action"
              }`}
            >
              {o.label} <span className="num">{o.n}</span>
            </button>
          );
        })}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent sm:hidden print:hidden" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent sm:hidden print:hidden" />
      </div>

      <h2 className="sr-only">All medicines</h2>
      <div className="mt-4">
        {active === "all" ? (
          ORDER.map((s) => {
            const list = meds.filter((m) => m.status === s);
            if (!list.length) return null;
            const id = `medgrp-${s}`;
            return (
              <section key={s} aria-labelledby={id} className="mt-5 first:mt-0">
                <h3 id={id} className={`border-b-2 pb-1 px-3 text-[1.05rem] font-bold ${s === "stop" ? "border-stop text-stop" : "border-ink text-ink"}`}>
                  {STATUS_INFO[s].group} <span className="num font-semibold text-muted">{list.length}</span>
                </h3>
                <ul className="divide-y divide-rule border-b border-rule">
                  {list.map((m, i) => <Row key={`${m.name}-${m.strength ?? ""}-${m.source_quote}-${i}`} plan={plan} med={m} onOpenMed={onOpenMed} showStopTag={false} />)}
                </ul>
              </section>
            );
          })
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {meds.filter((m) => m.status === active).map((m, i) => <Row key={`${m.name}-${m.strength ?? ""}-${m.source_quote}-${i}`} plan={plan} med={m} onOpenMed={onOpenMed} showStopTag />)}
          </ul>
        )}
      </div>
    </div>
  );
}
