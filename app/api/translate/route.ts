// POST /api/translate  body: {"language":"pa","strings":{"id":"English text",...}}
// Returns {"translations":{"id":"translated text" | null}}. null means "show English for this line",
// which happens when a translation tried to add a number the English didn't have.
import { z } from "zod";
import { LANGUAGES, translateStrings, type LanguageCode } from "@/lib/claude";
import { TRANSLATE_MAX_KEYS, TRANSLATE_MAX_VALUE } from "@/lib/render";
import { allow, clientIp } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!allow(`translate:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }
  // Strict shape: a known language and a plain object of short strings with simple ids.
  const Body = z.object({
    language: z.enum(Object.keys(LANGUAGES) as [LanguageCode, ...LanguageCode[]]),
    strings: z
      .record(z.string().regex(/^[a-z_0-9]{1,40}$/), z.string().max(TRANSLATE_MAX_VALUE))
      .refine((r) => Object.keys(r).length <= TRANSLATE_MAX_KEYS, "too many strings")
      .refine((r) => Object.values(r).reduce((n, v) => n + v.length, 0) <= 20_000, "too much text"),
  });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request." }, { status: 400 });
  const { language, strings } = parsed.data;

  try {
    const translations = await translateStrings(strings, language);
    return Response.json({ translations });
  } catch (err) {
    console.error("translate failed:", err instanceof Error ? err.name : "unknown");
    return Response.json({ error: "Translation failed. Showing English." }, { status: 502 });
  }
}
