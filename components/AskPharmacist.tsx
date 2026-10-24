// Everything CareSheet would not put on the schedule, as questions to take to the pharmacy counter.
// Each one quotes the exact text it's about, so the pharmacist can answer in seconds.
import type { PlanResult } from "@/lib/claude";
import type { PharmacistItem } from "@/lib/schema";
import { Question } from "./Icons";

const KIND_LABEL: Record<PharmacistItem["kind"], string> = {
  duplicate: "Same ingredient twice",
  mismatch: "Papers and bottle don't match",
  illegible: "Couldn't read this",
  unclear: "Unclear instruction",
  conflict: "Listed twice, different doses",
  unverified: "Couldn't verify",
};

export default function AskPharmacist({ plan }: { plan: PlanResult }) {
  const items = plan.ask_pharmacist;
  if (items.length === 0) {
    return <p className="text-muted">Nothing unclear was found. It&apos;s still worth showing the plan to your pharmacist.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((q, i) => (
        <li key={i} className="rounded-xl border-l-4 border-ask bg-ask-wash p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-ask">
            <Question className="h-5 w-5" /> {KIND_LABEL[q.kind]}
          </p>
          <p className="mt-1 text-lg">{q.issue}</p>
          {q.quotes.length ? (
            <ul className="mt-2 space-y-1">
              {q.quotes.map((quote, j) => (
                <li key={j} className="border-l-2 border-ask/40 pl-3 text-muted">&ldquo;{quote}&rdquo;</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
