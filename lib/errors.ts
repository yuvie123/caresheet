// Turns API problems into plain-language messages for families, and decides what to log.
// Logs status codes and request ids only, never document contents.
import Anthropic from "@anthropic-ai/sdk";

export const PAUSED = "Live reading is paused right now. The finished example still works.";

/** A short message a worried family member can act on. */
export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    const msg = String(err.message ?? "").toLowerCase();
    console.error("claude api error:", err.status, err.requestID ?? "");
    // Out of credit, bad or revoked key, or billing problems: not the family's fault, and retrying won't help.
    if (/credit|billing|balance|api key|authentication|permission/.test(msg) || err.status === 401 || err.status === 402 || err.status === 403) return PAUSED;
    if (err.status === 429 || err.status === 529) return "CareSheet is busy right now. Please try again in a minute.";
    if (err.status === 413) return "Those files are too large together. Remove one, or paste the text instead.";
    if (err.status && err.status >= 500) return "The reading service had a problem. Please try again.";
    return "The papers couldn't be read. Please try again, or paste the text instead of a photo.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    console.error("claude connection error:", err.name);
    return "CareSheet couldn't reach the reading service. Check the connection and try again, or open the finished example.";
  }
  const message = err instanceof Error ? err.message : "";
  console.error("plan failed:", message.slice(0, 120) || "unknown");
  // Our own messages (from lib/claude.ts) are already plain language; raw status-code text is not.
  return message && !/^\d{3}\b/.test(message) && message.length < 200 ? message : "Something went wrong. Please try again.";
}
