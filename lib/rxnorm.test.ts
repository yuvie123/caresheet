import { describe, expect, it } from "vitest";
import { findDuplicateIngredients, ingredientsFor } from "./rxnorm";
import type { Medication } from "./schema";

const med = (name: string, strength: string, status: Medication["status"] = "continue"): Medication => ({
  name,
  strength,
  dose_amount: 1,
  dose_unit: "tablet",
  frequency_verbatim: "daily",
  times_per_day: 1,
  as_needed: false,
  slots: ["morning"],
  with_food: "not_stated",
  status,
  duration_verbatim: null,
  source_quote: `${name} ${strength}`,
  source_doc: 0,
});

// These call the real NIH RxNav service (free, no key). They fall back to the offline list if it's down.
describe("rxnorm", () => {
  it("maps a brand to its ingredient", async () => {
    expect((await ingredientsFor("Tylenol")).ingredients).toContain("acetaminophen");
  }, 20_000);

  it("returns only the ingredient for a plain generic (no combination products)", async () => {
    expect((await ingredientsFor("Acetaminophen 500 mg")).ingredients).toEqual(["acetaminophen"]);
  }, 20_000);

  it("finds exactly one duplicate for Tylenol + acetaminophen, ignoring stopped meds", async () => {
    const found = await findDuplicateIngredients([
      med("Acetaminophen", "500 mg"),
      med("Extra Strength Tylenol", "500 mg"),
      med("Aspirin", "81 mg", "stop"),
      med("Metoprolol tartrate", "25 mg"),
    ]);
    expect(found.findings.map((f) => f.ingredient)).toEqual(["acetaminophen"]);
    expect(found.unchecked).toEqual([]);
  }, 30_000);
  it("reports a name RxNorm doesn't know instead of silently skipping it", async () => {
    const found = await findDuplicateIngredients([med("Zzyxolinamide", "10 mg")]);
    expect(found.unchecked).toEqual([{ name: "Zzyxolinamide", reason: "unidentified" }]);
  }, 30_000);

  it("warns when a bottle at home contains an ingredient the papers say to STOP (Norvasc = amlodipine)", async () => {
    const found = await findDuplicateIngredients([
      med("Amlodipine", "5 mg", "stop"),
      med("Norvasc", "5 mg", "continue"),
    ]);
    expect(found.findings).toHaveLength(1);
    expect(found.findings[0].item.kind).toBe("conflict");
    expect(found.findings[0].item.issue).toMatch(/STOP/);
    expect(found.findings[0].medNames).toEqual(expect.arrayContaining(["Amlodipine", "Norvasc"]));
  }, 30_000);
  it("says nothing when only stopped medicines share an ingredient", async () => {
    const found = await findDuplicateIngredients([med("Amlodipine", "5 mg", "stop"), med("Norvasc", "5 mg", "stop")]);
    expect(found.findings).toEqual([]);
  }, 30_000);
  it("does not count stopped medicines as unchecked", async () => {
    const found = await findDuplicateIngredients([med("Zzyxolinamide", "10 mg", "stop")]);
    expect(found.unchecked).toEqual([]);
  }, 30_000);
  it("words a same-medicine-twice finding plainly instead of listing the name twice", async () => {
    const found = await findDuplicateIngredients([med("Acetaminophen", "500 mg"), { ...med("Acetaminophen", "500 mg"), source_doc: 1 }]);
    expect(found.findings).toHaveLength(1);
    expect(found.findings[0].item.issue).toMatch(/same medicine, so count it once/);
    expect(found.findings[0].item.issue).not.toMatch(/Acetaminophen 500 mg and Acetaminophen 500 mg/);
  }, 30_000);
  it("says 'both' for two different brands of one ingredient", async () => {
    const found = await findDuplicateIngredients([med("Tylenol", "500 mg"), med("Acetaminophen", "500 mg")]);
    expect(found.findings[0].item.issue).toMatch(/both contain acetaminophen/);
  }, 30_000);
});
