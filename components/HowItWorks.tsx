// "How CareSheet checks its work": the safety design in four steps, plus the latest test results.
// The numbers come from evals/summary.json, written by `pnpm eval` against the real API.
import summary from "@/evals/summary.json";

const LID = ["bg-lid-morning text-ink", "bg-lid-noon text-ink", "bg-lid-evening text-ink", "bg-lid-bedtime text-white"];

const STEPS = [
  {
    who: "Claude",
    title: "Reads everything",
    body: "Transcribes the papers and bottle photos, then lists each medicine with the exact sentence it came from. Text inside a document is treated as data, never as instructions.",
  },
  {
    who: "Code",
    title: "Checks every line",
    body: "Plain code, not AI, finds each quoted sentence in the papers and checks the dose numbers are really there. Anything that doesn't match is kept off the schedule and becomes a pharmacist question.",
  },
  {
    who: "NIH RxNorm",
    title: "Looks up ingredients",
    body: "Every medicine is matched to its active ingredient in the US government drug database, so Tylenol and acetaminophen are caught as the same drug.",
  },
  {
    who: "Your pharmacist",
    title: "Answers the rest",
    body: "Smudged doses, conflicts, mismatches and anything unverified become quoted questions to take to the pharmacy counter. CareSheet never guesses.",
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how" className="card mt-16 p-5 sm:p-8">
      <h2 id="how" className="section-title">How CareSheet checks its work</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-xl bg-mist p-4 ring-1 ring-rule">
            <p className="flex items-center gap-2 text-sm font-bold text-muted">
              <span className={`grid h-7 w-7 place-items-center rounded-full ${LID[i]}`}>{i + 1}</span>
              {s.who}
            </p>
            <p className="mt-1 text-lg font-bold">{s.title}</p>
            <p className="mt-1 text-[0.9rem] text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[0.9rem] text-muted">
        Numbers are printed by code from the checked data. Translation only changes words, and a translation that adds
        any new number is thrown away.
      </p>

      <div className="mt-6 border-t-2 border-rule pt-4">
        <h3 className="text-xl font-bold">Tested, not just claimed</h3>
        <p className="mt-1">
          <span className="font-bold">
            {summary.passed} of {summary.cases} test cases fully correct, {summary.invented} invented medicines
          </span>{" "}
          on the schedule ({summary.model}, {summary.date}). Each case is a fictional discharge sheet with a known right answer.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {summary.rows.map((r) => (
            <li key={r.id} className="flex gap-2 text-[0.9rem]">
              <span aria-hidden className={r.pass ? "text-action" : "text-ask"}>
                {r.pass ? "✓" : "◐"}
              </span>
              <span>
                {r.why}
                {r.pass ? "" : ` (${r.notes.join("; ")})`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
