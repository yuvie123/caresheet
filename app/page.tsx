"use client";
// The whole app is this one page:
// 1. Add the hospital papers (paste, photos, or PDF) and pick the family's language.
// 2. Watch the steps run (read, double-check, check ingredients).
// 3. See the pill organizer, the med list, pharmacist questions, and print the fridge sheet.
import { useEffect, useRef, useState } from "react";
import AskPharmacist from "@/components/AskPharmacist";
import FileThumbs from "@/components/FileThumbs";
import FridgeSheet from "@/components/FridgeSheet";
import HowItWorks from "@/components/HowItWorks";
import MedList from "@/components/MedList";
import Notes from "@/components/Notes";
import Organizer from "@/components/Organizer";
import ReadAloud from "@/components/ReadAloud";
import type { PlanResult, Progress } from "@/lib/claude";
import { compressImage } from "@/lib/compress";
import { downloadIcs } from "@/lib/ics";
import { shareText, translatableStrings } from "@/lib/render";
import { SAMPLES } from "@/lib/samples";

const LANGS = [
  { code: "", name: "English only" },
  { code: "pa", name: "ਪੰਜਾਬੀ Punjabi" },
  { code: "hi", name: "हिन्दी Hindi" },
  { code: "es", name: "Español Spanish" },
] as const;

const STEPS: { key: Progress; label: string }[] = [
  { key: "reading", label: "Reading the papers" },
  { key: "verifying", label: "Checking every line against the papers" },
  { key: "retrying", label: "Fixing something that didn't match" },
  { key: "checking_ingredients", label: "Looking up ingredients in RxNorm" },
];

type Status = "idle" | "working" | "done" | "error";

export default function Home() {
  const [texts, setTexts] = useState<string[]>([""]);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lang, setLang] = useState<string>("pa");
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<Progress | null>(null);
  const [seen, setSeen] = useState<Progress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string | null> | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);
  const translateRequest = useRef(0); // ignore replies for a language that's no longer selected
  const resultsRef = useRef<HTMLDivElement>(null);

  const langName = LANGS.find((l) => l.code === lang)?.name.split(" ").slice(1).join(" ") || null;
  // Language label only when a translation is actually showing.
  const shownLangName = translations && lang ? langName : null;
  const englishOnlyLines = translations ? Object.values(translations).filter((v) => v === null).length : 0;

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setFileError(null);
    const picked = Array.from(list).slice(0, 4 - files.length);
    const ready: File[] = [];
    const failed: string[] = [];
    for (const f of picked) {
      try {
        ready.push(await compressImage(f));
      } catch {
        failed.push(f.name);
      }
    }
    if (failed.length)
      setFileError(`${failed.join(", ")} couldn't be opened. Please use a JPG or PNG photo (or a screenshot) or a PDF.`);
    setFiles((prev) => [...prev, ...ready].slice(0, 4));
  }

  // Loads two fictional "phone photos" (discharge sheet + Tylenol bottle) as if taken with the camera.
  async function loadPhotoSample() {
    const names = ["discharge-photo.jpg", "bottle-photo.jpg"];
    try {
      const photos = await Promise.all(
        names.map(async (n) => {
          const res = await fetch(`/samples/${n}`);
          if (!res.ok) throw new Error(n);
          return new File([await res.blob()], n, { type: "image/jpeg" });
        }),
      );
      setTexts([""]);
      setFiles(photos);
      setFileError(null);
    } catch {
      setFileError("The sample photos couldn't be loaded. Check the connection and try again.");
    }
  }

  function loadSample(key: keyof typeof SAMPLES) {
    const s = SAMPLES[key];
    setTexts(s.bottle ? [s.text, s.bottle] : [s.text]);
    setFiles([]);
  }

  // A real result saved from the live site (fictional patient). Shown instantly, no API call:
  // useful for anyone browsing, and the backup if Wi-Fi or credits fail during a demo.
  // It is clearly labelled as an example everywhere, including the printout.
  async function showSavedExample() {
    try {
      const res = await fetch("/demo/heart.json");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { plan: PlanResult; translations_pa: Record<string, string | null> };
      translateRequest.current++; // cancel any translation in flight
      setError(null);
      setLang("pa");
      setPlan(data.plan);
      setIsExample(true);
      setTranslations(data.translations_pa);
      setTranslateError(false);
      setTranslating(false);
      setStatus("done");
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }));
    } catch {
      setError("The saved example couldn't be loaded. Check the connection and try again.");
      setStatus("error");
    }
  }

  // caresheet.vercel.app/?example opens the saved example straight away (handy link for judges).
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("example")) return;
    const t = setTimeout(() => void showSavedExample(), 0); // after first render, not during it
    return () => clearTimeout(t);
  }, []);

  async function translate(p: PlanResult, code: string) {
    const id = ++translateRequest.current;
    setTranslations(null);
    setTranslateError(false);
    if (!code) {
      setTranslating(false);
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: code, strings: translatableStrings(p) }),
      });
      const data = await res.json().catch(() => null);
      if (id !== translateRequest.current) return; // a newer language was chosen
      if (res.ok && data?.translations) setTranslations(data.translations);
      else setTranslateError(true);
    } catch {
      if (id === translateRequest.current) setTranslateError(true);
    } finally {
      if (id === translateRequest.current) setTranslating(false);
    }
  }

  async function run() {
    setStatus("working");
    setError(null);
    setPlan(null);
    setIsExample(false);
    setTranslations(null);
    setTranslateError(false);
    setSeen([]);
    setStage(null);

    const form = new FormData();
    texts.filter((t) => t.trim()).forEach((t) => form.append("text", t));
    files.forEach((f) => form.append("files", f));

    try {
      const res = await fetch("/api/plan", { method: "POST", body: form });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let gotResult = false;
      const handle = (line: string) => {
        if (!line.trim()) return;
        let msg: { stage?: Progress; error?: string; result?: PlanResult };
        try {
          msg = JSON.parse(line);
        } catch {
          throw new Error("The answer from the server was cut off. Please try again.");
        }
        if (msg.stage) {
          const s = msg.stage;
          setStage(s);
          setSeen((prev) => (prev.includes(s) ? prev : [...prev, s]));
        }
        if (msg.error) throw new Error(msg.error);
        if (msg.result) {
          gotResult = true;
          setPlan(msg.result);
          setStatus("done");
          requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }));
          void translate(msg.result, lang);
        }
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          handle(line);
        }
      }
      handle(buf + decoder.decode());
      if (!gotResult) throw new Error("The connection ended before the plan was finished. Please try again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const canRun = status !== "working" && (texts.some((t) => t.trim()) || files.length > 0);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <div className="no-print">
        <header className="max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">CareSheet</h1>
          <p className="mt-3 text-xl">
            Bringing a parent home from hospital? Add the discharge papers and the pill bottles from the kitchen.
            CareSheet builds a weekly medicine plan, flags anything that doesn&apos;t add up, and prints it for the fridge in your family&apos;s language.
          </p>
          <p className="mt-3 rounded-lg bg-paper px-4 py-2 text-base text-muted">
            Not medical advice. CareSheet only reorganizes what the hospital wrote. Anything it isn&apos;t sure about goes on a list for your pharmacist.
            Nothing you add is stored.
          </p>
        </header>

        {/* Step 1: input */}
        <section aria-labelledby="add" className="mt-8 rounded-2xl bg-paper p-5 sm:p-6">
          <h2 id="add" className="text-2xl font-bold">Add the papers</h2>

          {texts.map((t, i) => (
            <label key={i} className="mt-4 block">
              <span className="font-bold">{i === 0 ? "Discharge instructions" : "Pill bottle label or other note"}</span>
              <textarea
                value={t}
                onChange={(e) => setTexts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                rows={i === 0 ? 8 : 3}
                placeholder={i === 0 ? "Paste the discharge medication list here, or add photos below." : ""}
                className="mt-1 block w-full rounded-lg border-2 border-rule bg-wash/40 p-3 text-base focus:border-action"
              />
            </label>
          ))}
          {texts.length < 3 ? (
            <button type="button" onClick={() => setTexts((p) => [...p, ""])} className="mt-2 text-action underline">
              Add another note (for example a pill bottle label)
            </button>
          ) : null}

          <div className="mt-5">
            <span className="font-bold">Photos or PDF</span>
            <p className="text-muted">Discharge pages, pill bottles, or the PDF from the patient portal. Up to 4.</p>
            <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border-2 border-dashed border-action px-4 py-2 font-bold text-action">
              Choose photos or PDF
              <input type="file" accept="image/*,application/pdf" capture="environment" multiple className="sr-only"
                onChange={(e) => void onFiles(e.target.files)} />
            </label>
            <FileThumbs files={files} onRemove={(i) => setFiles((p) => p.filter((_, j) => j !== i))} />
            {fileError ? <p role="alert" className="mt-2 text-stop">{fileError}</p> : null}
          </div>

          <label className="mt-5 block max-w-sm">
            <span className="font-bold">Your parent&apos;s language</span>
            <select value={lang} onChange={(e) => { setLang(e.target.value); if (plan) void translate(plan, e.target.value); }}
              className="mt-1 block w-full rounded-lg border-2 border-rule bg-paper p-2.5 text-base">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" disabled={!canRun} onClick={() => void run()}
              className="rounded-xl bg-action px-6 py-3 text-lg font-bold text-white disabled:opacity-40">
              {status === "working" ? "Building the plan…" : "Build the plan"}
            </button>
            <span className="text-muted">No papers handy?</span>
            {(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]).map((k) => (
              <button key={k} type="button" onClick={() => loadSample(k)} className="text-action underline">
                Try: {SAMPLES[k].label}
              </button>
            ))}
            <button type="button" onClick={() => void loadPhotoSample()} className="text-action underline">
              Try: Photos of the papers
            </button>
            <button type="button" onClick={() => void showSavedExample()} className="text-action underline">
              See a finished example
            </button>
          </div>
        </section>

        {/* Step 2: progress */}
        {status === "working" || (status === "error" && seen.length) ? (
          <ol className="mt-6 space-y-1 rounded-2xl bg-paper p-5" aria-live="polite">
            {STEPS.filter((s) => s.key !== "retrying" || seen.includes("retrying")).map((s) => {
              const done = seen.includes(s.key) && stage !== s.key;
              const now = stage === s.key && status === "working";
              return (
                <li key={s.key} className={done ? "text-ink" : now ? "font-bold" : "text-muted"}>
                  {done ? "✓ " : now ? "… " : "  "}{s.label}
                </li>
              );
            })}
          </ol>
        ) : null}

        {error ? (
          <div role="alert" className="mt-6 rounded-xl border-l-4 border-stop bg-stop-wash p-4">
            <p>{error}</p>
            <button type="button" onClick={() => void showSavedExample()} className="mt-2 text-action underline">
              Show the saved example instead
            </button>
          </div>
        ) : null}
      </div>

      {/* Step 3: results */}
      {plan ? (
        <div ref={resultsRef} className="mt-10 space-y-10 print:mt-0 print:space-y-0">
          <div className="no-print space-y-10">
            {isExample ? (
              <p role="status" className="rounded-xl border-2 border-ask bg-ask-wash p-4 font-bold">
                Example only: this is a fictional patient, not your papers. Add your own papers above to make your plan.
              </p>
            ) : null}
            <section aria-labelledby="week">
              <h2 id="week" className="text-3xl font-bold">This week</h2>
              <p className="mb-4 text-muted">
                {plan.verified_medications.length} medicines checked against the papers
                {plan.ask_pharmacist.length ? `, ${plan.ask_pharmacist.length} things to ask the pharmacist` : ""}.
              </p>
              <Organizer plan={plan} />
            </section>

            <section aria-labelledby="ask">
              <h2 id="ask" className="text-3xl font-bold">Ask your pharmacist</h2>
              <p className="mb-4 text-muted">CareSheet didn&apos;t put these on the schedule. Show this list at the pharmacy counter.</p>
              <AskPharmacist plan={plan} />
            </section>

            <section aria-labelledby="meds">
              <h2 id="meds" className="text-3xl font-bold">All medicines</h2>
              <div className="mt-4"><MedList plan={plan} lang={lang === "es" ? "es" : "en"} /></div>
            </section>

            <section><Notes plan={plan} /></section>

            <section aria-labelledby="fridge">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="fridge" className="text-3xl font-bold">Fridge sheet</h2>
                  <p className="text-muted">
                    {translating
                      ? `Translating into ${langName}…`
                      : shownLangName
                        ? `English and ${shownLangName}. Numbers are never translated, only words.`
                        : "English."}
                  </p>
                  {translateError ? (
                    <p role="alert" className="mt-1 text-stop">
                      The translation didn&apos;t work, so this sheet is English only.{" "}
                      <button type="button" className="text-action underline" onClick={() => void translate(plan, lang)}>
                        Try again
                      </button>
                    </p>
                  ) : null}
                  {englishOnlyLines > 0 ? (
                    <p className="mt-1 text-ask">
                      {englishOnlyLines} line{englishOnlyLines > 1 ? "s were" : " was"} kept in English because the translation
                      changed a number. Please have someone read {englishOnlyLines > 1 ? "them" : "it"} aloud.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button onClick={() => window.print()} className="rounded-xl bg-action px-4 py-2 font-bold text-white">
                  Print for the fridge
                </button>
                <button type="button" onClick={() => downloadIcs(plan)} className="rounded-xl border-2 border-action px-4 py-2 font-bold text-action">
                  Add reminders to my phone
                </button>
                <a className="rounded-xl border-2 border-action px-4 py-2 font-bold text-action" target="_blank" rel="noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(shareText(plan))}`}>
                  Send to family on WhatsApp
                </a>
                <ReadAloud plan={plan} translations={translations} lang={lang} />
              </div>
              <p className="mt-2 text-sm text-muted">
                Reminders go into your own phone calendar at 8:00, 12:30, 18:00 and 21:30 for the next week. You can change the times there.
              </p>
              <div className="mt-4 rounded-2xl bg-wash p-2 shadow-inner sm:p-4">
                <FridgeSheet plan={plan} translations={translations} languageName={shownLangName} isExample={isExample} />
              </div>
            </section>

            <details className="rounded-2xl bg-paper p-5">
              <summary className="cursor-pointer font-bold">What CareSheet read (transcript)</summary>
              <p className="mt-2 text-sm text-muted">
                Every medicine on the schedule was matched against this text by code, not by AI. Photos are transcribed by Claude, so check names against the bottle.
              </p>
              {plan.transcript.map((d) => (
                <pre key={d.doc_index} className="mt-3 whitespace-pre-wrap rounded-lg bg-wash p-3 font-sans text-sm">{d.text}</pre>
              ))}
            </details>
          </div>

          <div className="print-only">
            <FridgeSheet plan={plan} translations={translations} languageName={shownLangName} isExample={isExample} />
          </div>
        </div>
      ) : null}
      <div className="no-print"><HowItWorks /></div>
    </main>
  );
}
