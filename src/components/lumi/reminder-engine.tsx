import { AlarmClock, Check, Clock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CancelReasonDialog } from "@/components/lumi/cancel-reason-dialog";
import { VoiceFeedback } from "@/components/lumi/voice-feedback";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import {
  getLumiState,
  setVoiceSpeech,
  minutesOf,
  motivationFor,
  subscribeLumi,
  todayKey,
  useLumi,
  type Task,
} from "@/lib/lumi-store";
import { pushNotify } from "@/lib/lumi-notify";
import { address, speak, stopSpeaking } from "@/lib/lumi-voice";
import { encourageFor, praiseFor } from "@/lib/lumi-insights";

const VIBRATION_PULSES = 10;
const VIBRATION_ON = 600;
const VIBRATION_GAP = 400;
const VIBRATION_TOTAL = VIBRATION_PULSES * (VIBRATION_ON + VIBRATION_GAP);

function vibrateTenTimes() {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const pattern: number[] = [];
  for (let i = 0; i < VIBRATION_PULSES; i++) pattern.push(VIBRATION_ON, VIBRATION_GAP);
  navigator.vibrate(pattern);
}

function stopVibration() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(0);
}

/** Fallback chime when the user has not picked a ringtone. */
function playFallbackChime(): () => void {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3);
    osc.stop(ctx.currentTime + 3.1);
    return () => {
      try {
        osc.stop();
        void ctx.close();
      } catch {
        /* noop */
      }
    };
  } catch {
    return () => {};
  }
}

/** Phase 3: vibrate → ringtone (once) → persistent notification. */
export function ReminderEngine() {
  const { setStatus, updateTask, snoozeTask, settings } = useLumi();
  const [active, setActive] = useState<Task | null>(null);
  const [now, setNow] = useState("");
  const [stage, setStage] = useState<"vibrating" | "ringing" | "waiting">("vibrating");
  const [cancelling, setCancelling] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopChimeRef = useRef<(() => void) | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const stopAlarm = useCallback(() => {
    clearTimers();
    stopVibration();
    stopSpeaking();
    stopChimeRef.current?.();
    stopChimeRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [clearTimers]);

  // Poll for due reminders.
  useEffect(() => {
    let cancelled = false;

    function check() {
      if (cancelled || active) return;
      const { tasks, settings } = getLumiState();
      if (!settings.reminders) return;
      const d = new Date();
      const key = todayKey();
      const mins = d.getHours() * 60 + d.getMinutes();

      const due = tasks.find((t) => {
        if (!t.reminder || t.status !== "pending" || !t.time || t.date !== key) return false;
        if (t.snoozedUntil) {
          if (Date.parse(t.snoozedUntil) > Date.now()) return false;
          return true;
        }
        if (t.remindedAt) return false;
        return minutesOf(t.time) <= mins && mins - minutesOf(t.time) < 60;
      });
      if (due) setActive(due);
    }

    check();
    const id = setInterval(check, 10_000);
    const unsub = subscribeLumi(check);
    return () => {
      cancelled = true;
      clearInterval(id);
      unsub();
    };
  }, [active]);

  // Run the alarm sequence for the active task.
  useEffect(() => {
    if (!active) return;
    setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setStage("vibrating");
    vibrateTenTimes();
    speak(
      `${address()}, your ${active.title} time has started. ${motivationFor(active.id)}`,
    );
    void pushNotify(`Lumi reminder: ${active.title}`, {
      body: active.time ? `Scheduled for ${active.time}` : "It's time.",
      tag: `lumi-task-${active.id}`,
    });

    const clockId = setInterval(
      () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
      1000,
    );

    // Step 2 — after the 10 vibrations with no response, ring once.
    const ringId = setTimeout(() => {
      stopVibration();
      setStage("ringing");
      const { settings } = getLumiState();
      if (settings.ringtoneData) {
        const audio = new Audio(settings.ringtoneData);
        audio.loop = false;
        audioRef.current = audio;
        void audio.play().catch(() => {
          stopChimeRef.current = playFallbackChime();
        });
        audio.onended = () => setStage("waiting");
      } else {
        stopChimeRef.current = playFallbackChime();
        timers.current.push(setTimeout(() => setStage("waiting"), 3200));
      }
    }, VIBRATION_TOTAL);
    timers.current.push(ringId);

    return () => {
      clearInterval(clockId);
      stopAlarm();
    };
  }, [active, stopAlarm]);

  const voice = useVoiceCommands(Boolean(active) && settings.voiceCommands, (cmd) => {
    if (cmd === "done") dismiss("completed");
    else if (cmd === "cancel") setCancelling(true);
    else if (cmd === "snooze") snooze();
    else if (cmd === "mute") {
      stopSpeaking();
      setVoiceSpeech(false);
    } else if (cmd === "resume") {
      setVoiceSpeech(true);
      speak("Voice resumed.", { force: true });
    }
  });

  if (!active) return null;

  function dismiss(status?: "completed" | "cancelled") {
    const task = active;
    stopAlarm();
    if (task) {
      if (status) {
        setStatus(task.id, status);
        if (status === "completed") speak(praiseFor(task.id, address()), { force: true });
      }
      else updateTask(task.id, { remindedAt: new Date().toISOString(), snoozedUntil: undefined });
    }
    setActive(null);
  }

  function snooze() {
    const task = active;
    stopAlarm();
    if (task) {
      snoozeTask(task.id);
      speak(encourageFor(task.id, address()));
    }
    setActive(null);
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Reminder: ${active.title}`}
      className="fixed inset-0 z-[100] grid place-items-center bg-background/85 p-4 backdrop-blur-sm"
    >
      <div className="surface-card glow w-full max-w-sm rounded-3xl p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          {stage === "vibrating"
            ? "Vibrating…"
            : stage === "ringing"
              ? "Ringing…"
              : "Waiting for you"}
        </p>
        <h2 className="font-display mt-3 text-2xl font-semibold">{active.title}</h2>
        {active.note ? (
          <p className="mt-2 text-sm text-muted-foreground">{active.note}</p>
        ) : null}
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {now}
          {active.time ? ` · scheduled ${active.time}` : ""}
        </p>
        {active.postponedCount > 0 ? (
          <p className="mt-1 text-xs text-warning">
            Postponed {active.postponedCount} time{active.postponedCount === 1 ? "" : "s"} already.
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Mark completed"
            onClick={() => dismiss("completed")}
            className="press grid size-14 place-items-center rounded-full bg-success/15 text-success"
          >
            <Check className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Cancel task"
            onClick={() => setCancelling(true)}
            className="press grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive"
          >
            <X className="size-6" />
          </button>
        </div>

        <Button
          onClick={snooze}
          variant="outline"
          className="press mt-5 w-full rounded-full"
        >
          <AlarmClock className="size-4" />
          Snooze {settings.snoozeMinutes} min
        </Button>
        <Button
          onClick={() => dismiss()}
          className="press bg-brand mt-3 w-full rounded-full text-primary-foreground hover:opacity-90"
        >
          OK
        </Button>
        <p className="font-display mt-5 text-sm font-medium text-primary">
          {motivationFor(active.id + (active.remindedAt ?? ""))}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This alert stays until you press OK or snooze it.
        </p>
        <div className="mt-3 flex justify-center">
          <VoiceFeedback
            supported={voice.supported}
            listening={voice.listening}
            heard={voice.heard}
            feedback={voice.feedback}
            onRetry={voice.retry}
          />
        </div>
      </div>

      <CancelReasonDialog
        task={active}
        open={cancelling}
        onOpenChange={setCancelling}
        onCancelled={() => {
          stopAlarm();
          setActive(null);
        }}
      />
    </div>
  );
}
