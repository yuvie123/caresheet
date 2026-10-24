// Appointments, tests, and the warning signs that mean "call the doctor".
import type { PlanResult } from "@/lib/claude";

export default function Notes({ plan }: { plan: PlanResult }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="warn">
        <h3 id="warn" className="text-xl font-bold text-stop">Call the doctor if</h3>
        {plan.warning_signs.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {plan.warning_signs.map((w, i) => <li key={i}>{w.text}</li>)}
          </ul>
        ) : <p className="mt-2 text-muted">The papers didn&apos;t list warning signs.</p>}
      </section>
      <section aria-labelledby="follow">
        <h3 id="follow" className="text-xl font-bold">Appointments and tests</h3>
        {plan.follow_ups.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {plan.follow_ups.map((f, i) => <li key={i}>{f.text}</li>)}
          </ul>
        ) : <p className="mt-2 text-muted">No follow-ups were listed.</p>}
      </section>
    </div>
  );
}
