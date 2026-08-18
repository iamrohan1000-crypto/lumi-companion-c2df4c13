import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Flame, Sunrise, Target, Timer } from "lucide-react";

import { AddTaskDialog } from "@/components/lumi/task-dialog";
import { TaskList } from "@/components/lumi/task-list";
import { AppShell } from "@/components/lumi/app-shell";
import { ProductivityScore } from "@/components/lumi/productivity-score";
import { WhatNowCard } from "@/components/lumi/what-now";
import { Progress } from "@/components/ui/progress";
import {
  selectPending,
  selectToday,
  selectTomorrow,
  sortTasks,
  streakFrom,
  useLumi,
} from "@/lib/lumi-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumi — Your AI. Your Day. Your Way." },
      {
        name: "description",
        content:
          "Lumi is your personal executive assistant: plan your routine, track tasks, and build discipline — all stored offline on your device.",
      },
      { property: "og:title", content: "Lumi — Your AI. Your Day. Your Way." },
      {
        property: "og:description",
        content: "Plan your routine, track tasks, and build discipline with Lumi.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="surface-card rounded-3xl p-5">
      <div className="mb-3 grid size-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Dashboard() {
  const { tasks, settings, activePlan } = useLumi();
  const today = selectToday(tasks);
  const done = today.filter((t) => t.completed).length;
  const pct = today.length ? Math.round((done / today.length) * 100) : 0;
  const pending = selectPending(tasks);
  const tomorrow = selectTomorrow(tasks);
  const streak = streakFrom(tasks);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell
      title={`${greeting}${settings.name ? `, ${settings.name}` : ""}`}
      subtitle="Here's how your day is shaping up."
      action={<AddTaskDialog />}
    >
      <div className="mb-6">
        <WhatNowCard />
      </div>

      {activePlan ? (
        <section className="surface-card mb-6 rounded-3xl border border-emerald-600/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold text-emerald-600">TODAY'S AI PLAN</p>
              <p className="text-sm text-muted-foreground">
                {activePlan.name} · {activePlan.shortReason ?? activePlan.reason}
              </p>
            </div>
            <Link
              to="/ai-plan"
              className="press inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm"
            >
              Open plan
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {activePlan.blocks.slice(0, 8).map((b, i) => (
              <li key={`${b.start}-${i}`} className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">{b.start}</span>{" "}
                <span className={b.kind === "task" ? "font-medium" : "text-muted-foreground"}>
                  {b.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="surface-card glow mb-6 rounded-3xl p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Today's progress</p>
            <p className="font-display text-4xl font-semibold">
              {done}
              <span className="text-muted-foreground">/{today.length || settings.dailyGoal}</span>
            </p>
          </div>
          <p className="text-brand font-display text-3xl font-semibold">{pct}%</p>
        </div>
        <Progress value={pct} className="mt-4 h-2.5" />
        <p className="mt-3 text-sm text-muted-foreground">
          {today.length === 0
            ? "No tasks planned yet — add your first one to get started."
            : pct === 100
              ? "Every task done. That's discipline."
              : `${today.length - done} left to finish strong.`}
        </p>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Flame} label="Day streak" value={streak} hint="Full days completed" />
        <StatCard icon={Timer} label="Pending" value={pending.length} hint="Overdue tasks" />
        <StatCard icon={Target} label="Planned tomorrow" value={tomorrow.length} />
      </section>

      <div className="mb-6">
        <ProductivityScore />
      </div>


      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            <Sunrise className="mr-2 inline size-5 text-primary" />
            Today's tasks
          </h2>
          <Link
            to="/today"
            className="press inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <TaskList
          tasks={sortTasks(today).slice(0, 4)}
          emptyTitle="Your day is a blank page"
          emptyHint="Add a task and Lumi will keep you accountable."
        />
      </section>

      {pending.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              <CheckCircle2 className="mr-2 inline size-5 text-warning" />
              Needs catching up
            </h2>
            <Link
              to="/pending"
              className="press inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <TaskList tasks={sortTasks(pending).slice(0, 3)} emptyTitle="Nothing pending" showDate />
        </section>
      ) : null}
    </AppShell>
  );
}
