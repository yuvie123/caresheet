"use client";
// The full story of one medicine, in a native dialog that is always mounted and opens when `med` is set.
import { useEffect, useRef } from "react";
import type { PlanResult } from "@/lib/claude";
import { confirmFirst, daysLabel, doseText, slotWords, UI_STRINGS } from "@/lib/render";
import type { Medication } from "@/lib/schema";
import { normalizeForMatch } from "@/lib/verify";
import { Alert, Ban, Plate } from "./Icons";
import MedInfo from "./MedInfo";
import { STATUS_INFO } from "./Medicines";

function matchingIssues(plan: PlanResult, med: Medication): string[] {
  const q = normalizeForMatch(med.source_quote);
  return plan.ask_pharmacist
    .filter((c) => c.quotes.some((x) => {
      const n = normalizeForMatch(x);
      return n === q || (n.length > 12 && q.includes(n)) || (q.length > 12 && n.includes(q));
    }))
    .map((c) => c.issue);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-rule py-3 last:border-b-0">
      <dt className="w-28 shrink-0 text-[0.95rem] text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-[1.05rem] font-bold text-ink ">{children}</dd>
    </div>
  );
}

export default function MedDetail({ plan, med, lang, onClose }: { plan: PlanResult; med: Medication | null; lang: "en" | "es"; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const scrollY = useRef(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (med && !d.open) {
      scrollY.current = window.scrollY;
      d.showModal();
      d.scrollTop = 0;
    } else if (!med && d.open) {
      d.close();
      window.scrollTo({ top: scrollY.current });
    }
  }, [med]);

  const stop = med?.status === "stop";
  const info = med ? STATUS_INFO[med.status] : null;
  const issues = med ? matchingIssues(plan, med) : [];
  const doubtful = med ? confirmFirst(plan, med) : false;
  const dose = med ? doseText(med) : "";
  const times = med ? slotWords(med) : "";
  const strength = med?.strength?.trim();
  const showFreq = !!med && !!med.frequency_verbatim.trim()
    && (!times || normalizeForMatch(med.frequency_verbatim) !== normalizeForMatch(times));
  const showDuration = !!med?.duration_verbatim?.trim();
  const showQuote = !!med && !!med.source_quote.trim()
    && normalizeForMatch(med.source_quote) !== normalizeForMatch(`${med.name} ${strength ?? ""}`);

  return (
    <dialog
      ref={ref}
      className="sheet no-print"
      aria-labelledby="meddetail-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {med && info ? (
        <div>
          <div className="sticky top-0 z-10 border-b border-rule bg-white px-5 py-4">
            <div aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-rule sm:hidden" />
            <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="meddetail-title" className="text-[1.4rem] font-bold leading-tight text-ink">{med.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[1rem]">
                {strength ? <span className="num font-bold">{strength}</span> : null}
                {stop ? <span className="tag-stop text-[0.8125rem]">STOP</span> : null}
                <span className={`inline-flex items-center gap-1.5 font-bold ${info.color}`}>
                  <info.Icon className="h-5 w-5" /> {info.word}
                </span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="btn btn-secondary min-h-11 shrink-0 px-4">Close</button>
            </div>
          </div>

          <div className="px-5 pb-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {stop ? (
              <section className="mt-4 flex items-start gap-3 rounded-lg bg-stop-wash p-4 ring-1 ring-stop-line">
                <Ban className="mt-0.5 h-7 w-7 shrink-0 text-stop" />
                <p className="text-[1.1rem] font-bold text-stop">Stop taking this medicine. The hospital says to take it out of the pill box.</p>
              </section>
            ) : (
              <section className="pt-4" aria-labelledby="md-how">
                <h3 id="md-how" className="text-[1.15rem] font-bold">How to take it</h3>
                <dl className="mt-1">
                  {dose ? <Row label="Dose"><span className="num">{dose}</span></Row> : null}
                  {times ? <Row label="Time of day">{times}</Row> : null}
                  <Row label="Days">{daysLabel(med)}</Row>
                  {med.with_food !== "not_stated" ? (
                    <Row label="Food">
                      <span className="inline-flex items-center gap-2">
                        <Plate className="h-5 w-5 shrink-0 self-center text-action" />
                        <span className="inline-block first-letter:uppercase">{med.with_food === "with_food" ? UI_STRINGS.with_food : UI_STRINGS.empty_stomach}</span>
                      </span>
                    </Row>
                  ) : null}
                  {med.as_needed ? <Row label="Note">Only when needed. Ask the pharmacist how often.</Row> : null}
                </dl>
              </section>
            )}

            {doubtful || issues.length ? (
              <section className="mt-4 rounded-lg bg-ask-wash p-4 ring-1 ring-ask-line" aria-labelledby="md-ask">
                <h3 id="md-ask" className="flex items-center gap-2 text-[1.1rem] font-bold text-ask">
                  <Alert className="h-6 w-6 shrink-0" /> Ask your pharmacist
                </h3>
                {issues.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[1rem] text-ink">
                    {issues.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                ) : (
                  <p className="mt-2 text-[1rem] text-ink">{UI_STRINGS.confirm_first}.</p>
                )}
              </section>
            ) : null}

            {showFreq || showDuration || showQuote ? (
              <section className="mt-4 border-t border-rule pt-4" aria-labelledby="md-papers">
                <h3 id="md-papers" className="text-[1.15rem] font-bold">What the papers say</h3>
                {showFreq || showDuration ? (
                  <dl className="mt-1">
                    {showFreq ? <Row label="How often">{med.frequency_verbatim}</Row> : null}
                    {showDuration ? <Row label="For how long">{med.duration_verbatim}</Row> : null}
                  </dl>
                ) : null}
                {showQuote ? (
                  <figure className="mt-3 border-l-2 border-field pl-4">
                    <figcaption className="text-[0.95rem] font-bold text-muted">{UI_STRINGS.from_papers}</figcaption>
                    <blockquote className="mt-1 text-[1rem] italic text-ink">{med.source_quote}</blockquote>
                  </figure>
                ) : null}
              </section>
            ) : null}

            {!stop ? (
              <section className="mt-4 border-t border-rule pt-4">
                <MedInfo name={med.name} lang={lang} />
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
