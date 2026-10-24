// Small previews of the photos/PDFs that will be read, each with a remove button.
"use client";
import { useEffect, useMemo } from "react";

export default function FileThumbs({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const urls = useMemo(() => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);

  if (!files.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-3">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="relative">
          {urls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimizable asset
            <img src={urls[i]!} alt={`Preview of ${f.name}`} className="h-28 w-24 rounded-lg border-2 border-field object-cover" />
          ) : (
            <div className="flex h-28 w-24 items-center justify-center rounded-lg border-2 border-field bg-wash p-2 text-center text-xs">
              PDF
              <br />
              {f.name}
            </div>
          )}
          <button
            type="button"
            aria-label={`Remove ${f.name}`}
            onClick={() => onRemove(i)}
            className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-ink text-lg text-white"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
