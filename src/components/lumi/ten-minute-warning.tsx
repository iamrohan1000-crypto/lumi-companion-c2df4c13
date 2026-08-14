import { AlarmClock, Check, Clock3, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { TaskDialog } from "@/components/lumi/task-dialog";
import { Button } from "@/components/ui/button";
import {
  getLumiState,
  markWarned,
  minutesOf,
  setStatusById,
  snoozeTaskById,
  subscribeLumi,
  todayKey,
  type Task,
} from "@/lib/lumi-store";
import { pushNotify } from "@/lib/lumi-notify";
import { address, speak } from "@/lib/lumi-voice";

/** Phase 6: a persistent "Only 10 minutes left." heads-up before a task starts. */
export function TenMinuteWarning() {
  const [task, setTask] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!task) return;
    speak(`${address()}, you have only 10 minutes left before ${task.title}.`);
    void pushNotify(`10 minutes left — ${task.title}`, {
      body: task.time ? `Starts at ${task.time}` : undefined,
      tag: `lumi-warn-${task.id}`,
      requireInteraction: false,
    });
  }, [task?.id]);

  useEffect(() => {
    let cancelled = false;

    function check() {
      if (cancelled) return;
      const { tasks, settings } = getLumiState();
      if (!settings.reminders) {
        setTask(null);
        return;
      }
      const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
      const key = todayKey();
      const upcoming = tasks.find((t) => {
        if (t.status !== "pending" || !t.time || t.date !== key || t.warnedAt) return false;
        if (t.snoozedUntil && Date.parse(t.snoozedUntil) > Date.now()) return false;
        const delta = minutesOf(t.time) - nowMins;
        return delta > 0 && delta <= 10;
      });
      setTask(upcoming ?? null);
    }

    check();
    const id = setInterval(check, 15_000);
    const unsub = subscribeLumi(check);
    return () => {
      cancelled = true;
      clearInterval(id);
      unsub();
    };
  }, []);

  if (!task) return null;

  const minsLeft = Math.max(
    1,
    minutesOf(task.time!) - (new Date().getHours() * 60 + new Date().getMinutes()),
  );

  return (
    <>
      <div
        role="status"
        className="fixed bottom-24 left-1/2 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
      >
        <div className="surface-card glow rounded-3xl border border-warning/40 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-warning">
            <Clock3 className="size-4" />
            Only {minsLeft === 10 ? "10" : minsLeft} minutes left.
          </p>
          <p className="mt-2 font-medium leading-snug">{task.title}</p>
          <p className="text-xs text-muted-foreground">Starts at {task.time}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="press rounded-full"
              onClick={() => setOpen(true)}
            >
              <ExternalLink className="size-4" />
              Open task
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="press rounded-full"
              onClick={() => {
                const mins = snoozeTaskById(task.id);
                toast(`Snoozed for ${mins} minutes`);
              }}
            >
              <AlarmClock className="size-4" />
              Snooze
            </Button>
            <Button
              size="sm"
              className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
              onClick={() => setStatusById(task.id, "completed")}
            >
              <Check className="size-4" />
              Done
            </Button>
          </div>
          <button
            type="button"
            className="press mt-3 text-xs text-muted-foreground underline"
            onClick={() => markWarned(task.id)}
          >
            Dismiss
          </button>
        </div>
      </div>

      {open ? <TaskDialog task={task} open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
