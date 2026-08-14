import { getLumiState } from "@/lib/lumi-store";

/** Phase 18 — a thin wrapper over the browser speech-synthesis voices. */

export type VoiceOption = {
  uri: string;
  name: string;
  lang: string;
  gender: "female" | "male" | "unknown";
};

const FEMALE_HINTS = [
  "female",
  "woman",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "zira",
  "susan",
  "ava",
  "allison",
  "serena",
  "google uk english female",
  "google us english",
];

const MALE_HINTS = [
  "male",
  "man",
  "daniel",
  "alex",
  "fred",
  "thomas",
  "oliver",
  "david",
  "mark",
  "rishi",
  "google uk english male",
];

export function guessGender(name: string): "female" | "male" | "unknown" {
  const n = name.toLowerCase();
  if (FEMALE_HINTS.some((h) => n.includes(h))) return "female";
  if (MALE_HINTS.some((h) => n.includes(h))) return "male";
  return "unknown";
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listVoices(): VoiceOption[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en") || v.default)
    .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, gender: guessGender(v.name) }));
}

/** Voices load asynchronously in most browsers. */
export function onVoicesReady(cb: () => void) {
  if (!speechSupported()) return () => {};
  const handler = () => cb();
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  cb();
  return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
}

/** Voices that sound like a bright young woman — preferred for Lumi. */
const YOUNG_FEMALE_HINTS = [
  "zira",
  "ava",
  "samantha",
  "aria",
  "jenny",
  "sonia",
  "libby",
  "natasha",
  "clara",
  "michelle",
  "google uk english female",
  "google us english",
  "female",
];

function youngScore(name: string) {
  const n = name.toLowerCase();
  const i = YOUNG_FEMALE_HINTS.findIndex((h) => n.includes(h));
  return i === -1 ? YOUNG_FEMALE_HINTS.length : i;
}

function pickVoice() {
  const { settings } = getLumiState();
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  if (settings.voiceURI) {
    const exact = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (exact) return exact;
  }
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en") || v.default);
  if (settings.voiceGender === "female") {
    // youngest-sounding female English voice first
    const ranked = english
      .filter((v) => guessGender(v.name) !== "male")
      .sort((a, b) => youngScore(a.name) - youngScore(b.name));
    if (ranked[0]) return ranked[0];
  }
  const byGender = english.find((v) => guessGender(v.name) === settings.voiceGender);
  return byGender ?? english[0] ?? voices[0];
}


export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** Speaks the line with the user's saved voice settings. Silent when muted. */
export function speak(text: string, opts: { force?: boolean; interrupt?: boolean } = {}) {
  if (!speechSupported() || !text.trim()) return;
  const { settings } = getLumiState();
  if (!settings.voiceEnabled && !opts.force) return;
  if (opts.interrupt !== false) window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = settings.voiceRate;
  utterance.pitch = settings.voicePitch;
  utterance.volume = settings.voiceVolume;
  window.speechSynthesis.speak(utterance);
}

/** "Sir" style address that uses the saved name when present. */
export function address() {
  const { settings } = getLumiState();
  return settings.name ? `Sir ${settings.name}` : "Sir";
}
