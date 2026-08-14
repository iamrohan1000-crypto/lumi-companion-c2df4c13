import { createFileRoute } from "@tanstack/react-router";
import { Flame, Focus, Timer, Trophy } from "lucide-react";

import { AppShell } from "@/components/lumi/app-shell";
import { buildWeeklyFocus } from "@/lib/lumi-insights";
import { buildFocusStats, prettyDate, prettyMinutes, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/focus-history")({
  head: () => ({
    meta: [
      { title: "Focus History — Lumi" },
      {
        name: "description",
        content:
          "Every Focus Mode session with total minutes focused per task, daily streaks and best runs.",
      },
      { property: "og:title", content: "Focus History — Lumi" },
      {
        property: "og:description",
        content: "Track deep-work minutes per task and keep your focus streak alive with Lumi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FocusHistoryPage,
});

function FocusHistoryPage() {
  const { focusSessions } = useLumi();
  const stats = buildFocusStats(focusSessions);
  const weekly = buildWeeklyFocus(focusSessions);

  return (
    <AppShell title="Focus history" subtitle="Deep work, session by session">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Timer className="size-4" />} label="Total focused" value={prettyMinutes(stats.totalMinutes)} />
        <Stat icon={<Focus className="size-4" />} label="Today" value={prettyMinutes(stats.todayMinutes)} />
        <Stat icon={<Flame className="size-4" />} label="Current streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} />
        <Stat icon={<Trophy className="size-4" />} label="Best streak" value={`${stats.bestStreak} day${stats.bestStreak === 1 ? "" : "s"}`} />
      </div>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display text-lg font-semibold">This week</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {prettyMinutes(weekly.totalMinutes)} focused · best streak {weekly.bestStreak} day
          {weekly.bestStreak === 1 ? "" : "s"}
        </p>
        <div className="mt-4 flex h-32 items-end gap-2">
          {weekly.days.map((d) => {
            const pct = weekly.bestDayMinutes ? (d.minutes / weekly.bestDayMinutes) * 100 : 0;
            return (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{d.minutes || ""}</span>
                <div
                  className="bg-brand w-full rounded-t-xl transition-all duration-700"
                  style={{ height: `${Math.max(4, pct)}%` }}
                />
                <span className="text-xs text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
        <h3 className="font-display mt-5 text-base font-semibold">Top performers</h3>
        {weekly.topPerformers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No focus sessions this week yet.</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-1 text-sm">
            {weekly.topPerformers.map((t, i) => (
              <li key={t.taskId} className="flex justify-between gap-3">
                <span className="truncate">
                  {i + 1}. {t.title}
                </span>
                <span className="text-muted-foreground">
                  {prettyMinutes(t.minutes)} · {t.sessions}×
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display text-lg font-semibold">Minutes per task</h2>
        {stats.perTask.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No focus sessions yet. Start an important task with Focus Mode on and it will show up here.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {stats.perTask.map((t) => {
              const pct = Math.round((t.minutes / (stats.perTask[0]?.minutes || 1)) * 100);
              return (
                <li key={t.taskId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{t.title}</span>
                    <span className="text-muted-foreground">
                      {prettyMinutes(t.minutes)} · {t.sessions} session{t.sessions === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted">
                    <div className="bg-brand h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display text-lg font-semibold">Sessions</h2>
        {focusSessions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {focusSessions.slice(0, 50).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.taskTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {prettyDate(s.date)} ·{" "}
                    {new Date(s.startedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{prettyMinutes(s.minutes)}</p>
                  <p
                    className={
                      s.outcome === "completed"
                        ? "text-xs text-success"
                        : s.outcome === "cancelled"
                          ? "text-xs text-destructive"
                          : "text-xs text-muted-foreground"
                    }
                  >
                    {s.outcome}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="surface-card rounded-3xl p-4">
      <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="font-display mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
