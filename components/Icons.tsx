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
