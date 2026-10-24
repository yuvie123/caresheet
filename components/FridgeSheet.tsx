// The printout, up to three sheets with one purpose each:
//   1. Fridge: STOP first, then each time of day with a row of tick boxes for the week.
//   2. Also important: unscheduled and as-needed medicines, warning signs, appointments, 911, phone numbers.
//   3. For the pharmacist: the questions, each quoting the papers, plus a sign-off line.
// Numbers come from code; only words are translated.
"use client";
import { createContext, useContext } from "react";
import type { PlanResult } from "@/lib/claude";
import {
  activeOnDay,
  asNeededMeds,
  confirmFirst,
  doseNumber,
  durationDays,
  scheduledMeds,
  stoppedMeds,
  unscheduledMeds,
  UI_STRINGS,
  usedSlots,
  type UiKey,
} from "@/lib/render";
import type { Medication, Slot } from "@/lib/schema";
import { Ban, Plate, SLOT_ICON, SLOT_LID } from "./Icons";

type T = Record<string, string | null>;

// The language code of the translation, so translated text can be tagged lang="pa" for screen readers.
const LangCtx = createContext<string>("");
const DAYS = [0, 1, 2, 3, 4, 5, 6];

/** English plus the translation underneath (or beside it with `inline`); English only if the translation was rejected. */
function Bi({ id, en, t, className, inline }: { id: string; en: string; t: T | null; className?: string; inline?: boolean }) {
  const tr = t?.[id];
  const show = Boolean(tr && tr !== en);
  const lang = useContext(LangCtx) || undefined;
  if (inline)
    return (
      <span className={className}>
        {en}
        {show ? <span lang={lang}> · {tr}</span> : null}
      </span>
    );
  return (
    <span className={className}>
      <span className="block">{en}</span>
      {show ? <span lang={lang} className="block text-[0.95em] leading-normal">{tr}</span> : null}
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

function MedLine({ med, index, slot, t, doubtful }: { med: Medication; index: number; slot: Slot; t: T | null; doubtful: boolean }) {
  const days = durationDays(med);
  return (
    <li className="flex min-w-0 gap-3 border-b border-rule py-1.5 last:border-0" style={{ breakInside: "avoid" }}>
      <div className="min-w-0 flex-1">
        <span className="font-bold">{med.name}</span> {med.strength}
        {med.with_food === "with_food" ? (
          <Plate className="ml-1 inline h-4 w-4 align-[-2px]" title={UI_STRINGS.with_food} />
        ) : null}
        {med.with_food !== "not_stated" ? (
          <div className="text-[0.85em] font-bold">
            <Bi inline id={med.with_food === "with_food" ? "with_food" : "empty_stomach"} en={med.with_food === "with_food" ? UI_STRINGS.with_food : UI_STRINGS.empty_stomach} t={t} />
          </div>
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
        {doubtful ? (
          <div className="mt-1 inline-block rounded border-2 border-ask px-1.5 text-xs font-bold text-ask">
            <Bi id="confirm_first" en={UI_STRINGS.confirm_first} t={t} />
          </div>
        ) : null}
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
  langCode = "",
  isExample = false,
}: {
  plan: PlanResult;
  translations: T | null;
  languageName: string | null;
  langCode?: string;
  isExample?: boolean;
}) {
  const all = plan.verified_medications;
  const idx = (m: Medication) => all.indexOf(m);
  const label = (k: UiKey) => <Bi id={k} en={UI_STRINGS[k]} t={translations} />;
  const slots = usedSlots(plan);
  const stopped = stoppedMeds(plan);
  const asNeeded = asNeededMeds(plan);
  const unscheduled = unscheduledMeds(plan);

  return (
    <LangCtx.Provider value={translations ? langCode : ""}>
    <div className="space-y-6 print:block print:space-y-0">
      {/* ---------- Page 1: the fridge ---------- */}
      <article className="mx-auto max-w-[8.5in] bg-paper p-4 text-ink sm:p-6 print:p-0" aria-label="Fridge sheet, page 1">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-4 border-ink pb-2">
          <h2 className="text-3xl font-bold leading-tight">{label("sheet_title")}</h2>
          <p className="text-right text-xs text-muted">
            {languageName ? `English + ${languageName} (machine translation; English is the source)` : "English"}
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

        <div className={`mt-3 grid gap-3 ${slots.length > 1 ? "sm:grid-cols-2 print:grid-cols-2" : ""}`}>
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
                    <MedLine key={idx(m)} med={m} index={idx(m)} slot={slot} t={translations} doubtful={confirmFirst(plan, m)} />
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
        className="mx-auto max-w-[8.5in] bg-paper p-4 text-ink sm:p-6 print:break-before-page print:p-0"
        aria-label="Fridge sheet, page 2"
      >
        <h2 className="border-b-4 border-ink pb-2 text-2xl font-bold">{label("page2_title")}</h2>

        {unscheduled.length ? (
          <section className="mt-3 rounded-lg border-2 border-dashed border-ask bg-ask-wash px-3 py-1">
            <h3 className="pt-1 font-bold text-ask">{label("unscheduled_title")}</h3>
            <ul>
              {unscheduled.map((m) => (
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

        <div className="mt-3 grid gap-4 text-[0.95em] sm:grid-cols-2 print:grid-cols-2">
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

        <p className="mt-3 rounded-lg border-2 border-stop px-3 py-1.5 font-bold text-stop">
          <Bi id="emergency_line" en={UI_STRINGS.emergency_line} t={translations} />
        </p>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-lg border-2 border-ink px-3 py-2">
            <h3 className="font-bold">
              <Bi id="phones_title" en={UI_STRINGS.phones_title} t={translations} />
            </h3>
            {(["doctor", "pharmacy"] as const).map((k) => (
              <div key={k} className="mt-2 flex items-end gap-2">
                <span className="shrink-0 text-sm">
                  <Bi id={k} en={UI_STRINGS[k]} t={translations} />
                </span>
                <span className="h-6 flex-1 border-b-2 border-ink" />
              </div>
            ))}
            <div className="mt-2 text-sm">911</div>
          </div>
        </section>
      </article>

      {/* ---------- Page 3: for the pharmacist ---------- */}
      {plan.ask_pharmacist.length ? (
        <article
          className="mx-auto max-w-[8.5in] bg-paper p-4 text-ink sm:p-6 print:break-before-page print:p-0"
          aria-label="Fridge sheet, page 3: for the pharmacist"
        >
          <h2 className="border-b-4 border-ink pb-2 text-2xl font-bold">{label("pharmacist_title")}</h2>
        {plan.ask_pharmacist.length ? (
          <section className="mt-3 rounded-lg border-2 border-ask bg-ask-wash px-4 py-3">
            <ol className="list-decimal space-y-2 pl-5">
              {plan.ask_pharmacist.map((q, i) => (
                <li key={i}>
                  {q.issue}
                  {translations?.[`pharm_${i}`] ? <span lang={langCode || undefined} className="block text-[0.95em] leading-normal">{translations[`pharm_${i}`]}</span> : null}
                  {q.quotes.length ? (
                    <span className="block text-sm text-muted">{UI_STRINGS.from_papers}: &ldquo;{q.quotes.join("” / “")}&rdquo;</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="mt-5 max-w-lg">
          <div className="rounded-lg border-2 border-ink px-3 py-2">
            <h3 className="font-bold">
              <Bi id="reviewed_title" en={UI_STRINGS.reviewed_title} t={translations} />
            </h3>
            <div className="mt-2 flex items-end gap-2">
              <span className="h-5 w-5 shrink-0 rounded-[3px] border-2 border-ink" />
              <span className="shrink-0 text-sm">
                <Bi id="name_date" en={UI_STRINGS.name_date} t={translations} />
              </span>
              <span className="h-6 flex-1 border-b-2 border-ink" />
            </div>
          </div>
        </section>
        </article>
      ) : null}
    </div>
    </LangCtx.Provider>
  );
}
