import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Flame,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/lumi/app-shell";
import { CountdownTimer } from "@/components/lumi/countdown-timer";
import { buildAnalysis, buildWeeklyFocus } from "@/lib/lumi-insights";
import {
  habitStats,
  minutesOf,
  prettyMinutes,
  selectPending,
  selectToday,
  sortTasks,
  todayKey,
  useLumi,
} from "@/lib/lumi-store";

export const Route = createFileRoute("/executive")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — Lumi" },
      {
        name: "description",
        content:
          "A glass executive dashboard: today's progress, current and next task, countdown, water, habits, productivity and weekly/monthly progress.",
      },
      { property: "og:title", content: "Executive Dashboard — Lumi" },
      {
        property: "og:description",
        content: "Everything about your day on one beautiful, animated dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExecutivePage,
});

function Dial({
  value,
  label,
  sublabel,
  size = 150,
}: {
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setShown(value), 60);
    return () => clearTimeout(id);
  }, [value]);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * c} ${c}`}
          className="fill-none stroke-primary transition-[stroke-dasharray] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-3xl font-semibold tabular-nums">{Math.round(value)}%</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sublabel ? <p className="text-[10px] text-muted-foreground">{sublabel}</p> : null}
      </div>
    </div>
  );
}

function Tile({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass animate-fade-in rounded-3xl p-5 ${className}`}>
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ExecutivePage() {
  const { tasks, water, washroom, habits, habitLog, focusSessions, settings } = useLumi();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const input = {
    tasks,
    water,
    washroom,
    habits,
    habitLog,
    focusSessions,
    waterGoal: settings.waterGoal,
  };
  const week = buildAnalysis(input, 7);
  const month = buildAnalysis(input, 30);
  const focus = buildWeeklyFocus(focusSessions);

  const today = sortTasks(selectToday(tasks));
  const done = today.filter((t) => t.status === "completed");
  const progress = today.length ? Math.round((done.length / today.length) * 100) : 0;
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

  const current = today.find(
    (t) =>
      t.status === "pending" &&
      t.time &&
      nowMins >= minutesOf(t.time) &&
      nowMins < minutesOf(t.time) + (t.duration || 30),
  );
  const next = today.find((t) => t.status === "pending" && t.time && minutesOf(t.time) > nowMins);
  const pending = selectPending(tasks);
  const important = today.filter((t) => t.important || t.priority === "high");
  const glasses = water[todayKey()] ?? 0;
  const waterPct = Math.min(100, Math.round((glasses / Math.max(1, settings.waterGoal)) * 100));
  const habitCards = habits.slice(0, 4).map((h) => habitStats(h, habitLog, 7));

  return (
    <AppShell title="Executive dashboard" subtitle="Your command centre">
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile title="Today's progress" className="lg:col-span-1">
          <div className="flex items-center justify-center">
            <Dial value={progress} label="complete" sublabel={`${done.length}/${today.length} tasks`} />
          </div>
        </Tile>

        <Tile title="Productivity score">
          <div className="flex items-center justify-around">
            <Dial value={week.productivity} label="week" size={120} />
            <Dial value={month.productivity} label="month" size={120} />
          </div>
        </Tile>

        <Tile title="Focus this week">
          <p className="font-display text-4xl font-semibold">{prettyMinutes(focus.totalMinutes)}</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="size-4 text-primary" /> {focus.streak} day streak · best {focus.bestStreak}
          </p>
          <div className="mt-4 flex h-16 items-end gap-1.5">
            {focus.days.map((d) => {
              const pct = focus.bestDayMinutes ? (d.minutes / focus.bestDayMinutes) * 100 : 0;
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="bg-brand w-full rounded-t-lg transition-all duration-700"
                    style={{ height: `${Math.max(4, pct)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.label.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
        </Tile>

        <Tile title="Current task">
          {current ? (
            <>
              <p className="font-display text-xl font-semibold">{current.title}</p>
              <p className="text-sm text-muted-foreground">
                {current.time} · {prettyMinutes(current.duration || 30)}
              </p>
              <div className="mt-3">
                <CountdownTimer task={current} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing running right now.</p>
          )}
        </Tile>

        <Tile title="Next task">
          {next ? (
            <>
              <p className="font-display text-xl font-semibold">{next.title}</p>
              <p className="text-sm text-muted-foreground">
                {next.time} · {prettyMinutes(next.duration || 30)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing else scheduled today.</p>
          )}
        </Tile>

        <Tile title="Water progress">
          <div className="flex items-center gap-4">
            <Dial value={waterPct} label="hydration" size={110} />
            <div>
              <p className="inline-flex items-center gap-2 text-sm">
                <Droplets className="size-4 text-primary" />
                {glasses} / {settings.waterGoal} glasses
              </p>
              <Link to="/water" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                Log water <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </Tile>

        <Tile title="Important today">
          {important.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing flagged important.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {important.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Star className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">{t.title}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{t.time ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Tile>

        <Tile title="Pending">
          <p className="font-display text-4xl font-semibold">{pending.length}</p>
          <p className="text-sm text-muted-foreground">tasks waiting on you</p>
          <Link to="/pending" className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
            Open pending manager <ArrowRight className="size-3" />
          </Link>
        </Tile>

        <Tile title="Habit progress">
          <ul className="flex flex-col gap-3">
            {habitCards.map((h) => (
              <li key={h.habit.id}>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {h.habit.icon} {h.habit.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{h.weeklyPct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="bg-brand h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${h.weeklyPct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Tile>

        <Tile title="Weekly vs monthly" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Discipline", w: week.discipline, m: month.discipline },
              { label: "Focus", w: week.focus, m: month.focus },
              { label: "Consistency", w: week.consistency, m: month.consistency },
              { label: "Completion", w: week.completionRate, m: month.completionRate },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="text-xs text-muted-foreground">
                    week {row.w}% · month {row.m}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="bg-brand h-2 rounded-full transition-all duration-700"
                    style={{ width: `${row.w}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Tile>

        <Tile title="Lumi says">
          <p className="inline-flex items-start gap-2 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            {week.suggestions[0]}
          </p>
          <Link to="/manager" className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
            Ask the manager <ArrowRight className="size-3" />
          </Link>
        </Tile>
      </div>

      <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5" />
        {done.length} done · <Timer className="size-3.5" /> {prettyMinutes(week.totals.workingMinutes)} worked this week
      </p>
    </AppShell>
  );
}
