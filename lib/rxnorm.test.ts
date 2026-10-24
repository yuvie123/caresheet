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
    expect(found.map((f) => f.ingredient)).toEqual(["acetaminophen"]);
  }, 30_000);
});
