// POST /api/plan
// Receives the discharge text and/or photos/PDFs as form data, runs the pipeline in lib/claude.ts,
// and streams progress lines back so the screen can show what's happening.
// Each line is one JSON object: {"stage":"reading"} ... then {"result":{...}} or {"error":"..."}.
import { extractPlan, type InputDoc } from "@/lib/claude";
import { friendlyError } from "@/lib/errors";
import { allow, clientIp } from "@/lib/ratelimit";

export const maxDuration = 120;

const MAX_TEXT = 30_000;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel rejects request bodies over 4.5 MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function POST(req: Request) {
  if (!allow(`plan:${clientIp(req)}`, Number(process.env.PLAN_LIMIT ?? 25), 10 * 60 * 1000)) {
    return Response.json({ error: "Too many requests. Please wait a few minutes and try again." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const docs: InputDoc[] = [];
  const texts = form.getAll("text").map((t) => String(t).trim()).filter(Boolean);
  if (texts.reduce((n, t) => n + t.length, 0) > MAX_TEXT) return Response.json({ error: "That text is too long." }, { status: 400 });
  texts.forEach((text, i) => docs.push({ kind: "text", text, label: i === 0 ? "pasted discharge text" : `pasted text ${i + 1}` }));

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_FILES) return Response.json({ error: `Please upload at most ${MAX_FILES} files.` }, { status: 400 });
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES)
    return Response.json({ error: "Those files are too large together. Remove one, or paste the text instead." }, { status: 400 });
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) return Response.json({ error: `${f.name} is too large (max 3 MB).` }, { status: 400 });
    const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
    if (f.type === "application/pdf") docs.push({ kind: "pdf", base64, label: f.name });
    else if ((IMAGE_TYPES as readonly string[]).includes(f.type))
      docs.push({ kind: "image", mediaType: f.type as (typeof IMAGE_TYPES)[number], base64, label: f.name });
    else return Response.json({ error: `${f.name}: please upload a photo (JPG/PNG) or a PDF.` }, { status: 400 });
  }

  if (docs.length === 0) return Response.json({ error: "Paste the discharge text or add a photo first." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await extractPlan(docs, (stage) => send({ stage }));
        send({ result });
      } catch (err) {
        send({ error: friendlyError(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
