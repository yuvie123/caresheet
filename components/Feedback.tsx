// Two-tap impact question shown under the pharmacist list. Anonymous: only the answer is sent.
"use client";
import { useState } from "react";
import { Check } from "./Icons";

const OPTIONS = [
  { answer: "real", label: "Yes, they were real problems" },
  { answer: "not_real", label: "No, they were fine" },
  { answer: "not_asked", label: "Haven't asked yet" },
] as const;

export default function Feedback({ flags }: { flags: number }) {
  const [sent, setSent] = useState<string | null>(null);

  async function send(answer: string) {
    setSent(answer);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, flags }),
      });
    } catch {
      // Feedback is optional; a failure here must never get in the family's way.
    }
  }

  if (flags === 0) return null;
  return (
    <div className="mt-8 border-t border-rule pt-5">
      <p className="text-[1.05rem] font-bold">After you talk to the pharmacist: were these real problems?</p>
      <p className="mt-1 text-[0.95rem] text-muted">Anonymous. Only your answer is sent, nothing about the medicines.</p>
      {sent ? (
        <p role="status" className="mt-3 flex items-center gap-2 font-bold text-ok">
          <Check className="h-6 w-6 shrink-0" />
          Thank you. That helps.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {OPTIONS.map((o) => (
            <button key={o.answer} type="button" onClick={() => void send(o.answer)}
              className="btn btn-secondary min-h-12 !shadow-none">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
