import { AlarmClock, CalendarClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysPending, mostPending, prettyDate, useLumi, type Task } from "@/lib/lumi-store";

function PendingRow({ task }: { task: Task }) {
  const { setDueDate, ackPending } = useLumi();
  const [date, setDate] = useState(task.dueBy ?? "");
  const days = daysPending(task);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{task.title}</p>
        <p className="text-xs text-warning">
          This task has been pending for {days} day{days === 1 ? "" : "s"}.
          {task.dueBy ? ` Fixed completion: ${prettyDate(task.dueBy)}.` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          aria-label={`Fixed completion date for ${task.title}`}
          onChange={(e) => setDate(e.target.value)}
          className="w-40 rounded-full"
        />
        <Button
          size="sm"
          className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
          onClick={() => {
            if (!date) {
              toast.error("Pick a date first.");
              return;
            }
            setDueDate(task.id, date);
            toast.success("Fixed completion date set", { description: prettyDate(date) });
          }}
        >
          <CalendarClock className="size-4" />
          Set date
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="press rounded-full"
          onClick={() => ackPending(task.id)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/** Phase 14: flags tasks pending more than 2 days and asks for a fixed completion date. */
export function PendingAnalysis() {
  const { tasks } = useLumi();
  const flagged = mostPending(tasks).filter((t) => !t.pendingAckAt);
  if (flagged.length === 0) return null;

  return (
    <section className="surface-card glow mb-6 rounded-3xl border-warning/40 p-5">
      <p className="font-display flex items-center gap-2 text-lg font-semibold text-warning">
        <AlarmClock className="size-5" />
        Most pending
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        These have been waiting too long. Set a fixed completion date so they stop sliding.
      </p>
      <div className="mt-4">
        {flagged.map((t) => (
          <PendingRow key={t.id} task={t} />
        ))}
      </div>
    </section>
  );
}
