import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { minutesOf, type Task } from "@/lib/lumi-store";

function format(totalSeconds: number) {
  const neg = totalSeconds < 0;
  const s = Math.abs(totalSeconds);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${neg ? "-" : ""}${mm}:${ss}`;
}

/**
 * Phase 7: counts down the task duration once its start time arrives,
 * then keeps counting into negative time until the task is completed.
 */
export function CountdownTimer({ task }: { task: Task }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!task.time || task.status !== "pending") return null;

  const now = new Date();
  const [y, m, d] = task.date.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, d ?? 1);
  start.setMinutes(minutesOf(task.time));
  const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
  if (elapsed < 0) return null;

  const remaining = (task.duration || 0) * 60 - elapsed;
  const overdue = remaining < 0;

  return (
    <span
      key={tick}
      aria-live="off"
      className={cn(
        "font-display inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
        overdue ? "animate-pulse bg-destructive/15 text-destructive" : "bg-primary/15 text-primary",
      )}
    >
      {format(remaining)}
    </span>
  );
}
