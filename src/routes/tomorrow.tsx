import { createFileRoute } from "@tanstack/react-router";

import { AddTaskDialog } from "@/components/lumi/task-dialog";
import { AppShell } from "@/components/lumi/app-shell";
import { CollisionAlerts } from "@/components/lumi/collision-alerts";
import { TaskList } from "@/components/lumi/task-list";
import { selectTomorrow, sortTasks, tomorrowKey, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/tomorrow")({
  head: () => ({
    meta: [
      { title: "Tomorrow's Tasks — Lumi" },
      { name: "description", content: "Plan tomorrow before it arrives with Lumi." },
      { property: "og:title", content: "Tomorrow's Tasks — Lumi" },
      { property: "og:description", content: "Plan tomorrow before it arrives with Lumi." },
    ],
  }),
  component: TomorrowPage,
});

function TomorrowPage() {
  const { tasks } = useLumi();
  const list = sortTasks(selectTomorrow(tasks));

  return (
    <AppShell
      title="Tomorrow"
      subtitle={`${list.length} task${list.length === 1 ? "" : "s"} planned`}
      action={<AddTaskDialog defaultDate={tomorrowKey()} />}
    >
      <CollisionAlerts tasks={list} />
      <TaskList
        tasks={list}
        emptyTitle="Tomorrow is open"
        emptyHint="Planning the night before is the discipline habit."
      />
    </AppShell>
  );
}
