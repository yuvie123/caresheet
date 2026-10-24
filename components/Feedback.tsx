// Two-tap impact question shown under the pharmacist list. Anonymous: only the answer is sent.
"use client";
import { useState } from "react";

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
    <div className="mt-4 rounded-xl bg-paper p-4">
      <p className="font-bold">After you talk to the pharmacist: were these questions real problems?</p>
      <p className="text-sm text-muted">Anonymous. Only your answer is sent, nothing about the medicines. It tells us if CareSheet helps.</p>
      {sent ? (
        <p className="mt-2 text-action">Thank you. That helps us measure whether CareSheet catches real problems.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <button key={o.answer} type="button" onClick={() => void send(o.answer)}
              className="rounded-lg border-2 border-action px-3 py-1.5 text-action">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
