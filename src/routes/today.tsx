import { createFileRoute } from "@tanstack/react-router";

import { AddTaskDialog } from "@/components/lumi/task-dialog";
import { AppShell } from "@/components/lumi/app-shell";
import { CollisionAlerts } from "@/components/lumi/collision-alerts";
import { TaskList } from "@/components/lumi/task-list";
import { selectToday, sortTasks, todayKey, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today's Tasks — Lumi" },
      { name: "description", content: "Everything Lumi has planned for you today." },
      { property: "og:title", content: "Today's Tasks — Lumi" },
      { property: "og:description", content: "Everything Lumi has planned for you today." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { tasks } = useLumi();
  const today = sortTasks(selectToday(tasks));
  const done = today.filter((t) => t.completed).length;

  return (
    <AppShell
      title="Today"
      subtitle={`${done} of ${today.length} complete`}
      action={<AddTaskDialog defaultDate={todayKey()} />}
    >
      <CollisionAlerts tasks={today} />
      <TaskList
        tasks={today}
        emptyTitle="Nothing scheduled today"
        emptyHint="Plan your routine and Lumi will track it."
      />
    </AppShell>
  );
}
