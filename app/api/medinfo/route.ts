// GET /api/medinfo?name=Metoprolol%20tartrate&lang=en
// "What is this medicine?" from MedlinePlus, the US National Library of Medicine's plain-language
// drug guide. Written by people, not AI, so it's safe to show families. Free, no key.
// Docs: https://medlineplus.gov/connect/service.html
import { ingredientConcepts } from "@/lib/rxnorm";
import { allow, clientIp } from "@/lib/ratelimit";

const RXNORM_OID = "2.16.840.1.113883.6.88";
const cache = new Map<string, MedInfo[]>();

export type MedInfo = { ingredient: string; title: string; url: string; summary: string };

type Feed = {
  feed?: { entry?: { title?: { _value?: string }; link?: { href?: string }[]; summary?: { _value?: string } }[] };
};

function plain(html: string, max = 420): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(". ") + 1 || max) || cut;
}

export async function GET(req: Request) {
  if (!allow(clientIp(req), 60, 10 * 60 * 1000)) return Response.json({ error: "Too many requests." }, { status: 429 });
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").slice(0, 120).trim();
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  if (!name) return Response.json({ error: "Missing name." }, { status: 400 });

  const key = `${lang}:${name.toLowerCase()}`;
  if (cache.has(key)) return Response.json({ results: cache.get(key) });

  const { concepts } = await ingredientConcepts(name);
  const results: MedInfo[] = [];
  let unavailable = false;
  for (const c of (concepts ?? []).filter((c) => c.rxcui).slice(0, 2)) {
    try {
      const res = await fetch(
        `https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=${RXNORM_OID}&mainSearchCriteria.v.c=${c.rxcui}` +
          `&knowledgeResponseType=application/json&informationRecipient.languageCode.c=${lang}`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) throw new Error(`MedlinePlus ${res.status}`);
      const data = (await res.json()) as Feed;
      const first = data.feed?.entry?.[0];
      const href = first?.link?.[0]?.href;
      if (first && href) {
        results.push({
          ingredient: c.name,
          title: first.title?._value ?? c.name,
          url: href,
          summary: plain(first.summary?._value ?? ""),
        });
      }
    } catch (err) {
      // MedlinePlus unreachable: say so (and don't cache), rather than claiming there's no page.
      console.error("medlineplus failed:", err instanceof Error ? err.message : "unknown");
      unavailable = true;
    }
  }
  if (!unavailable) cache.set(key, results);
  return Response.json({ results, unavailable });
}
