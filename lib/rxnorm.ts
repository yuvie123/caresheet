// Looks up each medication's active ingredient(s) in RxNorm, the US National Library of Medicine's
// official drug database. Free, no API key. Two meds with the same ingredient = possible double dose.
// Docs: https://rxnav.nlm.nih.gov/RxNormAPIs.html
import type { Medication, PharmacistItem } from "./schema";

const BASE = "https://rxnav.nlm.nih.gov/REST";
const TIMEOUT_MS = 6000;

// Used only if RxNav is unreachable (e.g. venue Wi-Fi). Lowercase brand or generic -> ingredient.
const FALLBACK: Record<string, string> = {
  tylenol: "acetaminophen",
  paracetamol: "acetaminophen",
  acetaminophen: "acetaminophen",
  advil: "ibuprofen",
  motrin: "ibuprofen",
  ibuprofen: "ibuprofen",
  aleve: "naproxen",
  naproxen: "naproxen",
  eliquis: "apixaban",
  apixaban: "apixaban",
  coumadin: "warfarin",
  jantoven: "warfarin",
  warfarin: "warfarin",
  lasix: "furosemide",
  furosemide: "furosemide",
  lopressor: "metoprolol",
  toprol: "metoprolol",
  metoprolol: "metoprolol",
  lipitor: "atorvastatin",
  atorvastatin: "atorvastatin",
  norvasc: "amlodipine",
  amlodipine: "amlodipine",
  glucophage: "metformin",
  metformin: "metformin",
  aspirin: "aspirin",
  prinivil: "lisinopril",
  zestril: "lisinopril",
  lisinopril: "lisinopril",
};

const cache = new Map<string, string[] | null>();

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`RxNav ${res.status}`);
  return res.json();
}

type Approx = { approximateGroup?: { candidate?: { rxcui?: string; score?: string }[] } };
type Related = { relatedGroup?: { conceptGroup?: { conceptProperties?: { name?: string }[] }[] } };

function fallbackLookup(name: string): string[] | null {
  const words = name.toLowerCase().split(/[^a-z]+/);
  const hits = new Set(words.map((w) => FALLBACK[w]).filter(Boolean));
  return hits.size ? [...hits] : null;
}

/**
 * Active ingredients for a medication name, lowercase. null means "could not identify".
 * `source` says whether the answer came from RxNorm or the offline fallback list.
 */
export async function ingredientsFor(name: string): Promise<{ ingredients: string[] | null; source: "rxnorm" | "fallback" }> {
  const key = name.toLowerCase().trim();
  if (cache.has(key)) return { ingredients: cache.get(key)!, source: "rxnorm" };
  try {
    const approx = (await getJson(
      `${BASE}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`,
    )) as Approx;
    const rxcui = approx.approximateGroup?.candidate?.[0]?.rxcui;
    if (!rxcui) {
      cache.set(key, null);
      return { ingredients: null, source: "rxnorm" };
    }
    // IN = ingredient, MIN = multi-ingredient (e.g. amoxicillin-clavulanate)
    const related = (await getJson(`${BASE}/rxcui/${rxcui}/related.json?tty=IN+MIN`)) as Related;
    const names = (related.relatedGroup?.conceptGroup ?? [])
      .flatMap((g) => g.conceptProperties ?? [])
      .map((c) => (c.name ?? "").toLowerCase())
      .filter(Boolean);
    const result = names.length ? [...new Set(names)] : null;
    cache.set(key, result);
    return { ingredients: result, source: "rxnorm" };
  } catch {
    return { ingredients: fallbackLookup(name), source: "fallback" };
  }
}

/**
 * Finds medications (that are still being taken) which share an active ingredient.
 * Returns pharmacist questions, each citing both source sentences.
 */
export async function findDuplicateIngredients(meds: Medication[]): Promise<PharmacistItem[]> {
  const active = meds.filter((m) => m.status !== "stop");
  const lookups = await Promise.all(active.map(async (m) => ({ med: m, ...(await ingredientsFor(m.name)) })));

  const byIngredient = new Map<string, typeof lookups>();
  for (const l of lookups) {
    for (const ing of l.ingredients ?? []) {
      // Multi-ingredient names like "amoxicillin / clavulanate" also count for each part.
      for (const part of ing.split(/\s*\/\s*|\s+and\s+/)) {
        const list = byIngredient.get(part) ?? [];
        if (!list.some((x) => x.med === l.med)) list.push(l);
        byIngredient.set(part, list);
      }
    }
  }

  const questions: PharmacistItem[] = [];
  for (const [ingredient, list] of byIngredient) {
    if (list.length < 2) continue;
    const names = list.map((l) => `${l.med.name}${l.med.strength ? ` ${l.med.strength}` : ""}`);
    const viaRx = list.every((l) => l.source === "rxnorm");
    questions.push({
      kind: "duplicate",
      issue: `${names.join(" and ")} all contain ${ingredient}${viaRx ? " (checked with NIH RxNorm)" : ""}. Should these be taken together, or is one replacing the other?`,
      quotes: list.map((l) => l.med.source_quote),
    });
  }
  return questions;
}
