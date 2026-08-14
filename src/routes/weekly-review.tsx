import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/lumi/app-shell";
import { buildWeeklyReview } from "@/lib/lumi-insights";
import { prettyMinutes, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/weekly-review")({
  head: () => ({
    meta: [
      { title: "Weekly AI Review — Lumi" },
      {
        name: "description",
        content:
          "Your Sunday review: completed, pending and cancelled tasks, most and least productive days, best and worst habits, and next-week suggestions.",
      },
      { property: "og:title", content: "Weekly AI Review — Lumi" },
      {
        property: "og:description",
        content: "A full week of productivity in one review, with suggestions for the week ahead.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WeeklyReviewPage,
});

function WeeklyReviewPage() {
  const { tasks, water, washroom, habits, habitLog, focusSessions, settings } = useLumi();
  const r = buildWeeklyReview({
    tasks,
    water,
    washroom,
    habits,
    habitLog,
    focusSessions,
    waterGoal: settings.waterGoal,
  });

  return (
    <AppShell title="Weekly AI review" subtitle="The last 7 days, reviewed by Lumi">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="Completed" value={String(r.completed.length)} />
        <Cell label="Pending" value={String(r.pending.length)} />
        <Cell label="Cancelled" value={String(r.cancelled.length)} />
        <Cell label="Missed" value={String(r.missed.length)} />
      </div>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
          <CalendarRange className="size-4 text-primary" /> Day by day
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.perDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                }}
              />
              <Bar dataKey="completed" name="Completed" radius={[8, 8, 0, 0]} fill="var(--primary)" />
              <Bar dataKey="productivity" name="Productivity %" radius={[8, 8, 0, 0]} fill="var(--chart-2, var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Highlights</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <Row label="Longest working day" value={r.longestDay ? `${r.longestDay.label} · ${prettyMinutes(r.longestDay.minutes)}` : "—"} />
            <Row label="Most productive day" value={r.mostProductive ? `${r.mostProductive.label} · ${r.mostProductive.productivity}%` : "—"} />
            <Row label="Least productive day" value={r.leastProductive ? `${r.leastProductive.label} · ${r.leastProductive.productivity}%` : "—"} />
            <Row label="Best habit" value={r.bestHabit ? `${r.bestHabit.name} · ${r.bestHabit.pct}%` : "—"} />
            <Row label="Worst habit" value={r.worstHabit ? `${r.worstHabit.name} · ${r.worstHabit.pct}%` : "—"} />
            <Row label="Average water" value={`${r.avgWater} glasses/day`} />
            <Row label="Average working hours" value={`${r.avgWorkingHours} h/day`} />
          </dl>
        </section>

        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Top pending tasks</h2>
          {r.topPending.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing pending — clean week.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {r.topPending.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.date}</span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="font-display mt-5 text-base font-semibold">Suggestions for next week</h3>
          <ul className="mt-3 flex flex-col gap-2">
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

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
