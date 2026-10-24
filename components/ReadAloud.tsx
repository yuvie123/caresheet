// Reads the plan out loud with the phone's built-in voice, for a parent who can't read well in any script.
// Uses the browser's speech feature: free, offline-capable, and nothing leaves the device.
"use client";
import { useState, useSyncExternalStore } from "react";
import type { PlanResult } from "@/lib/claude";
import { doseNumber, scheduledMeds, stoppedMeds, UI_STRINGS, usedSlots, type UiKey } from "@/lib/render";

const VOICE_LANG: Record<string, string> = { pa: "pa", hi: "hi", es: "es", "": "en" };

// The device's voice list loads asynchronously, so we subscribe to it like any outside data source.
const NONE: SpeechSynthesisVoice[] = [];
let cachedVoices: SpeechSynthesisVoice[] = NONE;
const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;
function subscribe(onChange: () => void) {
  if (!hasSpeech()) return () => {};
  const update = () => {
    cachedVoices = window.speechSynthesis.getVoices();
    onChange();
  };
  update();
  window.speechSynthesis.addEventListener("voiceschanged", update);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
}
const getVoices = () => cachedVoices;
const getServerVoices = () => NONE;

function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

export default function ReadAloud({
  plan,
  translations,
  lang,
}: {
  plan: PlanResult;
  translations: Record<string, string | null> | null;
  lang: string;
}) {
  const voices = useSyncExternalStore(subscribe, getVoices, getServerVoices);
  const [speaking, setSpeaking] = useState(false);
  const target = VOICE_LANG[lang] ?? "en";
  const voice = pickVoice(voices, target) ?? pickVoice(voices, "en");

  if (voices.length === 0) return null; // no speech voices on this device (or not loaded yet)
  const native = voice?.lang.toLowerCase().startsWith(target) && target !== "en";
  const t = (key: string, en: string) => (native ? translations?.[key] ?? en : en);

  function script(): string[] {
    const all = plan.verified_medications;
    const parts: string[] = [];
    const stopped = stoppedMeds(plan);
    if (stopped.length) parts.push(`${t("stop_title", UI_STRINGS.stop_title)}: ${stopped.map((m) => m.name).join(", ")}.`);
    for (const slot of usedSlots(plan)) {
      const key = `slot_${slot}` as UiKey;
      const meds = scheduledMeds(plan).filter((m) => m.slots.includes(slot));
      parts.push(
        `${t(key, UI_STRINGS[key])}: ` +
          meds
            .map((m) => {
              const i = all.indexOf(m);
              const unit = m.dose_unit ? t(`unit_${i}`, m.dose_unit) : "";
              return `${m.name}, ${doseNumber(m)} ${unit}`.trim();
            })
            .join(". ") +
          ".",
      );
    }
    return parts;
  }

  function speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const lines = script();
    lines.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 0.85; // a little slower for older listeners
      if (i === lines.length - 1) u.onend = () => setSpeaking(false);
      synth.speak(u);
    });
    setSpeaking(true);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={speaking ? stop : speak}
        className="rounded-xl border-2 border-action px-4 py-2 font-bold text-action"
      >
        {speaking ? "Stop reading" : "Read it aloud"}
      </button>
      {lang && !native ? (
        <span className="text-sm text-muted">This device has no voice for that language, so it reads in English.</span>
      ) : null}
    </div>
  );
}
