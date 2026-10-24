// The top of the page: who this is for, what it does, and a small sample of what comes out.
// The sample label is decorative (hidden from screen readers) and marked "Example".
import { Capsule, Check, Ban, Question, SLOT_ICON } from "./Icons";

const PROMISES = [
  "Every dose traced to the hospital's own words",
  "Anything unsure goes to your pharmacist, not the fridge",
  "Saves nothing, no account needed",
];

const LIDS = [
  { slot: "morning", label: "8:00", lid: "bg-lid-morning text-ink" },
  { slot: "noon", label: "12:30", lid: "bg-lid-noon text-ink" },
  { slot: "evening", label: "18:00", lid: "bg-lid-evening text-ink" },
  { slot: "bedtime", label: "21:30", lid: "bg-lid-bedtime text-white" },
] as const;

function SampleLabel() {
  return (
    <div aria-hidden className="w-full max-w-sm rounded-2xl bg-white p-4 text-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.55)] ring-1 ring-black/10">
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <span className="font-bold">Medicine plan</span>
        <span className="rounded border border-dashed border-ink px-2 py-0.5 text-xs font-bold">Example only</span>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg border-2 border-stop bg-stop-wash p-2.5">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-stop" />
        <div>
          <p className="text-sm font-bold text-stop">Stopped: do not take</p>
          <p className="font-bold text-stop">Amlodipine 5 mg · Aspirin 81 mg</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {LIDS.map((l) => {
          const Icon = SLOT_ICON[l.slot];
          return (
            <div key={l.slot} className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs font-bold ${l.lid}`}>
              <Icon className="h-5 w-5" />
              {l.label}
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border-l-4 border-ask bg-ask-wash p-2.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-ask">
          <Question className="h-4 w-4" /> Ask your pharmacist
        </p>
        <p className="mt-1 text-sm">Is the Tylenol bottle the same drug as the sheet&apos;s acetaminophen?</p>
        <p className="mt-1 border-l-2 border-ask/40 pl-2 text-xs text-muted">&ldquo;Acetaminophen 500 mg every 6 hours as needed&rdquo;</p>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <header className="bg-night text-white">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-5 sm:px-6 sm:pb-28">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Capsule className="h-7 w-7" />
          </span>
          <span className="text-xl font-bold tracking-tight">CareSheet</span>
        </div>

        <div className="mt-10 grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-[2.6rem] lg:text-5xl">
              Hospital papers in. A medicine plan the whole family can follow.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">
              Bringing a parent home from hospital? Add the discharge papers and the pill bottles from the kitchen.
              CareSheet builds the week&apos;s plan, flags anything that doesn&apos;t add up, and prints it for the fridge in
              your parent&apos;s language.
            </p>
            <ul className="mt-5 space-y-2">
              {PROMISES.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lid-noon text-ink">
                    <Check className="h-4 w-4" />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-xl text-sm text-white/70">
              Not medical advice. CareSheet only reorganizes what the hospital wrote. Papers are sent to the Claude API to be
              read, and medicine names to NIH RxNav and MedlinePlus. Nothing is saved.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <SampleLabel />
          </div>
        </div>
      </div>
    </header>
  );
}
