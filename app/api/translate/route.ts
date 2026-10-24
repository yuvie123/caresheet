// POST /api/translate  body: {"language":"pa","strings":{"id":"English text",...}}
// Returns {"translations":{"id":"translated text" | null}}. null means "show English for this line",
// which happens when a translation tried to add a number the English didn't have.
import { LANGUAGES, translateStrings, type LanguageCode } from "@/lib/claude";
import { allow, clientIp } from "@/lib/ratelimit";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!allow(clientIp(req), 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { language?: string; strings?: Record<string, string> } | null;
  const language = body?.language as LanguageCode | undefined;
  const strings = body?.strings;
  if (!language || !(language in LANGUAGES) || !strings || typeof strings !== "object") {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const entries = Object.entries(strings).filter(([, v]) => typeof v === "string" && v.length <= 500);
  if (entries.length > 120) return Response.json({ error: "Too much text to translate." }, { status: 400 });

  try {
    const translations = await translateStrings(Object.fromEntries(entries), language);
    return Response.json({ translations });
  } catch (err) {
    console.error("translate failed:", err instanceof Error ? err.name : "unknown");
    return Response.json({ error: "Translation failed. Showing English." }, { status: 502 });
  }
}
