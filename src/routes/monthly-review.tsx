import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/lumi/app-shell";
import { buildMonthlyReview } from "@/lib/lumi-insights";
import { prettyMinutes, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/monthly-review")({
  head: () => ({
    meta: [
      { title: "Monthly AI Review — Lumi" },
      {
        name: "description",
        content:
          "A 30-day report: overall productivity, completion percentage, top achievements, biggest delays, habit and water statistics with charts.",
      },
      { property: "og:title", content: "Monthly AI Review — Lumi" },
      {
        property: "og:description",
        content: "Your month in charts: achievements, delays, habits, water and working hours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MonthlyReviewPage,
});

const PIE_COLORS = ["var(--primary)", "var(--muted-foreground)", "var(--destructive)", "var(--warning, orange)"];

function MonthlyReviewPage() {
  const { tasks, water, washroom, habits, habitLog, focusSessions, settings } = useLumi();
  const r = buildMonthlyReview({
    tasks,
    water,
    washroom,
    habits,
    habitLog,
    focusSessions,
    waterGoal: settings.waterGoal,
  });

  const pie = [
    { name: "Completed", value: r.completed.length },
    { name: "Pending", value: r.pending.length },
    { name: "Cancelled", value: r.cancelled.length },
    { name: "Missed", value: r.missed.length },
  ].filter((d) => d.value > 0);

  return (
    <AppShell title="Monthly AI review" subtitle="Your last 30 days at a glance">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Overall productivity" value={`${r.analysis.productivity}%`} />
        <Stat label="Completion" value={`${r.analysis.completionRate}%`} />
        <Stat label="Working hours" value={prettyMinutes(r.analysis.totals.workingMinutes)} />
        <Stat label="Avg water" value={`${r.avgWater} / day`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Productivity trend</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={r.perDay}>
                <defs>
                  <linearGradient id="prodFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={4} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="productivity"
                  name="Productivity %"
                  stroke="var(--primary)"
                  fill="url(#prodFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Task breakdown</h2>
          <div className="mt-4 h-64">
            {pie.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks logged this month yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={3}>
                    {pie.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-4 text-primary" /> Top achievements
          </h2>
          {r.achievements.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing completed yet this month.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {r.achievements.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{t.important ? "⭐ " : ""}{t.title}</span>
                  <span className="text-xs text-muted-foreground">{prettyMinutes(t.duration || 0)}</span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="font-display mt-5 text-base font-semibold">Most repeated tasks</h3>
          {r.topRepeated.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No repeats yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {r.topRepeated.map((t) => (
                <li key={t.title} className="flex justify-between">
                  <span>{t.title}</span>
                  <span className="text-muted-foreground">×{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Biggest delays</h2>
          {r.biggestDelays.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No delays — everything finished on time.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {r.biggestDelays.map((d) => (
                <li key={d.task.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{d.task.title}</span>
                  <span className="text-xs text-destructive">+{prettyMinutes(d.minutes)}</span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="font-display mt-5 text-base font-semibold">Habits</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Best: {r.bestHabit ? `${r.bestHabit.name} (${r.bestHabit.pct}%)` : "—"} · Weakest:{" "}
            {r.worstHabit ? `${r.worstHabit.name} (${r.worstHabit.pct}%)` : "—"} · Habit score{" "}
            {r.analysis.habitScore}%
          </p>

          <h3 className="font-display mt-5 text-base font-semibold">Improvement suggestions</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {r.analysis.suggestions.map((s) => (
              <li key={s} className="rounded-2xl bg-accent/60 p-3 text-sm">
                {s}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
