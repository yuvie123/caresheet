"use client";
import Link from "next/link";
// Shown if something unexpected breaks while the page is running. Never shows technical details.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-xl">Nothing you added was saved. Please try again.</p>
      <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-xl bg-action px-6 py-3 text-lg font-bold text-white">
        Try again
      </button>
      <p className="mt-4">
        <Link href="/?example" className="text-action underline">
          Or open the finished example
        </Link>
      </p>
    </main>
  );
}
