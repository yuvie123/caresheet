// How CareSheet checks every line: the safety design in four short steps, as plain numbered columns.

const STEPS = [
  { title: "Reads the papers", body: "Claude reads the text and photos and lists each medicine with the sentence it came from." },
  { title: "Checks each line", body: "Plain code, not AI, finds every sentence and number in the papers." },
  { title: "Looks up ingredients", body: "Each medicine is matched in the US NIH drug database." },
  { title: "Leaves out guesses", body: "Anything unsure becomes a question for your pharmacist." },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how" className="mt-12 border-t border-rule pt-8">
      <h2 id="how" className="text-balance text-xl font-bold tracking-tight sm:text-2xl">How CareSheet checks every line</h2>
      <ol className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-rule py-4 pr-4 first:border-t-0 sm:[&:nth-child(-n+2)]:border-t-0 lg:border-t-0 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-0">
            <p className="num text-2xl font-bold text-action">{i + 1}</p>
            <p className="mt-1 text-lg font-bold leading-snug">{s.title}</p>
            <p className="mt-1 text-pretty text-[0.95rem] leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-rule pt-4 text-pretty text-[0.95rem] text-muted">Numbers are printed by code from the checked data. Translation only changes words.</p>
    </section>
  );
}
