// Appointments, tests, and the warning signs that mean "call the doctor". Flat lists, no boxes.
import type { PlanResult } from "@/lib/claude";
import { Alert, Calendar } from "./Icons";

export default function Notes({ plan }: { plan: PlanResult }) {
  return (
    <div className="grid items-start gap-x-8 gap-y-6 md:grid-cols-2">
      <section aria-labelledby="warn" className="border-t-2 border-stop">
        <h3 id="warn" className="flex items-center gap-2 py-2 text-xl font-bold text-stop">
          <Alert className="h-6 w-6 shrink-0" />Call the doctor if
        </h3>
        {plan.warning_signs.length ? (
          <ul className="divide-y divide-stop-line border-y border-stop-line">
            {plan.warning_signs.map((w, i) => (
              <li key={i} className="flex gap-3 py-3 text-[1.05rem] leading-snug">
                <Alert className="mt-0.5 h-5 w-5 shrink-0 text-stop" />
                <span>{w.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-rule py-3 text-base text-muted">The papers didn&apos;t list warning signs.</p>
        )}
      </section>
      <section aria-labelledby="follow" className="border-t-2 border-action">
        <h3 id="follow" className="flex items-center gap-2 py-2 text-xl font-bold text-action">
          <Calendar className="h-6 w-6 shrink-0" />Appointments and tests
        </h3>
        {plan.follow_ups.length ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {plan.follow_ups.map((f, i) => (
              <li key={i} className="flex gap-3 py-3 text-[1.05rem] leading-snug">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-action" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-rule py-3 text-base text-muted">No follow-ups were listed.</p>
        )}
      </section>
    </div>
  );
}
