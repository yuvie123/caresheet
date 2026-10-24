// The printout. Page 1 goes on the fridge: STOP first, then each time of day with a row of tick
// boxes for the week. Page 2 holds as-needed medicines, warning signs, appointments, and the
// questions to hand to the pharmacist. Numbers come from code; only words are translated.
"use client";
import type { PlanResult } from "@/lib/claude";
import {
  activeOnDay,
  asNeededMeds,
  doseNumber,
  durationDays,
  scheduledMeds,
  stoppedMeds,
  UI_STRINGS,
  usedSlots,
  type UiKey,
} from "@/lib/render";
import type { Medication, Slot } from "@/lib/schema";
import { Ban, Plate, Question, SLOT_ICON, SLOT_LID } from "./Icons";

type T = Record<string, string | null>;
const DAYS = [0, 1, 2, 3, 4, 5, 6];

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

function TickRow({ med, slot }: { med: Medication; slot: Slot }) {
  return (
    <div className="mt-1 flex gap-1" aria-label={`Tick boxes for ${med.name}, ${slot}`}>
      {DAYS.map((d) => {
        const on = activeOnDay(med, d);
        return (
          <span
            key={d}
            className={`flex h-5 w-5 items-center justify-center rounded-[3px] border-[1.5px] text-[9px] leading-none ${
              on ? "border-ink text-muted" : "border-rule bg-wash text-rule"
            }`}
          >
            {d + 1}
          </span>
        );
      })}
    </div>
  );
}

function MedLine({ med, index, slot, t }: { med: Medication; index: number; slot: Slot; t: T | null }) {
  const days = durationDays(med);
  return (
    <li className="flex gap-3 border-b border-rule py-1.5 last:border-0" style={{ breakInside: "avoid" }}>
      <div className="min-w-0 flex-1">
        <span className="font-bold">{med.name}</span> {med.strength}
        {med.with_food === "with_food" ? (
          <Plate className="ml-1 inline h-4 w-4 align-[-2px]" title={UI_STRINGS.with_food} />
        ) : null}
        <div className="text-[0.85em] text-muted">
          <Bi id={`freq_${index}`} en={med.frequency_verbatim} t={t} />
          {med.duration_verbatim || days ? (
            <Bi
              id={`dur_${index}`}
              en={med.duration_verbatim ?? `${days} days`}
              t={t}
              className="font-bold text-ink"
            />
          ) : null}
        </div>
        <TickRow med={med} slot={slot} />
      </div>
      {med.dose_amount !== null ? (
        <div className="shrink-0 text-right">
          <span className="text-3xl font-bold leading-none">{doseNumber(med)}</span>
          <Bi id={`unit_${index}`} en={med.dose_unit ?? ""} t={t} className="text-xs" />
        </div>
      ) : null}
    </li>
  );
}

export default function FridgeSheet({
  plan,
  translations,
  languageName,
  isExample = false,
}: {
  plan: PlanResult;
  translations: T | null;
  languageName: string | null;
  isExample?: boolean;
}) {
  const all = plan.verified_medications;
  const idx = (m: Medication) => all.indexOf(m);
  const label = (k: UiKey) => <Bi id={k} en={UI_STRINGS[k]} t={translations} />;
  const slots = usedSlots(plan);
  const stopped = stoppedMeds(plan);
  const asNeeded = asNeededMeds(plan);

  return (
    <div className="space-y-6 print:block print:space-y-0">
      {/* ---------- Page 1: the fridge ---------- */}
      <article className="mx-auto max-w-[8.5in] bg-paper p-6 text-ink print:p-0" aria-label="Fridge sheet, page 1">
        <header className="flex items-end justify-between gap-4 border-b-4 border-ink pb-2">
          <h2 className="text-3xl font-bold leading-tight">{label("sheet_title")}</h2>
          <p className="text-right text-xs text-muted">
            {languageName ? `English + ${languageName}` : "English"}
            <br />
            {label("not_advice")}
          </p>
        </header>

        {isExample ? (
          <p className="mt-2 rounded border-2 border-dashed border-ink px-3 py-1 text-sm font-bold">
            EXAMPLE ONLY: fictional patient. Not anyone&apos;s real medicine plan.
          </p>
        ) : null}
        {stopped.length ? (
          <section className="mt-3 rounded-lg border-2 border-stop bg-stop-wash px-3 py-2 text-stop">
            <h3 className="flex items-center gap-2 font-bold">
              <Ban className="h-6 w-6" /> {label("stop_title")}
            </h3>
            <p className="mt-1 text-xl font-bold">
              {stopped.map((m) => `${m.name} ${m.strength ?? ""}`.trim()).join("  ·  ")}
            </p>
          </section>
        ) : null}

        <div className={`mt-3 grid gap-3 ${slots.length > 1 ? "grid-cols-2" : ""}`}>
          {slots.map((slot) => {
            const meds = scheduledMeds(plan).filter((m) => m.slots.includes(slot));
            const Icon = SLOT_ICON[slot];
            return (
              <section key={slot} className="overflow-hidden rounded-lg border-2 border-ink" style={{ breakInside: "avoid" }}>
                <h3 className={`flex items-center gap-2 px-3 py-1.5 text-lg font-bold ${SLOT_LID[slot]}`}>
                  <Icon className="h-7 w-7" /> {label(`slot_${slot}` as UiKey)}
                </h3>
                <ul className="px-3 py-1">
                  {meds.map((m) => (
                    <MedLine key={idx(m)} med={m} index={idx(m)} slot={slot} t={translations} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{label("tick_hint")}</p>
      </article>

      {/* ---------- Page 2: also important + pharmacist ---------- */}
      <article
        className="mx-auto max-w-[8.5in] bg-paper p-6 text-ink print:break-before-page print:p-0"
        aria-label="Fridge sheet, page 2"
      >
        <h2 className="border-b-4 border-ink pb-2 text-2xl font-bold">{label("page2_title")}</h2>

        {asNeeded.length ? (
          <section className="mt-3 rounded-lg border-2 border-dashed border-ink px-3 py-1">
            <h3 className="pt-1 font-bold">{label("as_needed_title")}</h3>
            <ul>
              {asNeeded.map((m) => (
                <li key={idx(m)} className="border-b border-rule py-1.5 last:border-0">
                  <span className="font-bold">{m.name}</span> {m.strength}
                  <div className="text-[0.85em] text-muted">
                    <Bi id={`freq_${idx(m)}`} en={m.frequency_verbatim} t={translations} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-4 text-[0.95em]">
          <section>
            <h3 className="font-bold text-stop">{label("warning_title")}</h3>
            <ul className="mt-1 list-disc pl-5">
              {plan.warning_signs.map((w, i) => (
                <li key={i}>
                  <Bi id={`warn_${i}`} en={w.text} t={translations} />
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-bold">{label("followup_title")}</h3>
            <ul className="mt-1 list-disc pl-5">
              {plan.follow_ups.map((f, i) => (
                <li key={i}>
                  <Bi id={`follow_${i}`} en={f.text} t={translations} />
                </li>
              ))}
            </ul>
          </section>
        </div>

        {plan.ask_pharmacist.length ? (
          <section className="mt-5 rounded-lg border-2 border-ask bg-ask-wash px-4 py-3">
            <h3 className="flex items-center gap-2 font-bold text-ask">
              <Question className="h-5 w-5" /> {label("pharmacist_title")}
            </h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              {plan.ask_pharmacist.map((q, i) => (
                <li key={i}>
                  {q.issue}
                  {q.quotes.length ? (
                    <span className="block text-sm text-muted">From the papers: &ldquo;{q.quotes.join("” / “")}&rdquo;</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </div>
  );
}
