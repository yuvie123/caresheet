"use client";
// The results screen: a short header, four tabs, and one panel at a time.
import { useId, useRef, useState } from "react";
import type { PlanResult } from "@/lib/claude";
import type { Medication } from "@/lib/schema";
import { downloadIcs } from "@/lib/ics";
import { shareText, stoppedMeds } from "@/lib/render";
import AskPharmacist from "./AskPharmacist";
import Feedback from "./Feedback";
import FridgeSheet from "./FridgeSheet";
import { Bell, Calendar, Chat, Check, ChevronDown, Files, Pencil, Plate, Printer, Question } from "./Icons";
import MedDetail from "./MedDetail";
import Medicines, { type MedFilter } from "./Medicines";
import ReadAloud from "./ReadAloud";
import Routine from "./Routine";

export type ResultTab = "routine" | "meds" | "ask" | "fridge";

const TABS: { id: ResultTab; short: string; full: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { id: "routine", short: "Routine", full: "Daily routine", Icon: Calendar },
  { id: "meds", short: "Medicines", full: "All medicines", Icon: Plate },
  { id: "ask", short: "Ask", full: "Ask the pharmacist", Icon: Question },
  { id: "fridge", short: "Fridge", full: "Fridge sheet", Icon: Files },
];

export default function ResultsView(props: {
  plan: PlanResult;
  lang: string;
  languages: readonly { code: string; name: string }[];
  langName: string | null;
  shownLangName: string | null;
  translations: Record<string, string | null> | null;
  translating: boolean;
  translateError: boolean;
  englishOnlyLines: number;
  isExample: boolean;
  onLanguage: (code: string) => void;
  onRetryTranslate: () => void;
  onEdit: () => void;
  onNew: () => void;
}) {
  const { plan, lang, languages, langName, shownLangName, translations, translating, translateError, englishOnlyLines, isExample } = props;
  const uid = useId();
  const [tab, setTabState] = useState<ResultTab>("routine");
  const [filter, setFilter] = useState<MedFilter>("all");
  const [openMed, setOpenMed] = useState<Medication | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const stopN = stoppedMeds(plan).length;
  const askN = plan.ask_pharmacist.length;
  const tabId = (t: ResultTab) => `${uid}-tab-${t}`;
  const panelId = (t: ResultTab) => `${uid}-panel-${t}`;

  // A change made by the person: show the top of the results, and put keyboard focus on the new panel.
  function setTab(next: ResultTab, focusPanel = true) {
    setTabState(next);
    const s = sentinel.current;
    if (s && s.getBoundingClientRect().top < 0) s.scrollIntoView({ block: "start" });
    if (focusPanel) requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
  }

  function onKey(e: React.KeyboardEvent, i: number) {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[n].id, false);
    tabRefs.current[TABS[n].id]?.focus();
  }

  const action = "btn btn-secondary min-h-12 w-full min-w-0 flex-col gap-0.5 !px-2 !py-1.5 text-center leading-tight !shadow-none [overflow-wrap:anywhere] sm:flex-row sm:gap-2 max-sm:text-[0.95rem] max-sm:!px-1 sm:!px-4";

  return (
    <div className="no-print">
      <header className="pb-2 pt-4 sm:pb-4 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 id="results-title" tabIndex={-1} className="text-2xl font-bold leading-tight tracking-tight outline-none sm:text-3xl">Your medicine plan</h1>
            {isExample ? <span className="rounded bg-ink px-2 text-[0.8125rem] font-bold text-white">Example only</span> : null}
          </div>
          <p className="flex gap-4">
            <button type="button" onClick={props.onEdit} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-action underline underline-offset-4">
              <Pencil className="h-5 w-5" /> Edit papers
            </button>
            <button type="button" onClick={props.onNew} className="inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">
              Start over
            </button>
          </p>
        </div>
        {isExample ? <p className="text-sm text-ask sm:text-base">This is a fictional patient, not your papers.</p> : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className={`${stopN > 0 || askN > 0 ? "hidden sm:flex" : "flex"} flex-wrap gap-x-5 gap-y-1 font-bold`}>
            {stopN > 0 ? (
              <button type="button" className="min-h-11 text-left text-stop underline underline-offset-4"
                onClick={() => { setFilter("stop"); setTab("meds"); }}>
                {stopN} to stop
              </button>
            ) : null}
            {askN > 0 ? (
              <button type="button" className="min-h-11 text-left text-ask underline underline-offset-4" onClick={() => setTab("ask")}>
                {askN} {askN === 1 ? "question" : "questions"}<span className="hidden sm:inline"> for the pharmacist</span>
              </button>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-1.5 text-ok"><Check className="h-5 w-5" /> Nothing unclear found</span>
            )}
          </p>
          <div className="grid w-full grid-cols-3 gap-2 [html.text-large_&]:max-sm:grid-cols-2 [html.text-xlarge_&]:max-sm:grid-cols-1 sm:w-auto sm:min-w-[24rem] sm:grid-cols-3">
            <button type="button" onClick={() => window.print()} className={action}><Printer className="h-5 w-5" /> Print</button>
            <button type="button" onClick={() => downloadIcs(plan)} className={action}><Bell className="h-5 w-5" /> Reminders</button>
            <a className={action} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText(plan))}`}>
              <Chat className="h-5 w-5" /> WhatsApp
            </a>
          </div>
        </div>
      </header>

      <div ref={sentinel} aria-hidden />
      <div className="sticky top-0 z-30 -mx-4 border-b border-rule bg-wash/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Plan sections" className="grid grid-cols-4 [html.text-xlarge_&]:max-sm:grid-cols-2">
          {TABS.map((t, i) => {
            const on = tab === t.id;
            const badge = t.id === "meds" ? plan.verified_medications.length : t.id === "ask" ? askN : 0;
            return (
              <button
                key={t.id}
                ref={(el) => { tabRefs.current[t.id] = el; }}
                id={tabId(t.id)}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={panelId(t.id)}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={`relative flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center text-[0.9rem] leading-tight [overflow-wrap:anywhere] sm:min-h-[3.5rem] sm:flex-row md:whitespace-nowrap sm:gap-2 sm:px-3 ${
                  on ? "bg-white font-bold text-ink" : "font-semibold text-muted hover:bg-white/60"
                }`}
              >
                <span className="relative">
                  <t.Icon className="h-6 w-6" />
                  {badge > 0 ? (
                    <span className={`num absolute -right-3 -top-2 min-w-[1.25rem] rounded-full px-1 text-center text-[0.8125rem] font-bold leading-5 sm:hidden ${
                      t.id === "ask" ? "bg-ask text-white" : "bg-ink text-white"}`}>{badge}</span>
                  ) : null}
                </span>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline md:hidden">{t.short}</span>
                <span className="hidden md:inline">{t.full}</span>
                {badge > 0 ? (
                  <span className={`num hidden min-w-[1.5rem] rounded-full px-1.5 text-center text-[0.8125rem] font-bold leading-6 sm:inline-block ${
                    t.id === "ask" ? "bg-ask text-white" : "bg-ink text-white"}`}>{badge}</span>
                ) : null}
                {on ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-action" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={panelRef}
        role="tabpanel"
        id={panelId(tab)}
        aria-labelledby={tabId(tab)}
        tabIndex={-1}
        className="pt-6 outline-none"
      >
        {tab === "routine" ? <Routine plan={plan} onOpenMed={setOpenMed} onNavigate={(t) => setTab(t)} /> : null}
        {tab === "meds" ? <Medicines plan={plan} onOpenMed={setOpenMed} filter={filter} onFilter={setFilter} /> : null}
        {tab === "ask" ? (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight">Ask the pharmacist</h2>
            <p className="mb-5 mt-1 text-muted">CareSheet did not put these on the schedule. Show this list at the pharmacy counter.</p>
            <AskPharmacist plan={plan} />
            {!isExample ? <Feedback flags={askN} /> : null}
          </div>
        ) : null}
        {tab === "fridge" ? (
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Fridge sheet</h2>
            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-3">
              <div className="w-full sm:w-60 md:w-72">
                <label htmlFor={`${uid}-lang`} className="block font-semibold">Language</label>
                <div className="relative mt-1">
                  <select
                    id={`${uid}-lang`}
                    value={lang}
                    onChange={(e) => props.onLanguage(e.target.value)}
                    className="field min-h-14 w-full appearance-none py-2 pl-3 pr-11 font-semibold"
                  >
                    {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                </div>
              </div>
              <button type="button" onClick={() => window.print()} className="btn btn-primary min-h-14 w-full sm:w-auto">
                <Printer className="h-5 w-5" /> Print for the fridge
              </button>
              <ReadAloud plan={plan} translations={translations} lang={lang} />
            </div>
            <div className="mt-3 space-y-1" aria-live="polite">
              <p className="text-muted">
                {translating
                  ? `Translating into ${langName}…`
                  : shownLangName
                    ? `English and ${shownLangName}. Numbers are never translated, only words.`
                    : "English."}
              </p>
              {translateError ? (
                <p role="alert" className="text-stop">
                  The translation didn&apos;t work, so this sheet is English only.{" "}
                  <button type="button" className="min-h-11 font-semibold text-action underline" onClick={props.onRetryTranslate}>Try again</button>
                </p>
              ) : null}
              {englishOnlyLines > 0 ? (
                <p className="text-ask">
                  {englishOnlyLines} line{englishOnlyLines > 1 ? "s were" : " was"} kept in English because the translation
                  changed a number. Please have someone read {englishOnlyLines > 1 ? "them" : "it"} aloud.
                </p>
              ) : null}
            </div>
            <div className="mt-4 rounded-lg bg-desk p-3 ring-1 ring-inset ring-ink/5 sm:p-6">
              <FridgeSheet plan={plan} translations={translations} languageName={shownLangName} langCode={lang} isExample={isExample} />
            </div>
            <details className="group mt-6 border-y border-rule">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
                What CareSheet read (transcript)
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="pb-5">
                <p className="text-[0.95rem] text-muted">
                  Every medicine on the schedule was matched against this text by code, not by AI. Photos are read automatically, so check names against the bottle.
                </p>
                {plan.transcript.map((d) => (
                  <pre key={d.doc_index} className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-mist p-4 font-sans text-[0.95rem] leading-relaxed ring-1 ring-rule">{d.text}</pre>
                ))}
              </div>
            </details>
          </div>
        ) : null}
        <p className="mt-8 border-t border-rule pt-3 text-[0.95rem] text-muted">
          Not medical advice. Check anything unsure with your pharmacist.
        </p>
      </div>

      <MedDetail plan={plan} med={openMed} lang={lang === "es" ? "es" : "en"} onClose={() => setOpenMed(null)} />
    </div>
  );
}
