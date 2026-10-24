// Looks up each medication's active ingredient(s) in RxNorm, the US National Library of Medicine's
// official drug database. Free, no API key. Two meds with the same ingredient = possible double dose.
// Docs: https://rxnav.nlm.nih.gov/RxNormAPIs.html
import type { Medication, PharmacistItem } from "./schema";

const BASE = "https://rxnav.nlm.nih.gov/REST";
const TIMEOUT_MS = 4000; // per request
const DEADLINE_MS = 8000; // per medicine, all requests together

// Used only if RxNav is unreachable (e.g. venue Wi-Fi). Lowercase brand or generic -> ingredient.
const FALLBACK: Record<string, string | string[]> = {
  augmentin: ["amoxicillin", "clavulanate"],
  amoxicillin: "amoxicillin",
  clavulanate: "clavulanate",
  prednisone: "prednisone",
  deltasone: "prednisone",
  albuterol: "albuterol",
  ventolin: "albuterol",
  proair: "albuterol",
  spiriva: "tiotropium",
  tiotropium: "tiotropium",
  plavix: "clopidogrel",
  clopidogrel: "clopidogrel",
  zocor: "simvastatin",
  simvastatin: "simvastatin",
  prilosec: "omeprazole",
  omeprazole: "omeprazole",
  synthroid: "levothyroxine",
  levothyroxine: "levothyroxine",
  xarelto: "rivaroxaban",
  rivaroxaban: "rivaroxaban",
  januvia: "sitagliptin",
  sitagliptin: "sitagliptin",
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

export type Ingredient = { name: string; rxcui: string | null };
/** rxnorm = found in RxNorm; fallback = offline list; unidentified = RxNorm doesn't know the name; offline = RxNorm unreachable and not in the list. */
export type LookupSource = "rxnorm" | "fallback" | "unidentified" | "offline";
type Lookup = { concepts: Ingredient[] | null; source: LookupSource };
const cache = new Map<string, Lookup>(); // only successful RxNorm answers are cached

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`RxNav ${res.status}`);
  return res.json();
}

type Approx = { approximateGroup?: { candidate?: { rxcui?: string; score?: string; source?: string }[] } };
type Related = { relatedGroup?: { conceptGroup?: { conceptProperties?: { name?: string; rxcui?: string }[] }[] } };

function fallbackLookup(name: string): Ingredient[] | null {
  const words = name.toLowerCase().split(/[^a-z]+/);
  const hits = new Set(words.flatMap((w) => FALLBACK[w] ?? []));
  return hits.size ? [...hits].map((n) => ({ name: n, rxcui: null })) : null;
}

/** Active ingredients for a medication name, lowercase. null means "could not identify". */
export async function ingredientsFor(name: string): Promise<{ ingredients: string[] | null; source: LookupSource }> {
  const r = await ingredientConcepts(name);
  return { ingredients: r.concepts ? r.concepts.map((c) => c.name) : null, source: r.source };
}

/** Same lookup, but keeps each ingredient's RxNorm ID (used for MedlinePlus links). */
export async function ingredientConcepts(name: string): Promise<Lookup> {
  const key = name.toLowerCase().trim();
  const hit = cache.get(key);
  if (hit) return hit;
  // Never let a slow drug-database lookup hold up the whole plan: after DEADLINE_MS use the offline list.
  const slow = new Promise<Lookup>((resolve) =>
    setTimeout(() => {
      const fb = fallbackLookup(name);
      resolve(fb ? { concepts: fb, source: "fallback" } : { concepts: null, source: "offline" });
    }, DEADLINE_MS),
  );
  return Promise.race([lookupRxNorm(name, key), slow]);
}

async function lookupRxNorm(name: string, key: string): Promise<Lookup> {
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
      const seen = new Set<string>();
      const concepts: Ingredient[] = [];
      for (const p of (related.relatedGroup?.conceptGroup ?? []).flatMap((g) => g.conceptProperties ?? [])) {
        const n = (p.name ?? "").toLowerCase();
        if (n && !seen.has(n)) {
          seen.add(n);
          concepts.push({ name: n, rxcui: p.rxcui ?? null });
        }
      }
      if (concepts.length) {
        const result: Lookup = { concepts, source: "rxnorm" };
        cache.set(key, result);
        return result;
      }
    }
    // RxNorm couldn't identify it; the offline list may still know the brand.
    const fb = fallbackLookup(name);
    return fb ? { concepts: fb, source: "fallback" } : { concepts: null, source: "unidentified" };
  } catch (err) {
    console.error("rxnav lookup failed:", err instanceof Error ? err.message : "unknown");
    const fb = fallbackLookup(name);
    return fb ? { concepts: fb, source: "fallback" } : { concepts: null, source: "offline" };
  }
}

/**
 * Finds medications (that are still being taken) which share an active ingredient.
 * Returns pharmacist questions, each citing both source sentences.
 */
export type DuplicateFinding = { ingredient: string; medNames: string[]; item: PharmacistItem };

export type DuplicateCheck = {
  findings: DuplicateFinding[];
  /** Medicines whose ingredients could not be checked (unknown name or RxNorm unreachable). */
  unchecked: { name: string; reason: "unidentified" | "offline" }[];
};

export async function findDuplicateIngredients(meds: Medication[]): Promise<DuplicateCheck> {
  // Look up everything, including stopped medicines: a stopped drug turning up in a bottle at home is
  // exactly the mistake worth catching.
  const lookups = await Promise.all(meds.map(async (m) => ({ med: m, ...(await ingredientsFor(m.name)) })));

  const byIngredient = new Map<string, typeof lookups>();
  for (const l of lookups) {
    for (const ing of l.ingredients ?? []) {
      const list = byIngredient.get(ing) ?? [];
      if (!list.some((x) => x.med === l.med)) list.push(l);
      byIngredient.set(ing, list);
    }
  }

  const label = (l: (typeof lookups)[number]) => `${l.med.name}${l.med.strength ? ` ${l.med.strength}` : ""}`;
  const findings: DuplicateFinding[] = [];
  for (const [ingredient, list] of byIngredient) {
    const active = list.filter((l) => l.med.status !== "stop");
    const stopped = list.filter((l) => l.med.status === "stop");
    const viaRx = list.every((l) => l.source === "rxnorm");
    const via = viaRx ? " (checked with NIH RxNorm)" : "";
    if (active.length >= 2) {
      const sameName = new Set(active.map((l) => l.med.name.toLowerCase().trim())).size === 1;
      const issue = sameName
        ? `${label(active[0])} appears more than once (for example on the discharge sheet and on a bottle)${via}. It is the same medicine, so count it once, not twice. Please confirm with the pharmacist.`
        : `${active.map(label).join(" and ")} ${active.length === 2 ? "both" : "all"} contain ${ingredient}${via}. Should these be taken together, or is one replacing the other?`;
      findings.push({
        ingredient,
        medNames: active.map((l) => l.med.name),
        item: { kind: "duplicate", issue, quotes: active.map((l) => l.med.source_quote) },
      });
    }
    if (stopped.length >= 1 && active.length >= 1) {
      findings.push({
        ingredient,
        medNames: list.map((l) => l.med.name),
        item: {
          kind: "conflict",
          issue: `${active.map(label).join(" and ")} contains ${ingredient}${via}, which the papers say to STOP (${stopped.map(label).join(", ")}). Do not use it until the pharmacist confirms.`,
          quotes: [...stopped, ...active].map((l) => l.med.source_quote),
        },
      });
    }
  }

  const unchecked = lookups
    .filter((l) => l.med.status !== "stop" && (l.source === "unidentified" || l.source === "offline"))
    .map((l) => ({ name: l.med.name, reason: l.source as "unidentified" | "offline" }));
  return { findings, unchecked };
}
