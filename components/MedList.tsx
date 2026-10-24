// The reconciliation view: what's new, what changed, what continues, and what to STOP.
// Missing a STOP is one of the most common mistakes after discharge, so it comes first and in red.
import type { PlanResult } from "@/lib/claude";
import { confirmFirst, doseText } from "@/lib/render";
import type { Medication } from "@/lib/schema";
import { Ban, Plate } from "./Icons";
import MedInfo from "./MedInfo";

const GROUPS: { status: Medication["status"]; title: string; note: string; edge: string }[] = [
  { status: "stop", title: "Stop taking", note: "The hospital says to stop these. Take them out of the pill box.", edge: "border-stop" },
  { status: "new", title: "New", note: "Started in hospital.", edge: "border-lid-noon" },
  { status: "changed", title: "Dose changed", note: "Same medicine, different amount than before.", edge: "border-lid-morning" },
  { status: "continue", title: "Keep taking", note: "Same as before the hospital stay.", edge: "border-field" },
  { status: "unclear", title: "Status unclear", note: "The papers don't say clearly. Ask the pharmacist.", edge: "border-ask" },
];

function Row({ med, lang, doubtful, edge }: { med: Medication; lang: "en" | "es"; doubtful: boolean; edge: string }) {
  const dose = doseText(med);
  const stop = med.status === "stop";
  return (
    <li className={`card rounded-xl border-l-4 p-4 ${edge} ${stop ? "!bg-stop-wash" : ""}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {stop ? <Ban className="h-5 w-5 self-center text-stop" /> : null}
        <span className={`text-lg font-bold ${stop ? "text-stop line-through decoration-2" : ""}`}>{med.name}</span>
        <span>{med.strength}</span>
        {dose && !stop ? <span className="text-muted">· {dose}</span> : null}
        {doubtful && !stop ? <span className="rounded bg-ask-wash px-2 py-0.5 text-sm font-bold text-ask">Confirm with the pharmacist first</span> : null}
      </div>
      {!stop ? (
        <p className="mt-1 flex items-center gap-1.5 text-muted">
          {med.as_needed ? "Only when needed · " : null}
          {med.frequency_verbatim}
          {med.duration_verbatim ? `, ${med.duration_verbatim}` : null}
          {med.with_food === "with_food" ? <Plate className="h-4 w-4" title="with food" /> : null}
        </p>
      ) : null}
      {!stop ? <div className="mt-1"><MedInfo name={med.name} lang={lang} /></div> : null}
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-action">Where this came from</summary>
        <blockquote className="mt-1 border-l-2 border-rule pl-3 text-muted">&ldquo;{med.source_quote}&rdquo;</blockquote>
      </details>
    </li>
  );
}

export default function MedList({ plan, lang = "en" }: { plan: PlanResult; lang?: "en" | "es" }) {
  return (
    <div className="space-y-8">
      {GROUPS.map((g) => {
        const meds = plan.verified_medications.filter((m) => m.status === g.status);
        if (meds.length === 0) return null;
        return (
          <section key={g.status} aria-labelledby={`grp-${g.status}`}>
            <h3 id={`grp-${g.status}`} className={`flex items-center gap-2 text-xl font-bold ${g.status === "stop" ? "text-stop" : ""}`}>
              {g.title} <span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-bold text-muted ring-1 ring-rule">{meds.length}</span>
            </h3>
            <p className="mb-2 text-muted">{g.note}</p>
            <ul className="space-y-2">{meds.map((m) => <Row key={`${m.name}-${m.source_quote}`} med={m} lang={lang} doubtful={confirmFirst(plan, m)} edge={g.edge} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
