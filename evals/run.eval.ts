// Runs every eval case against the real Claude API and writes evals/results.md.
// Run with: pnpm eval   (needs ANTHROPIC_API_KEY in .env.local)
// This costs a little money per run (a few cents per case), so it is not part of `pnpm test`.
import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { extractPlan, MODEL, type PlanResult } from "../lib/claude";
import { CASES, type EvalCase } from "./cases";

type Row = { id: string; pass: boolean; notes: string[]; invented: number; seconds: number };
const rows: Row[] = [];

const has = (plan: PlanResult, name: string) =>
  plan.verified_medications.filter((m) => m.name.toLowerCase().includes(name.toLowerCase()));

function grade(c: EvalCase, plan: PlanResult): { notes: string[]; invented: number } {
  const notes: string[] = [];
  let invented = 0;
  for (const s of c.expect.scheduled ?? []) {
    const m = has(plan, s.name).find((x) => x.status !== "stop");
    if (!m) notes.push(`missing ${s.name}`);
    else if (s.strength && !(m.strength ?? "").includes(s.strength)) notes.push(`${s.name} strength ${m.strength}`);
    else if (!m.as_needed && m.slots.length === 0) notes.push(`${s.name} has no time slot`);
  }
  for (const s of c.expect.stopped ?? []) if (!has(plan, s).some((m) => m.status === "stop")) notes.push(`${s} not marked STOP`);
  for (const s of c.expect.as_needed ?? []) if (!has(plan, s).some((m) => m.as_needed)) notes.push(`${s} not marked as needed`);
  for (const s of c.expect.never ?? [])
    if (has(plan, s).length) {
      notes.push(`INVENTED ${s}`);
      invented++;
    }
  for (const f of c.expect.flags ?? []) if (!plan.ask_pharmacist.some((q) => q.kind === f)) notes.push(`no ${f} flag`);
  return { notes, invented };
}

describe(`CareSheet evals (${MODEL})`, () => {
  for (const c of CASES) {
    it(c.id, async () => {
      const t0 = Date.now();
      const plan = await extractPlan(c.texts.map((text, i) => ({ kind: "text", text, label: `doc ${i}` })));
      mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
      writeFileSync(new URL(`./out/${c.id}.json`, import.meta.url), JSON.stringify(plan, null, 2));
      const { notes, invented } = grade(c, plan);
      rows.push({ id: c.id, pass: notes.length === 0, notes, invented, seconds: (Date.now() - t0) / 1000 });
      expect(invented).toBe(0);
    });
  }

  afterAll(() => {
    const passed = rows.filter((r) => r.pass).length;
    const invented = rows.reduce((n, r) => n + r.invented, 0);
    const md = [
      `# CareSheet eval results`,
      ``,
      `Model: \`${MODEL}\` · Run: ${new Date().toISOString()}`,
      ``,
      `**${passed}/${rows.length} cases fully correct · ${invented} invented medications on the schedule**`,
      ``,
      `| Case | Result | Seconds | Notes |`,
      `|---|---|---|---|`,
      ...rows.map((r) => `| ${r.id} | ${r.pass ? "pass" : "partial"} | ${r.seconds.toFixed(1)} | ${r.notes.join("; ") || "-"} |`),
      ``,
    ].join("\n");
    writeFileSync(new URL("./results.md", import.meta.url), md);
    console.log("\n" + md);
  });
});
