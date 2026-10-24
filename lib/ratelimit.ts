// A tiny per-visitor limit so a public demo link can't burn through the API credits.
// It lives in server memory, so it resets on redeploy. Good enough for a hackathon demo.
const hits = new Map<string, number[]>();

export function allow(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
