// The top of the page: who this is for, what it does, and a small sample of what comes out.
// The sample label is decorative (hidden from screen readers) and marked "Example".
import type React from "react";
import TextSize from "./TextSize";
import { Capsule, Check, Ban, Question, SLOT_ICON } from "./Icons";

const PROMISES = [
  "Every dose traced to the hospital's own words",
  "Anything unsure goes to your pharmacist, not the fridge",
  "Saves nothing, no account needed",
];

const LIDS = [
  { slot: "morning", label: "Morning", time: "8:00", lid: "bg-lid-morning text-ink" },
  { slot: "noon", label: "Noon", time: "12:30", lid: "bg-lid-noon text-ink" },
  { slot: "evening", label: "Evening", time: "18:00", lid: "bg-lid-evening text-ink" },
  { slot: "bedtime", label: "Bedtime", time: "21:30", lid: "bg-lid-bedtime text-white" },
] as const;

// Decorative pharmacy-label sample. Hidden from screen readers and from print.
function SampleLabel() {
  return (
    <div aria-hidden className="relative w-full max-w-md print:hidden">
      <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl bg-white/15 md:-rotate-2" />
      <span className="absolute -right-2 -top-3 z-10 inline-flex -rotate-3 items-center gap-1.5 rounded-full bg-lid-noon px-3 py-1 text-sm font-bold text-ink shadow-lg">
        <Check className="h-4 w-4" /> Checked against the papers
      </span>
      <div className="relative rounded-2xl bg-[#fffdf7] p-5 text-ink shadow-3 ring-1 ring-black/10 md:rotate-[1.5deg]">
        <div className="flex items-center justify-between gap-2 pb-3 pt-4">
          <span className="flex items-center gap-2 text-lg font-bold">
            <Capsule className="h-6 w-6" /> Medicine plan
          </span>
          <span className="text-xs font-bold tabular-nums text-muted">Rx 0000-000</span>
        </div>
        <div className="border-t-2 border-dashed border-ink/40 pt-3">
          <span className="rounded-md border border-dashed border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide">Example only</span>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border-2 border-stop bg-stop-wash p-2.5">
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-stop" />
          <div>
            <p className="text-base font-bold text-stop">Stopped: do not take</p>
            <p className="num text-base font-bold text-stop"><span className="block">Amlodipine 5 mg</span><span className="block">Aspirin 81 mg</span></p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {LIDS.map((l) => {
            const Icon = SLOT_ICON[l.slot];
            return (
              <div key={l.slot} className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-sm font-bold shadow-[inset_0_-3px_0_rgb(0_0_0/.12)] ${l.lid}`}>
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold opacity-80">{l.label}</span>
                <span className="num tabular-nums">{l.time}</span>
              </div>
            );
          })}
        </div>
        <div className="accent-l mt-3 rounded-lg bg-ask-wash p-2.5" style={{ "--accent": "var(--color-ask)", paddingLeft: "1.25rem" } as React.CSSProperties}>
          <p className="flex items-center gap-1.5 text-sm font-bold text-ask">
            <Question className="h-4 w-4" /> Ask your pharmacist
          </p>
          <p className="mt-1 text-base">Is the Tylenol bottle the same drug as the sheet&apos;s acetaminophen?</p>
          <p className="num mt-1 text-sm italic text-muted">&ldquo;Acetaminophen 500 mg every 6 hours as needed&rdquo;</p>
        </div>
        <div
          aria-hidden
          className="mt-4 h-6 opacity-80"
          style={{ background: "repeating-linear-gradient(90deg,#14232b 0 2px,transparent 2px 5px)" }}
        />
      </div>
    </div>
  );
}

export default function Hero({ onExample }: { onExample?: () => void }) {
  return (
    <header
      className="on-dark relative isolate overflow-hidden border-b border-white/10 pb-28 text-white"
      style={{
        background:
          "radial-gradient(40rem 24rem at 0% 100%, rgb(124 198 181 / 0.12), transparent 60%), radial-gradient(80% 120% at 85% 0%, #1f5a72 0%, #12333f 45%, #0c2630 100%)",
      }}
    >
      <div
        aria-hidden
        className="h-1.5 w-full print:hidden"
        style={{
          background:
            "linear-gradient(90deg, var(--color-lid-morning) 0 25%, var(--color-lid-noon) 25% 50%, var(--color-lid-evening) 50% 75%, var(--color-lid-bedtime) 75%)",
        }}
      />
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lid-noon text-ink sm:h-11 sm:w-11">
              <Capsule className="h-6 w-6" />
            </span>
            <span className="min-w-0 truncate text-lg font-bold tracking-tight max-[430px]:[html.text-xlarge_&]:hidden sm:text-[1.35rem]">CareSheet</span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden rounded-full border border-white/25 px-3 py-1 text-sm text-white/85 lg:inline-flex">
              Free · No account · Nothing saved
            </span>
            <TextSize />
          </div>
        </div>

        <div className="mt-8 grid items-start gap-10 md:grid-cols-[1fr_19rem] lg:mt-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          <div>
            <h1 className="mb-4 text-balance text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3rem]">
              Hospital papers in. <span className="text-lid-noon">A medicine plan</span> the whole family can follow.
            </h1>
            <p className="max-w-xl text-pretty text-[1.1rem] leading-relaxed text-white/90">
              Bringing a parent home from hospital? Add the discharge papers and the pill bottles from the kitchen.
              CareSheet builds the week&apos;s plan, flags anything that doesn&apos;t add up, and prints it for the fridge in
              your parent&apos;s language.
            </p>
            <ul className="mt-6 space-y-2">
              {PROMISES.map((t) => (
                <li key={t} className="flex items-center gap-3 font-semibold">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lid-noon text-ink ring-4 ring-lid-noon/20">
                    <Check className="h-4 w-4" />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
              <a href="#start" className="btn btn-light min-h-14 w-full whitespace-nowrap px-7 text-lg sm:w-auto">
                Add the papers
              </a>
              {onExample ? (
                <button type="button" onClick={onExample} className="inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-lg border-2 border-white/70 px-4 font-semibold text-white hover:bg-white/10 sm:w-auto">
                  See a finished example
                </button>
              ) : null}
            </div>
            <p className="mt-4 text-[0.95rem] text-white/85">Not medical advice.</p>
          </div>
          <div className="flex justify-center md:justify-end md:pt-2">
            <SampleLabel />
          </div>
        </div>
      </div>
    </header>
  );
}
