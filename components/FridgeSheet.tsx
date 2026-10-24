// The one-page bilingual sheet that goes on the fridge. On screen it shows as a preview;
// when printed, it's the only thing on the page. Numbers come from code; only words are translated.
"use client";
import type { PlanResult } from "@/lib/claude";
import { asNeededMeds, doseNumber, scheduledMeds, SLOT_ORDER, stoppedMeds, UI_STRINGS, type UiKey } from "@/lib/render";
import type { Medication } from "@/lib/schema";
import { Ban, Plate, SLOT_ICON, SLOT_LID } from "./Icons";

type T = Record<string, string | null>;

/** English plus the translation underneath, or just English if the translation was rejected. */
function Bi({ id, en, t, className }: { id: string; en: string; t: T | null; className?: string }) {
  const tr = t?.[id];
  return (
    <span className={className}>
      <span className="block">{en}</span>
      {tr && tr !== en ? <span className="block text-[0.95em]">{tr}</span> : null}
    </span>
  );
}

function MedLine({ med, index, t }: { med: Medication; index: number; t: T | null }) {
  return (
    <li className="flex gap-3 border-b border-rule py-1.5 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="font-bold">{med.name}</span> {med.strength}
        {med.with_food === "with_food" ? (
          <Plate className="ml-1 inline h-4 w-4 align-[-2px]" title={UI_STRINGS.with_food} />
        ) : null}
        <div className="text-[0.9em] text-muted">
          <Bi id={`freq_${index}`} en={med.frequency_verbatim} t={t} />
        </div>
      </div>
      {med.dose_amount !== null ? (
        <div className="shrink-0 text-right">
          <span className="text-2xl font-bold">{doseNumber(med)}</span>{" "}
          <Bi id={`unit_${index}`} en={med.dose_unit ?? ""} t={t} className="inline-block text-sm" />
        </div>
      ) : null}
    </li>
  );
}

export default function FridgeSheet({ plan, translations, languageName }: { plan: PlanResult; translations: T | null; languageName: string | null }) {
  const all = plan.verified_medications;
  const idx = (m: Medication) => all.indexOf(m);
  const label = (k: UiKey) => <Bi id={k} en={UI_STRINGS[k]} t={translations} />;

  return (
    <article className="mx-auto max-w-[8.5in] bg-paper p-6 text-ink print:p-0" aria-label="Printable fridge sheet">
      <header className="flex items-end justify-between border-b-4 border-ink pb-2">
        <h2 className="text-3xl font-bold leading-tight">{label("sheet_title")}</h2>
        <p className="text-right text-xs text-muted">
          {languageName ? `English + ${languageName}` : "English"}
          <br />
          {label("not_advice")}
        </p>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {SLOT_ORDER.map((slot) => {
          const meds = scheduledMeds(plan).filter((m) => m.slots.includes(slot));
          const Icon = SLOT_ICON[slot];
          return (
            <section key={slot} className="overflow-hidden rounded-lg border-2 border-ink">
              <h3 className={`flex items-center gap-2 px-3 py-1.5 text-lg font-bold ${SLOT_LID[slot]}`}>
                <Icon className="h-7 w-7" /> {label(`slot_${slot}` as UiKey)}
              </h3>
              <ul className="px-3 py-1">
                {meds.length ? meds.map((m) => <MedLine key={m.name} med={m} index={idx(m)} t={translations} />) : <li className="py-2 text-muted">—</li>}
              </ul>
            </section>
          );
        })}
      </div>

      {asNeededMeds(plan).length ? (
        <section className="mt-3 rounded-lg border-2 border-dashed border-ink px-3 py-1">
          <h3 className="pt-1 font-bold">{label("as_needed_title")}</h3>
          <ul>{asNeededMeds(plan).map((m) => <MedLine key={m.name} med={m} index={idx(m)} t={translations} />)}</ul>
        </section>
      ) : null}

      {stoppedMeds(plan).length ? (
        <section className="mt-3 rounded-lg border-2 border-stop bg-stop-wash px-3 py-2 text-stop">
          <h3 className="flex items-center gap-2 font-bold"><Ban className="h-6 w-6" /> {label("stop_title")}</h3>
          <p className="mt-1 text-lg font-bold">{stoppedMeds(plan).map((m) => `${m.name} ${m.strength ?? ""}`.trim()).join(" · ")}</p>
        </section>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 text-[0.95em]">
        {plan.warning_signs.length ? (
          <section>
            <h3 className="font-bold text-stop">{label("warning_title")}</h3>
            <ul className="mt-1 list-disc pl-5">
              {plan.warning_signs.map((w, i) => <li key={i}><Bi id={`warn_${i}`} en={w.text} t={translations} /></li>)}
            </ul>
          </section>
        ) : null}
        {plan.follow_ups.length ? (
          <section>
            <h3 className="font-bold">{label("followup_title")}</h3>
            <ul className="mt-1 list-disc pl-5">
              {plan.follow_ups.map((f, i) => <li key={i}><Bi id={`follow_${i}`} en={f.text} t={translations} /></li>)}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
