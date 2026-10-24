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

type Approx = { approximateGroup?: { candidate?: { rxcui?: string; score?: string; source?: string }[] } };
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
      `${BASE}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=5`,
    )) as Approx;
    // Try RxNorm's own concepts first; partner vocabularies (e.g. MMSL) often have no ingredient link.
    const candidates = approx.approximateGroup?.candidate ?? [];
    const ordered = [...candidates.filter((c) => c.source === "RXNORM"), ...candidates.filter((c) => c.source !== "RXNORM")];
    const tried = new Set<string>();
    for (const c of ordered) {
      if (!c.rxcui || tried.has(c.rxcui)) continue;
      tried.add(c.rxcui);
      if (tried.size > 3) break;
      // IN = single ingredient. Works for generics, brands (Tylenol -> acetaminophen) and combinations
      // (amoxicillin / clavulanate -> both). Do NOT ask for MIN: for a plain ingredient that returns
      // every combination product containing it (acetaminophen + codeine, + caffeine, ...).
      const related = (await getJson(`${BASE}/rxcui/${c.rxcui}/related.json?tty=IN`)) as Related;
      const names = (related.relatedGroup?.conceptGroup ?? [])
        .flatMap((g) => g.conceptProperties ?? [])
        .map((p) => (p.name ?? "").toLowerCase())
        .filter(Boolean);
      if (names.length) {
        const result = [...new Set(names)];
        cache.set(key, result);
        return { ingredients: result, source: "rxnorm" };
      }
    }
    // RxNorm couldn't identify it; the offline list may still know the brand.
    const fb = fallbackLookup(name);
    cache.set(key, fb);
    return { ingredients: fb, source: fb ? "fallback" : "rxnorm" };
  } catch {
    return { ingredients: fallbackLookup(name), source: "fallback" };
  }
}

/**
 * Finds medications (that are still being taken) which share an active ingredient.
 * Returns pharmacist questions, each citing both source sentences.
 */
export type DuplicateFinding = { ingredient: string; medNames: string[]; item: PharmacistItem };

export async function findDuplicateIngredients(meds: Medication[]): Promise<DuplicateFinding[]> {
  const active = meds.filter((m) => m.status !== "stop");
  const lookups = await Promise.all(active.map(async (m) => ({ med: m, ...(await ingredientsFor(m.name)) })));

  const byIngredient = new Map<string, typeof lookups>();
  for (const l of lookups) {
    for (const ing of l.ingredients ?? []) {
      const list = byIngredient.get(ing) ?? [];
      if (!list.some((x) => x.med === l.med)) list.push(l);
      byIngredient.set(ing, list);
    }
  }

  const findings: DuplicateFinding[] = [];
  for (const [ingredient, list] of byIngredient) {
    if (list.length < 2) continue;
    const names = list.map((l) => `${l.med.name}${l.med.strength ? ` ${l.med.strength}` : ""}`);
    const viaRx = list.every((l) => l.source === "rxnorm");
    findings.push({
      ingredient,
      medNames: list.map((l) => l.med.name),
      item: {
        kind: "duplicate",
        issue: `${names.join(" and ")} all contain ${ingredient}${viaRx ? " (checked with NIH RxNorm)" : ""}. Should these be taken together, or is one replacing the other?`,
        quotes: list.map((l) => l.med.source_quote),
      },
    });
  }
  return findings;
}
