import { createFileRoute } from "@tanstack/react-router";
import {
  Ban,
  CheckCircle2,
  Clock,
  Droplets,
  DoorOpen,
  Hourglass,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/lumi/app-shell";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildDailyReport,
  delayMinutes,
  prettyDate,
  prettyMinutes,
  todayKey,
  useLumi,
  type Task,
} from "@/lib/lumi-store";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "AI Daily Report — Lumi" },
      {
        name: "description",
        content:
          "Lumi's daily report: completion rate, working hours, delays, water, washroom and productivity score.",
      },
      { property: "og:title", content: "AI Daily Report — Lumi" },
      {
        property: "og:description",
        content: "See how your day really went with Lumi's daily productivity report.",
      },
    ],
  }),
  component: ReportPage,
});

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={cn("size-4", tone)} />
        {label}
      </div>
      <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TaskLine({ task }: { task: Task }) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <span className="min-w-0">
        <span className="font-medium">{task.title}</span>
        {task.cancelReason ? (
          <span className="block text-xs text-muted-foreground">Reason: {task.cancelReason}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {task.time ?? "anytime"}
        {delayMinutes(task) > 0 ? ` · ${delayMinutes(task)}m late` : ""}
      </span>
    </li>
  );
}

function Section({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <div className="surface-card rounded-3xl p-5">
      <p className="font-display flex items-center justify-between text-base font-semibold">
        {title}
        <span className="text-sm text-muted-foreground">{tasks.length}</span>
      </p>
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="mt-2">
          {tasks.map((t) => (
            <TaskLine key={t.id} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportPage() {
  const { tasks, water, washroom } = useLumi();
  const [date, setDate] = useState(todayKey());
  const r = buildDailyReport(tasks, water, washroom, date);

  const verdict =
    r.productivity >= 80
      ? "Outstanding day. This is the standard now."
      : r.productivity >= 55
        ? "Solid day — tighten the delays and you're elite."
        : r.all.length === 0
          ? "No tasks logged for this day."
          : "Rough day. Pick one task tomorrow and win it early.";

  return (
    <AppShell
      title="Daily Report"
      subtitle={`${prettyDate(r.date)} · Lumi's read on your day`}
      action={
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40 rounded-full"
          aria-label="Report date"
        />
      }
    >
      <section className="surface-card glow mb-6 rounded-3xl p-6">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
          <Sparkles className="size-4" />
          Productivity score
        </p>
        <div className="mt-3 flex items-end gap-3">
          <span className="font-display text-5xl font-semibold">{r.productivity}</span>
          <span className="pb-2 text-sm text-muted-foreground">/ 100</span>
        </div>
        <Progress value={r.productivity} className="mt-4 h-2" />
        <p className="mt-3 text-sm text-muted-foreground">{verdict}</p>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          icon={CheckCircle2}
          tone="text-success"
          label="Completion"
          value={`${r.completionPct}%`}
        />
        <Stat icon={Clock} label="Working hours" value={prettyMinutes(r.workingMinutes)} />
        <Stat icon={Hourglass} label="Free time" value={prettyMinutes(r.freeMinutes)} />
        <Stat icon={Timer} tone="text-warning" label="Delayed" value={String(r.delayed.length)} />
        <Stat icon={Droplets} tone="text-primary-glow" label="Water" value={`${r.waterCount} glasses`} />
        <Stat icon={DoorOpen} label="Washroom" value={`${r.washroomCount} visits`} />
        <Stat
          icon={XCircle}
          tone="text-destructive"
          label="Cancelled"
          value={String(r.cancelled.length)}
        />
        <Stat icon={Ban} tone="text-destructive" label="Missed" value={String(r.missed.length)} />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="surface-card rounded-3xl p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="size-4 text-warning" />
            Most important task
          </p>
          <p className="font-display mt-2 text-lg font-semibold">
            {r.mostImportant?.title ?? "—"}
          </p>
          {r.mostImportant ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {r.mostImportant.time ?? "anytime"} · {r.mostImportant.status}
            </p>
          ) : null}
        </div>
        <div className="surface-card rounded-3xl p-5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="size-4 text-primary" />
            Longest task
          </p>
          <p className="font-display mt-2 text-lg font-semibold">{r.longest?.title ?? "—"}</p>
          {r.longest ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {prettyMinutes(r.longest.duration || 0)} planned
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Section title="Completed" tasks={r.completed} />
        <Section title="Pending" tasks={r.pending} />
        <Section title="Cancelled" tasks={r.cancelled} />
        <Section title="Missed" tasks={r.missed} />
        <Section title="Delayed" tasks={r.delayed} />
      </div>
    </AppShell>
  );
}
