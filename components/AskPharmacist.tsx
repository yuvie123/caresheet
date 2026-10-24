// Everything CareSheet would not put on the schedule, as questions to take to the pharmacy counter.
// Each one quotes the exact text it's about, so the pharmacist can answer in seconds.
import type { PlanResult } from "@/lib/claude";
import type { PharmacistItem } from "@/lib/schema";
import { Check, ChevronDown } from "./Icons";

const KIND_LABEL: Record<PharmacistItem["kind"], string> = {
  duplicate: "Same ingredient twice",
  mismatch: "Papers and bottle don't match",
  illegible: "Couldn't read this",
  unclear: "Unclear instruction",
  conflict: "Listed twice, different doses",
  unverified: "Couldn't verify",
};

/** A quote from the papers, shared by the medicine list and the pharmacist questions. */
export function Quote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <blockquote className={`border-l-2 border-ask-line pl-3 ${className}`}>
      <p className="text-base italic text-muted">&ldquo;{children}&rdquo;</p>
    </blockquote>
  );
}

export default function AskPharmacist({ plan }: { plan: PlanResult }) {
  const items = plan.ask_pharmacist;
  if (items.length === 0) {
    return (
      <div className="flex items-start gap-3 border-y border-rule py-5">
        <Check className="mt-0.5 h-7 w-7 shrink-0 text-ok" />
        <p className="text-[1.1rem] text-ink">
          Nothing unclear was found. It is still worth showing the plan to your pharmacist.
        </p>
      </div>
    );
  }
  const openByDefault = items.length <= 3;
  return (
    <ol className="divide-y divide-ask-line rounded-md bg-ask-wash px-4 sm:px-6">
      {items.map((q, i) => (
        <li key={i} className="flex gap-4 py-5">
          <span className="num grid h-9 w-9 flex-none place-items-center rounded-full bg-ask text-base font-bold text-white" aria-hidden>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.95rem] font-bold text-ask">
              <span className="sr-only">Question {i + 1}. </span>
              {KIND_LABEL[q.kind]}
            </p>
            <p className="mt-0.5 text-[1.05rem] font-semibold leading-snug text-ink">{q.issue}</p>
            {q.quotes.length ? (
              <details className="group mt-2" open={openByDefault}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-action [&::-webkit-details-marker]:hidden">
                  What the papers say
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <ul className="mt-1 space-y-3 pb-1">
                  {q.quotes.map((quote, j) => (
                    <li key={j}><Quote>{quote}</Quote></li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
