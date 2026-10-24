// "What is this medicine?" Loads only when tapped, from MedlinePlus (NIH), never from AI.
"use client";
import { useState } from "react";
import type { MedInfo as Info } from "@/app/api/medinfo/route";
import { ExternalLink, Info as InfoIcon } from "./Icons";

export default function MedInfo({ name, lang }: { name: string; lang: "en" | "es" }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [results, setResults] = useState<Info[]>([]);

  async function load() {
    setState("loading");
    try {
      const res = await fetch(`/api/medinfo?name=${encodeURIComponent(name)}&lang=${lang}`);
      const data = await res.json();
      if (!res.ok || (data.unavailable && !data.results?.length)) throw new Error();
      setResults(data.results ?? []);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <button type="button" onClick={() => void load()} className="-ml-1 inline-flex min-h-11 cursor-pointer items-center gap-2 px-1 text-[1.05rem] font-bold text-action underline underline-offset-4 hover:text-action-dark">
        <InfoIcon className="h-5 w-5" />
        {lang === "es" ? "¿Para qué es esta medicina?" : "What is this medicine?"}
      </button>
    );
  }
  if (state === "error")
    return (
      <p className="basis-full text-[0.95rem] text-muted">
        Could not reach MedlinePlus.{" "}
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 cursor-pointer items-center font-bold text-action underline underline-offset-4">
          Try again
        </button>
      </p>
    );
  if (state === "loading")
    return (
      <p role="status" className="flex min-h-11 basis-full items-center gap-2 text-[0.95rem] text-muted">
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-rule border-t-action" />
        Looking it up on MedlinePlus
      </p>
    );
  if (!results.length) return <p className="basis-full text-[0.95rem] text-muted">MedlinePlus has no page for this name. Ask the pharmacist.</p>;
  return (
    <div className="basis-full divide-y divide-rule text-[1rem] leading-relaxed">
      {results.map((r) => (
        <div key={r.url} className="py-3 first:pt-0 last:pb-0">
          <p>{r.summary}</p>
          <a href={r.url} target="_blank" rel="noreferrer" aria-label={`Read more on MedlinePlus: ${r.title}, from the US National Library of Medicine`} className="inline-flex min-h-11 items-center gap-1.5 font-bold text-action underline underline-offset-4">
            Read more on MedlinePlus <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-[0.95rem] text-muted">{r.title}, US National Library of Medicine</p>
        </div>
      ))}
    </div>
  );
}
