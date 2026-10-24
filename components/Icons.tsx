// Small pictograms so the plan can be read without reading words: sunrise, midday sun, sunset, moon, plate.
import type { Slot } from "@/lib/schema";

type P = { className?: string; title?: string };

function Svg({ className, title, children }: P & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function Sunrise(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5.6 9.6l1.4 1.4M18.4 9.6 17 11M2 22h20" />
    </Svg>
  );
}
export function Sun(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}
export function Sunset(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 9V5m-3 3 3 3 3-3M2 22h20" />
    </Svg>
  );
}
export function Moon(p: P) {
  return (
    <Svg {...p}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Svg>
  );
}
export function Plate(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13" r="6" />
      <circle cx="12" cy="13" r="3" />
      <path d="M3 4v6M3 7h2M5 4v6M21 4c-1.5 1-2 3-2 5h2v11" />
    </Svg>
  );
}
export function Question(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5h.01" />
    </Svg>
  );
}
export function Ban(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </Svg>
  );
}

export function Check(p: P) {
  return (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}
export function Shield(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 3 5 6v5.5c0 4.4 2.9 7.9 7 9.5 4.1-1.6 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Svg>
  );
}
export function Camera(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Svg>
  );
}
export function Files(p: P) {
  return (
    <Svg {...p}>
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </Svg>
  );
}
export function Printer(p: P) {
  return (
    <Svg {...p}>
      <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z" />
    </Svg>
  );
}
export function Bell(p: P) {
  return (
    <Svg {...p}>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0" />
    </Svg>
  );
}
export function Chat(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
    </Svg>
  );
}
/** The CareSheet mark: a capsule, one half in a pill-box lid colour. */
export function Capsule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? "h-8 w-8"} aria-hidden>
      <g transform="rotate(-40 16 16)">
        <rect x="3" y="10" width="26" height="12" rx="6" fill="#fff" />
        <path d="M16 10h7a6 6 0 0 1 0 12h-7V10Z" fill="var(--color-lid-morning)" />
        <rect x="3" y="10" width="26" height="12" rx="6" fill="none" stroke="#0f2a37" strokeWidth="1.6" />
        <path d="M16 10v12" stroke="#0f2a37" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

export const SLOT_ICON: Record<Slot, (p: P) => React.ReactElement> = {
  morning: Sunrise,
  noon: Sun,
  evening: Sunset,
  bedtime: Moon,
};

export const SLOT_LID: Record<Slot, string> = {
  morning: "bg-lid-morning text-ink",
  noon: "bg-lid-noon text-ink",
  evening: "bg-lid-evening text-ink",
  bedtime: "bg-lid-bedtime text-white",
};
