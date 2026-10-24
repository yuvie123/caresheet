"use client";
// A small "Text size" control: three buttons that scale the whole page. The choice is remembered in
// this browser only. It is applied after the page loads so the server markup stays identical.
import { useEffect, useState } from "react";

type Size = "normal" | "large" | "xlarge";
const KEY = "caresheet-text-size";
const OPTIONS: { size: Size; label: string; name: string }[] = [
  { size: "normal", label: "A", name: "Normal text" },
  { size: "large", label: "A+", name: "Large text" },
  { size: "xlarge", label: "A++", name: "Largest text" },
];

function apply(size: Size) {
  const root = document.documentElement;
  root.classList.toggle("text-large", size === "large");
  root.classList.toggle("text-xlarge", size === "xlarge");
}

export default function TextSize() {
  const [size, setSize] = useState<Size>("normal");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {
      /* storage blocked: stay on normal */
    }
    if (saved === "large" || saved === "xlarge") {
      apply(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read from storage after mount so SSR markup matches
      setSize(saved);
    }
  }, []);

  function choose(next: Size) {
    setSize(next);
    apply(next);
    try {
      if (next === "normal") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, next);
    } catch {
      /* not remembered, still applied */
    }
  }

  return (
    <div role="group" aria-label="Text size" className="inline-flex shrink-0 items-center gap-2">
      <span aria-hidden className="hidden text-[0.95rem] font-bold min-[430px]:inline">Text size</span>
      <div className="inline-flex shrink-0 overflow-hidden rounded-lg border-2 border-field bg-white text-ink">
        {OPTIONS.map((o, i) => (
          <button
            key={o.size}
            type="button"
            aria-pressed={size === o.size}
            aria-label={o.name}
            onClick={() => choose(o.size)}
            className={`min-h-11 min-w-11 px-2 text-[1rem] font-bold hover:bg-action-tint aria-pressed:bg-action aria-pressed:text-white ${i > 0 ? "border-l border-field" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
