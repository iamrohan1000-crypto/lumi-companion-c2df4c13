import { Focus, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CancelReasonDialog } from "@/components/lumi/cancel-reason-dialog";
import { VoiceFeedback } from "@/components/lumi/voice-feedback";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import {
  getLumiState,
  logFocusSession,
  setVoiceSpeech,
  snoozeTaskById,
  todayKey as dayKey,
  minutesOf,
  motivationFor,
  setStatusById,
  subscribeLumi,
  todayKey,
  type Task,
} from "@/lib/lumi-store";
import { address, speak, stopSpeaking } from "@/lib/lumi-voice";
import { praiseFor } from "@/lib/lumi-insights";

/** Phase 22 — a distraction-free screen while an important task is running. */
export function FocusMode() {
  const [task, setTask] = useState<Task | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [dim, setDim] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    function check() {
      if (cancelled) return;
      const { tasks, settings } = getLumiState();
      if (!settings.focusMode) {
        setTask(null);
        return;
      }
      const mins = new Date().getHours() * 60 + new Date().getMinutes();
      const key = todayKey();
      const running = tasks.find((t) => {
        if (t.status !== "pending" || !t.time || t.date !== key) return false;
        if (!t.important && t.priority !== "high") return false;
        if (dismissed.includes(t.id)) return false;
        const start = minutesOf(t.time);
        return mins >= start && mins < start + (t.duration || 30);
      });
      setTask(running ?? null);
      setDim(settings.focusDim);
    }
    check();
    const id = setInterval(check, 15_000);
    const unsub = subscribeLumi(check);
    return () => {
      cancelled = true;
      clearInterval(id);
      unsub();
    };
  }, [dismissed]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!task) return;
    startedAt.current = Date.now();
    setVoiceOn(getLumiState().settings.voiceCommands);
    speak(`${address()}, focus mode is on for ${task.title}. Let's give it your full attention.`);
  }, [task?.id]);

  const remaining = useMemo(() => {
    if (!task?.time) return "";
    void tick;
    const now = new Date();
    const end = new Date();
    end.setHours(0, minutesOf(task.time) + (task.duration || 30), 0, 0);
    const secs = Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [task, tick]);

  const voice = useVoiceCommands(Boolean(task) && voiceOn, (cmd) => {
    if (!task) return;
    if (cmd === "done") {
      finishFocus("completed");
    } else if (cmd === "cancel") {
      setStatusById(task.id, "cancelled");
      speak(`Cancelled ${task.title}, ${address()}.`);
      leave(task.id, "cancelled");
    } else if (cmd === "snooze") {
      const mins = snoozeTaskById(task.id);
      speak(`Snoozed for ${mins} minutes.`);
      leave(task.id, "exited");
    } else if (cmd === "mute") {
      stopSpeaking();
      setVoiceSpeech(false);
    } else if (cmd === "resume") {
      setVoiceSpeech(true);
      speak("Voice resumed.", { force: true });
    }
  });

  if (!task) return null;

  function finishFocus(outcome: "completed" | "cancelled") {
    if (!task) return;
    setStatusById(task.id, "completed");
    speak(`${praiseFor(task.id, address())} ${task.title} is complete.`);
    leave(task.id, outcome);
  }

  function leave(id: string, outcome: "completed" | "cancelled" | "exited" = "exited") {
    const started = startedAt.current;
    const minutes = Math.max(1, Math.round((Date.now() - started) / 60_000));
    if (task) {
      logFocusSession({
        taskId: task.id,
        taskTitle: task.title,
        date: dayKey(),
        startedAt: new Date(started).toISOString(),
        endedAt: new Date().toISOString(),
        minutes,
        outcome,
      });
    }
    setDismissed((d) => [...d, id]);
    setTask(null);
  }


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Focus mode: ${task.title}`}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      style={dim ? { filter: "brightness(0.82)" } : undefined}
    >
      <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-primary">
        <Focus className="size-4" />
        Focus mode
      </p>
      <h2 className="font-display max-w-2xl text-3xl font-semibold md:text-5xl">{task.title}</h2>
      <p className="font-display text-6xl font-bold tabular-nums text-primary md:text-8xl">
        {remaining}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        Notifications other than this task are muted while focus mode is on.
      </p>
      <p className="font-display max-w-md text-lg font-medium text-primary">
        {motivationFor(task.id)}
      </p>

      <div className="mt-4 flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            finishFocus("completed");
          }}
          className="press h-20 flex-1 rounded-3xl bg-success text-lg font-semibold text-background"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Check className="size-6" /> Done
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="press h-20 flex-1 rounded-3xl bg-destructive text-lg font-semibold text-destructive-foreground"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <X className="size-6" /> Cancel
          </span>
        </button>
      </div>

      <VoiceFeedback
        supported={voice.supported}
        listening={voice.listening}
        heard={voice.heard}
        feedback={voice.feedback}
        onRetry={voice.retry}
      />

      <button
        type="button"
        onClick={() => leave(task.id, "exited")}
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        Exit focus mode
      </button>

      <CancelReasonDialog
        task={task}
        open={cancelling}
        onOpenChange={setCancelling}
        onCancelled={() => leave(task.id, "cancelled")}
      />
    </div>
  );
}
