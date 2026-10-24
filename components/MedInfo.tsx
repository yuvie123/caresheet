// "What is this medicine?" Loads only when tapped, from MedlinePlus (NIH), never from AI.
"use client";
import { useState } from "react";
import type { MedInfo as Info } from "@/app/api/medinfo/route";

export default function MedInfo({ name, lang }: { name: string; lang: "en" | "es" }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<Info[]>([]);

  async function load() {
    setState("loading");
    try {
      const res = await fetch(`/api/medinfo?name=${encodeURIComponent(name)}&lang=${lang}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setState("done");
    }
  }

  if (state === "idle") {
    return (
      <button type="button" onClick={() => void load()} className="text-sm text-action underline">
        {lang === "es" ? "¿Para qué es esta medicina?" : "What is this medicine?"}
      </button>
    );
  }
  if (state === "loading") return <p className="text-sm text-muted">Looking it up on MedlinePlus…</p>;
  if (!results.length) return <p className="text-sm text-muted">MedlinePlus has no page for this name. Ask the pharmacist.</p>;
  return (
    <div className="mt-1 space-y-2 rounded-lg bg-wash p-3 text-sm">
      {results.map((r) => (
        <div key={r.url}>
          <p>{r.summary}</p>
          <a href={r.url} target="_blank" rel="noreferrer" className="text-action underline">
            Read more on MedlinePlus ({r.title}), from the US National Library of Medicine
          </a>
        </div>
      ))}
    </div>
  );
}
