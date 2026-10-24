// The reconciliation view: what's new, what changed, what continues, and what to STOP.
// Missing a STOP is one of the most common mistakes after discharge, so it comes first and in red.
import type { PlanResult } from "@/lib/claude";
import { doseNumber } from "@/lib/render";
import type { Medication } from "@/lib/schema";
import { Ban, Plate } from "./Icons";

const GROUPS: { status: Medication["status"]; title: string; note: string }[] = [
  { status: "stop", title: "Stop taking", note: "The hospital says to stop these. Take them out of the pill box." },
  { status: "new", title: "New", note: "Started in hospital." },
  { status: "changed", title: "Dose changed", note: "Same medicine, different amount than before." },
  { status: "continue", title: "Keep taking", note: "Same as before the hospital stay." },
  { status: "unclear", title: "Status unclear", note: "The papers don't say clearly. Ask the pharmacist." },
];

function Row({ med }: { med: Medication }) {
  const dose = [doseNumber(med), med.dose_unit].filter(Boolean).join(" ");
  const stop = med.status === "stop";
  return (
    <li className={`rounded-lg p-3 ${stop ? "bg-stop-wash" : "bg-paper"}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {stop ? <Ban className="h-5 w-5 self-center text-stop" /> : null}
        <span className={`text-lg font-bold ${stop ? "text-stop line-through decoration-2" : ""}`}>{med.name}</span>
        <span>{med.strength}</span>
        {dose && !stop ? <span className="text-muted">· {dose}</span> : null}
      </div>
      {!stop ? (
        <p className="mt-1 flex items-center gap-1.5 text-muted">
          {med.as_needed ? "Only when needed · " : null}
          {med.frequency_verbatim}
          {med.duration_verbatim ? `, ${med.duration_verbatim}` : null}
          {med.with_food === "with_food" ? <Plate className="h-4 w-4" title="with food" /> : null}
        </p>
      ) : null}
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-action">Where this came from</summary>
        <blockquote className="mt-1 border-l-2 border-rule pl-3 text-muted">&ldquo;{med.source_quote}&rdquo;</blockquote>
      </details>
    </li>
  );
}

export default function MedList({ plan }: { plan: PlanResult }) {
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => {
        const meds = plan.verified_medications.filter((m) => m.status === g.status);
        if (meds.length === 0) return null;
        return (
          <section key={g.status} aria-labelledby={`grp-${g.status}`}>
            <h3 id={`grp-${g.status}`} className={`text-xl font-bold ${g.status === "stop" ? "text-stop" : ""}`}>
              {g.title} <span className="font-normal text-muted">({meds.length})</span>
            </h3>
            <p className="mb-2 text-muted">{g.note}</p>
            <ul className="space-y-2">{meds.map((m) => <Row key={`${m.name}-${m.source_quote}`} med={m} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
