import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/lumi/app-shell";
import { TaskCard } from "@/components/lumi/task-list";
import { Progress } from "@/components/ui/progress";
import { prettyDate, sortTasks, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Lumi" },
      { name: "description", content: "Your day-by-day routine record and completion rate." },
      { property: "og:title", content: "History — Lumi" },
      {
        property: "og:description",
        content: "Your day-by-day routine record and completion rate.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { tasks } = useLumi();

  const days = Object.entries(
    tasks.reduce<Record<string, typeof tasks>>((acc, t) => {
      (acc[t.date] ??= []).push(t);
      return acc;
    }, {}),
  ).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <AppShell title="History" subtitle="Every day you've tracked with Lumi">
      {days.length === 0 ? (
        <div className="surface-card rounded-3xl px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold">No history yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your daily record builds itself as you plan and complete tasks.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map(([date, dayTasks]) => {
            const done = dayTasks.filter((t) => t.completed).length;
            const pct = Math.round((done / dayTasks.length) * 100);
            return (
              <section key={date}>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 className="font-display text-lg font-semibold">{prettyDate(date)}</h2>
                  <span className="text-sm text-muted-foreground">
                    {done}/{dayTasks.length} · {pct}%
                  </span>
                </div>
                <Progress value={pct} className="mb-3 h-2" />
                <div className="flex flex-col gap-3">
                  {sortTasks(dayTasks).map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
