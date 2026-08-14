import {
  AlarmClock,
  Ban,
  Check,
  Clock,
  Flame,
  Pencil,
  Repeat,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { CountdownTimer } from "@/components/lumi/countdown-timer";
import { CancelReasonDialog } from "@/components/lumi/cancel-reason-dialog";
import { TaskDialog } from "@/components/lumi/task-dialog";
import { cn } from "@/lib/utils";
import {
  daysPending,
  delayMinutes,
  endTime,
  prettyDate,
  prettyDuration,
  todayKey,
  useLumi,
  type Task,
  type TaskStatus,
} from "@/lib/lumi-store";

const priorityStyles: Record<Task["priority"], string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-success/15 text-success",
};

const statusStyles: Record<TaskStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  missed: "bg-destructive/15 text-destructive",
};

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "press grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TaskCard({ task, showDate = false }: { task: Task; showDate?: boolean }) {
  const { setStatus, removeTask, snoozeTask, settings } = useLumi();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const done = task.status !== "pending";
  const highlight = task.important && task.status === "pending";

  return (
    <div
      className={cn(
        "surface-card group rounded-3xl p-4",
        done && "opacity-70",
        highlight && "border-primary-glow/50 bg-primary-glow/10 ring-1 ring-primary-glow/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {task.important ? <Star className="size-4 shrink-0 fill-warning text-warning" /> : null}
            <p
              className={cn(
                "font-medium leading-snug",
                task.status === "completed" && "text-muted-foreground line-through",
                task.status === "cancelled" && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </p>
          </div>
          {task.note ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.note}</p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <span className={cn("rounded-full px-2.5 py-1 font-medium", statusStyles[task.status])}>
              {task.status}
            </span>
            <span
              className={cn("rounded-full px-2.5 py-1 font-medium", priorityStyles[task.priority])}
            >
              <Flame className="mr-1 inline size-3" />
              {task.priority}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
              {task.category}
            </span>
            {task.time ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" />
                {task.time}
                {task.duration ? `–${endTime(task)} · ${prettyDuration(task.duration)}` : null}
              </span>
            ) : task.duration ? (
              <span className="text-muted-foreground">{prettyDuration(task.duration)}</span>
            ) : null}
            {showDate ? (
              <span className="text-muted-foreground">{prettyDate(task.date)}</span>
            ) : null}
            {task.repeat && task.repeat !== "none" ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Repeat className="size-3" />
                {task.repeat}
              </span>
            ) : null}
            <CountdownTimer task={task} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {task.status === "pending" && task.date < todayKey() ? (
              <span className="text-warning">
                Pending since {prettyDate(task.date)} · {daysPending(task)} day
                {daysPending(task) === 1 ? "" : "s"}
              </span>
            ) : null}
            {task.postponedCount > 0 ? (
              <span>
                Postponed {task.postponedCount} time{task.postponedCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {task.snoozedUntil && Date.parse(task.snoozedUntil) > Date.now() ? (
              <span>
                Snoozed until{" "}
                {new Date(task.snoozedUntil).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
            {task.dueBy ? <span>Fixed completion: {prettyDate(task.dueBy)}</span> : null}
            {task.completedAt ? (
              <span>
                Completed{" "}
                {new Date(task.completedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {delayMinutes(task) > 0 ? ` · ${delayMinutes(task)}m late` : ""}
              </span>
            ) : null}
            {task.cancelReason ? (
              <span className="text-destructive">Reason: {task.cancelReason}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
        <IconButton
          label={`Complete ${task.title}`}
          onClick={() => setStatus(task.id, task.status === "completed" ? "pending" : "completed")}
          className={cn(
            "hover:border-success hover:bg-success/10 hover:text-success",
            task.status === "completed" && "border-success bg-success/15 text-success",
          )}
        >
          <Check className="size-4" />
        </IconButton>
        <IconButton
          label={`Cancel ${task.title}`}
          onClick={() =>
            task.status === "cancelled" ? setStatus(task.id, "pending") : setCancelling(true)
          }
          className={cn(
            "hover:border-destructive hover:bg-destructive/10 hover:text-destructive",
            task.status === "cancelled" && "border-destructive bg-destructive/15 text-destructive",
          )}
        >
          <X className="size-4" />
        </IconButton>
        <IconButton
          label={`Mark ${task.title} missed`}
          onClick={() => setStatus(task.id, task.status === "missed" ? "pending" : "missed")}
          className={cn(
            "hover:border-warning hover:bg-warning/10 hover:text-warning",
            task.status === "missed" && "border-warning bg-warning/15 text-warning",
          )}
        >
          <Ban className="size-4" />
        </IconButton>
        {task.status === "pending" ? (
          <IconButton
            label={`Snooze ${task.title} for ${settings.snoozeMinutes} minutes`}
            onClick={() => snoozeTask(task.id)}
            className="hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <AlarmClock className="size-4" />
          </IconButton>
        ) : null}
        <IconButton
          label={`Edit ${task.title}`}
          onClick={() => setEditing(true)}
          className="hover:border-primary hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="size-4" />
        </IconButton>
        <IconButton
          label={`Delete ${task.title}`}
          onClick={() => removeTask(task.id)}
          className="hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      {editing ? <TaskDialog task={task} open={editing} onOpenChange={setEditing} /> : null}
      <CancelReasonDialog task={task} open={cancelling} onOpenChange={setCancelling} />
    </div>
  );
}

export function TaskList({
  tasks,
  emptyTitle,
  emptyHint,
  showDate = false,
}: {
  tasks: Task[];
  emptyTitle: string;
  emptyHint?: string;
  showDate?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="surface-card rounded-3xl px-6 py-14 text-center">
        <p className="font-display text-lg font-semibold">{emptyTitle}</p>
        {emptyHint ? <p className="mt-2 text-sm text-muted-foreground">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} showDate={showDate} />
      ))}
    </div>
  );
}
