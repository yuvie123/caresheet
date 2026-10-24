"use client";
// The whole app is this one page:
// 1. Add the hospital papers (paste, photos, or PDF) and pick the family's language.
// 2. Watch the steps run (read, double-check, check ingredients).
// 3. See the results on one short screen with four tabs, and print the fridge sheet.
import { useEffect, useRef, useState } from "react";
import FileThumbs from "@/components/FileThumbs";
import Hero from "@/components/Hero";
import { ArrowRight, Camera, Capsule, ChevronDown, Files, Plus } from "@/components/Icons";
import FridgeSheet from "@/components/FridgeSheet";
import HowItWorks from "@/components/HowItWorks";
import ResultsView from "@/components/ResultsView";
import TextSize from "@/components/TextSize";
import type { PlanResult, Progress } from "@/lib/claude";
import { compressImage } from "@/lib/compress";
import { translatableStrings } from "@/lib/render";
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
type View = "input" | "results";

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
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const translateRequest = useRef(0); // ignore replies for a language that's no longer selected
  const [view, setView] = useState<View>("input");
  const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const langName = LANGS.find((l) => l.code === lang)?.name.split(" ").slice(1).join(" ") || null;
  // Language label only when a translation is actually showing.
  const shownLangName = translations && lang ? langName : null;
  const englishOnlyLines = translations ? Object.values(translations).filter((v) => v === null).length : 0;

  // Switch to the results screen, go to the top, and move focus to its heading once it has rendered.
  function showResults() {
    setView("results");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
      document.getElementById("results-title")?.focus({ preventScroll: true });
    }, 0);
  }

  function startOver() {
    translateRequest.current++;
    setPlan(null);
    setIsExample(false);
    setTranslations(null);
    setTranslateError(false);
    setTranslating(false);
    setTexts([""]);
    setFiles([]);
    setFileError(null);
    setError(null);
    setStatus("idle");
    setView("input");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setFileError(null);
    const room = 4 - files.length;
    const picked = Array.from(list).slice(0, Math.max(room, 0));
    if (Array.from(list).length > picked.length) setFileError("Up to 4 photos or PDFs. Remove one to add another.");
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
    const total = [...files, ...ready].reduce((n, f) => n + f.size, 0);
    if (total > 4 * 1024 * 1024) {
      setFileError("Those files are too large together. Remove one, or paste the text instead.");
      return;
    }
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

  // Real results saved from the live pipeline (fictional patients). Shown instantly with no API call:
  // useful for anyone browsing, and the backup if Wi-Fi or credits fail during a demo. They are clearly
  // labelled as examples everywhere, including the printout, and are pre-loaded so they work offline.
  type Saved = { plan: PlanResult; translations_pa: Record<string, string | null> };
  const savedCache = useRef<Record<string, Saved>>({});
  const savedPa = useRef<Record<string, string | null> | null>(null);

  async function loadSaved(name: "heart" | "messy"): Promise<Saved> {
    const cached = savedCache.current[name];
    if (cached) return cached;
    const res = await fetch(`/demo/${name}.json`);
    if (!res.ok) throw new Error();
    const data = (await res.json()) as Saved;
    savedCache.current[name] = data;
    return data;
  }

  async function showSavedExample(name: "heart" | "messy" = "heart") {
    try {
      const data = await loadSaved(name);
      translateRequest.current++; // cancel any translation in flight
      savedPa.current = data.translations_pa;
      setError(null);
      setLang("pa");
      setPlan(data.plan);
      setIsExample(true);
      setTranslations(data.translations_pa);
      setTranslateError(false);
      setTranslating(false);
      setStatus("done");
      showResults();
    } catch {
      setError("The saved example couldn't be loaded. Check the connection and try again.");
      setStatus("error");
    }
  }

  // caresheet.vercel.app/?example (or ?example=messy) opens a saved example straight away, and both
  // examples are fetched in the background so they still open if the connection drops later.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void loadSaved("heart").catch(() => {});
    void loadSaved("messy").catch(() => {});
    if (!params.has("example")) return;
    const name = params.get("example") === "messy" ? "messy" : "heart";
    const t = setTimeout(() => void showSavedExample(name), 0); // after first render, not during it
    return () => clearTimeout(t);
    // Runs once on load; these functions only use setters and refs, so it is safe to omit them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changing language while an example is open: the saved Punjabi is restored locally; other languages
  // need a live translation, which the example doesn't have, so show English and say so.
  function onLanguage(code: string) {
    setLang(code);
    if (!plan) return;
    if (isExample) {
      translateRequest.current++;
      setTranslateError(false);
      setTranslating(false);
      setTranslations(code === "pa" ? savedPa.current : null);
      return;
    }
    void translate(plan, code);
  }

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

    const controller = new AbortController();
    abortRef.current = controller;
    cancelledRef.current = false;
    const timer = setTimeout(() => controller.abort(), 115_000);
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false)
        throw new Error("You're offline. Connect to the internet to read new papers, or open the finished example.");
      const res = await fetch("/api/plan", { method: "POST", body: form, signal: controller.signal });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 413) throw new Error("Those files are too large together. Remove one, or paste the text instead.");
        if (res.status === 504 || res.status === 502) throw new Error("That took too long. Please try again, or paste the text instead of a photo.");
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
          showResults();
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
      const aborted = e instanceof DOMException && e.name === "AbortError";
      if (aborted && cancelledRef.current) {
        setStatus("idle"); // the family pressed Cancel: nothing went wrong, so say nothing
        return;
      }
      const network = e instanceof TypeError; // fetch could not reach the server at all
      setError(
        aborted
          ? "That took too long. Please try again, or paste the text instead of a photo."
          : network
            ? "CareSheet couldn't be reached. Check the connection and try again, or open the finished example."
            : e instanceof Error
              ? e.message
              : "Something went wrong.",
      );
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  const canRun = status !== "working" && (texts.some((t) => t.trim()) || files.length > 0);

  const sampleLink = "inline-flex min-h-11 items-center py-1 font-semibold text-action underline underline-offset-4 hover:text-action-dark";
  const uploadTile =
    "flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-dashed border-field bg-white px-4 py-3 hover:border-action hover:bg-action-tint has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action";

  const footer = (
    <footer className="mt-16 bg-night text-white print:hidden">
      <div className="mx-auto grid max-w-5xl items-start gap-3 px-4 py-8 sm:grid-cols-[auto_1fr] sm:gap-8 sm:px-6">
        <p className="text-lg font-bold">CareSheet</p>
        <p className="max-w-prose text-pretty text-[0.95rem] text-white/85">
          Not medical advice. CareSheet only reorganizes what the hospital wrote. Nothing is saved. Papers go to the Claude API to be read, and medicine names to NIH RxNav and MedlinePlus.
        </p>
      </div>
    </footer>
  );

  return (
    <main>
      <p role="status" aria-live="polite" className="sr-only">
        {status === "working" ? "Reading the papers, please wait." : status === "done" && plan ? `Your plan is ready: ${plan.verified_medications.length} medicines and ${plan.ask_pharmacist.length} questions for the pharmacist.` : ""}
      </p>

      {view === "results" && plan ? (
        <div className="no-print">
          <div className="border-b border-rule bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lid-noon text-ink sm:h-10 sm:w-10"><Capsule className="h-6 w-6" /></span>
                <span className="min-w-0 truncate text-lg font-bold tracking-tight max-[430px]:[html.text-xlarge_&]:hidden sm:text-xl">CareSheet</span>
              </div>
              <TextSize />
            </div>
          </div>
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <ResultsView
              plan={plan}
              lang={lang}
              languages={LANGS}
              langName={langName}
              shownLangName={shownLangName}
              translations={translations}
              translating={translating}
              translateError={translateError}
              englishOnlyLines={englishOnlyLines}
              isExample={isExample}
              onLanguage={onLanguage}
              onRetryTranslate={() => void translate(plan, lang)}
              onEdit={() => setView("input")}
              onNew={startOver}
            />
          </div>
          {footer}
        </div>
      ) : (
        <div className="no-print">
          <Hero onExample={() => void showSavedExample("heart")} />
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <section id="start" aria-labelledby="add" className="card relative -mt-16 scroll-mt-4 p-5 shadow-[0_30px_60px_-30px_rgb(15_42_55/.45)] ring-1 ring-black/5 sm:-mt-20 sm:p-6">
              {plan ? (
                <div role="status" className="mb-5 flex flex-col gap-3 border-b border-rule pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-lg font-bold">Your plan is ready</p>
                  <button type="button" onClick={showResults} className="btn btn-primary min-h-12 w-full px-6 sm:w-auto">
                    Back to your plan
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              ) : null}
              <h2 id="add" className="sr-only">Add the papers</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  {texts.map((t, i) => (
                    <label key={i} className={`block ${i > 0 ? "mt-4" : ""}`}>
                      <span className="text-lg font-bold">{i === 0 ? "Paste the discharge instructions" : "Pill bottle label or other note"}</span>
                      {i === 0 ? <span className="mt-0.5 block text-[0.95rem] text-muted">Copy the medicine list from the hospital and paste it here.</span> : null}
                      <textarea
                        value={t}
                        onChange={(e) => setTexts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                        rows={i === 0 ? 8 : 3}
                        placeholder={i === 0 ? "Paste the discharge medication list here, or add photos." : ""}
                        className="field mt-2 block w-full resize-y p-3 text-base leading-relaxed"
                      />
                    </label>
                  ))}
                  {texts.length < 3 ? (
                    <button type="button" onClick={() => setTexts((p) => [...p, ""])} className="mt-1 inline-flex min-h-11 items-start gap-2 py-2 text-left font-semibold text-action underline underline-offset-4 hover:text-action-dark">
                      <Plus className="mt-0.5 h-5 w-5 shrink-0" />
                      Add another note, such as a pill bottle label
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-col">
                  <span className="text-lg font-bold">Or add photos or a PDF</span>
                  <span className="mt-0.5 block text-[0.95rem] text-muted">Discharge pages, pill bottles, or the patient portal PDF. Up to 4.</span>
                  <div className="mt-2 flex flex-1 flex-col gap-3">
                    <label className={`${uploadTile} min-h-40 flex-1 flex-col justify-center text-center`}>
                      <Files className="h-7 w-7 shrink-0 text-action" />
                      <span><span className="block text-lg font-bold text-action">Choose photos or PDF</span></span>
                      <input type="file" accept="image/*,application/pdf" multiple className="sr-only"
                        onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
                    </label>
                    <label className={`${uploadTile} min-h-[4.5rem] hidden [@media(pointer:coarse)]:flex`}>
                      <Camera className="h-7 w-7 shrink-0 text-action" />
                      <span><span className="block text-lg font-bold text-action">Take a photo</span></span>
                      <input type="file" accept="image/*" capture="environment" className="sr-only"
                        onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
                    </label>
                  </div>
                  <FileThumbs files={files} onRemove={(i) => setFiles((p) => p.filter((_, j) => j !== i))} />
                  {fileError ? <p role="alert" className="mt-2 text-stop">{fileError}</p> : null}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-rule pt-5 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="w-full sm:w-64">
                  <label htmlFor="lang" className="block text-base font-bold">Language for the fridge sheet</label>
                  <div className="relative mt-2">
                    <select id="lang" value={lang} onChange={(e) => onLanguage(e.target.value)}
                      className="field block min-h-12 w-full cursor-pointer appearance-none py-2 pl-3 pr-12 text-lg">
                      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-action">
                      <ChevronDown className="h-5 w-5" />
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="button" disabled={!canRun} onClick={() => void run()} className="btn btn-primary min-h-12 w-full px-8 text-lg sm:w-auto">
                    {status === "working" ? "Building the plan…" : "Build the plan"}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  {status === "working" ? (
                    <button type="button" onClick={() => { cancelledRef.current = true; abortRef.current?.abort(); }} className="btn btn-secondary min-h-12 w-full sm:w-auto">
                      Cancel
                    </button>
                  ) : null}
                  {!canRun && status !== "working" ? <p className="text-[0.95rem] text-muted">Add papers to continue.</p> : null}
                </div>
              </div>

              <div className="mt-5 border-t border-rule pt-4 text-[0.95rem]">
                <p className="text-muted">No papers handy?</p>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-y-2">
                  <span className="font-semibold">Try a sample:</span>
                  <div className="flex flex-wrap items-center gap-x-5">
                    {(Object.keys(SAMPLES) as (keyof typeof SAMPLES)[]).map((k) => (
                      <button key={k} type="button" onClick={() => loadSample(k)} className={sampleLink}>{SAMPLES[k].label}</button>
                    ))}
                    <button type="button" onClick={() => void loadPhotoSample()} className={sampleLink}>Photos of the papers</button>
                  </div>
                  <span className="mt-2 font-semibold sm:mt-0">See a finished plan:</span>
                  <div className="flex flex-wrap items-center gap-x-5">
                    <button type="button" onClick={() => void showSavedExample("heart")} className={sampleLink}>Heart patient, finished plan</button>
                    <button type="button" onClick={() => void showSavedExample("messy")} className={sampleLink}>Messy sheet, finished plan</button>
                  </div>
                </div>
              </div>
            </section>

            {status === "working" || (status === "error" && seen.length) ? (
              <ol className="card mt-6 space-y-1 p-5" aria-live="polite">
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
              <div role="alert" className="mt-6 rounded-xl border border-stop-line bg-stop-wash p-4">
                <p>{error}</p>
                <button type="button" onClick={() => void showSavedExample("heart")} className="mt-2 min-h-11 text-action underline">
                  Show the saved example instead
                </button>
              </div>
            ) : null}

            <HowItWorks />
          </div>
          {footer}
        </div>
      )}

      {plan ? (
        <div className="print-only">
          <FridgeSheet plan={plan} translations={translations} languageName={shownLangName} langCode={lang} isExample={isExample} />
        </div>
      ) : null}
    </main>
  );
}
