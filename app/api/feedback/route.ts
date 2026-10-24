// POST /api/feedback  body: {"answer":"real"|"not_real"|"not_asked","flags":3}
// Two-tap impact measurement: after talking to the pharmacist, were CareSheet's flags real problems?
// Logs one anonymous line (answer + how many flags), never any medicine names or document text.
// Count them later with: vercel logs --query "caresheet_feedback"
import { allow, clientIp } from "@/lib/ratelimit";

const ANSWERS = new Set(["real", "not_real", "not_asked"]);

export async function POST(req: Request) {
  if (!allow(`feedback:${clientIp(req)}`, 10, 60 * 60 * 1000)) return Response.json({ ok: false }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { answer?: string; flags?: number } | null;
  if (!body?.answer || !ANSWERS.has(body.answer)) return Response.json({ ok: false }, { status: 400 });
  const flags = Number.isFinite(body.flags) ? Math.max(0, Math.min(50, Math.round(body.flags!))) : null;
  console.log(JSON.stringify({ event: "caresheet_feedback", answer: body.answer, flags }));
  return Response.json({ ok: true });
}
