/** Phase 24 + voice commands — a thin wrapper over the Web Speech Recognition API. */

import { toKey, todayKey, type Priority } from "@/lib/lumi-store";

type AnyRecognition = any;

function RecognitionCtor(): AnyRecognition | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

export function recognitionSupported() {
  return RecognitionCtor() !== null;
}

export type ListenHandle = { stop: () => void };

/**
 * Starts recognition. `onResult` receives the transcript (final results only
 * unless `interim` is set). Returns a handle so callers can stop it.
 */
export function listen(
  onResult: (text: string, isFinal: boolean) => void,
  opts: { continuous?: boolean; interim?: boolean; onEnd?: () => void; onError?: (e: string) => void } = {},
): ListenHandle {
  const Ctor = RecognitionCtor();
  if (!Ctor) {
    opts.onError?.("unsupported");
    return { stop: () => {} };
  }
  const rec: AnyRecognition = new Ctor();
  rec.lang = "en-US";
  rec.continuous = opts.continuous ?? false;
  rec.interimResults = opts.interim ?? false;
  rec.maxAlternatives = 1;

  let stopped = false;
  rec.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      onResult(String(result[0]?.transcript ?? "").trim(), Boolean(result.isFinal));
    }
  };
  rec.onerror = (e: any) => opts.onError?.(String(e?.error ?? "error"));
  rec.onend = () => {
    if (stopped) return;
    if (opts.continuous) {
      try {
        rec.start();
        return;
      } catch {
        /* ignore */
      }
    }
    opts.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    /* already started */
  }

  return {
    stop: () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      opts.onEnd?.();
    },
  };
}

/* ---------- command matching ---------- */

export type VoiceCommand = "done" | "cancel" | "mute" | "resume" | "snooze" | null;

const COMMANDS: Record<Exclude<VoiceCommand, null>, string[]> = {
  done: ["done", "complete", "completed", "finished", "finish", "mark done"],
  cancel: ["cancel", "cancelled", "skip", "drop it"],
  mute: ["mute", "quiet", "silence", "stop talking", "shut up"],
  resume: ["resume", "unmute", "continue", "speak", "start again"],
  snooze: ["snooze", "postpone", "later", "remind me later"],
};

export function matchCommand(text: string): VoiceCommand {
  const t = text.toLowerCase();
  for (const [cmd, words] of Object.entries(COMMANDS)) {
    if (words.some((w) => t.includes(w))) return cmd as VoiceCommand;
  }
  return null;
}

/* ---------- Phase 24: natural-language task parsing ---------- */

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const CATEGORY_HINTS: Record<string, string[]> = {
  Health: ["gym", "workout", "exercise", "walk", "run", "doctor", "water", "yoga"],
  Study: ["class", "study", "lecture", "acca", "exam", "assignment", "homework", "read"],
  Work: ["meeting", "work", "office", "client", "call", "report", "email"],
  Personal: ["buy", "market", "shopping", "grocery", "family", "friend", "movie"],
  Routine: ["prayer", "sleep", "breakfast", "lunch", "dinner", "wake"],
};

export type ParsedTask = {
  title: string;
  date: string;
  time?: string;
  priority: Priority;
  category: string;
  important: boolean;
};

function nextWeekday(index: number) {
  const d = new Date();
  const delta = (index - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return toKey(d);
}

/** Turns "Tomorrow at 9 AM ACCA class" into a task draft. */
export function parseTaskSpeech(input: string): ParsedTask {
  let text = ` ${input.trim()} `;
  const lower = () => text.toLowerCase();

  // date
  let date = todayKey();
  const consume = (re: RegExp) => {
    const m = lower().match(re);
    if (!m) return null;
    text = text.slice(0, m.index).concat(text.slice((m.index ?? 0) + m[0].length));
    return m;
  };

  if (consume(/\bday after tomorrow\b/)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    date = toKey(d);
  } else if (consume(/\btomorrow\b/)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = toKey(d);
  } else if (consume(/\btoday\b|\btonight\b/)) {
    date = todayKey();
  } else {
    for (let i = 0; i < WEEKDAYS.length; i++) {
      const day = WEEKDAYS[i]!;
      if (consume(new RegExp(`\\b(next\\s+)?${day}\\b`))) {
        date = nextWeekday(i);
        break;
      }
    }
  }

  // time — "9 am", "9:30 pm", "at 17:00"
  let time: string | undefined;
  const timeMatch = consume(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (timeMatch) {
    let h = Number(timeMatch[1]);
    const m = Number(timeMatch[2] ?? 0);
    const pm = timeMatch[3]!.startsWith("p");
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } else {
    const t24 = consume(/\b(?:at\s+)?(\d{1,2}):(\d{2})\b/);
    if (t24) {
      time = `${String(Math.min(23, Number(t24[1]))).padStart(2, "0")}:${t24[2]}`;
    }
  }

  // priority / importance
  let priority: Priority = "medium";
  let important = false;
  if (consume(/\b(important|urgent|high priority)\b/)) {
    priority = "high";
    important = true;
  } else if (consume(/\b(low priority|whenever|sometime)\b/)) {
    priority = "low";
  }

  const title = text
    .replace(/\b(at|on|remind me to|remind me|please|lumi|create task|add task|schedule)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const t = title.toLowerCase();
  let category = "Routine";
  for (const [cat, words] of Object.entries(CATEGORY_HINTS)) {
    if (words.some((w) => t.includes(w))) {
      category = cat;
      break;
    }
  }

  return {
    title: title ? title.charAt(0).toUpperCase() + title.slice(1) : "New task",
    date,
    time,
    priority,
    category,
    important,
  };
}
