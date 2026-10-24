// Free regression test: replays REAL Claude outputs saved from the eval runs (evals/out/*.json and the
// demo example) through the verifier. Every medicine that was legitimately verified before must still
// verify after any change to the safety rules, so tightening a rule can't silently break the samples.
// No API calls: the plans are already on disk.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Plan } from "./schema";
import { verifyPlan } from "./verify";

const root = new URL("../", import.meta.url);
const load = (path: string) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

const fixtures: { name: string; plan: Plan }[] = [
  ...readdirSync(new URL("evals/out/", root))
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ name: `eval:${f.replace(".json", "")}`, plan: load(`evals/out/${f}`) as Plan })),
  { name: "demo:heart", plan: load("public/demo/heart.json").plan as Plan },
];

describe("verifier regression on saved real outputs", () => {
  it("has fixtures to check", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(6);
  });

  for (const { name, plan } of fixtures) {
    it(`${name}: every medicine that was verified before still verifies`, () => {
      const before = (plan as unknown as { verified_medications: { name: string; source_quote: string }[] })
        .verified_medications;
      const after = verifyPlan(plan);
      const stillThere = new Set(after.verified_medications.map((m) => m.source_quote));
      const lost = before.filter((m) => !stillThere.has(m.source_quote)).map((m) => m.name);
      expect(
        after.ask_pharmacist.length,
        "the verifier added new pharmacist cards to a saved real output (noise)",
      ).toBe((plan as unknown as { ask_pharmacist: unknown[] }).ask_pharmacist.length);
      expect(lost, `medicines newly rejected: ${lost.join(", ")}; reasons: ${JSON.stringify(after.failures)}`).toEqual([]);
    });
  }
});
