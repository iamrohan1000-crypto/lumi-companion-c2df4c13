import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/lumi/app-shell";
import { TaskList } from "@/components/lumi/task-list";
import { selectCompleted, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/completed")({
  head: () => ({
    meta: [
      { title: "Completed Tasks — Lumi" },
      { name: "description", content: "Everything you've finished with Lumi." },
      { property: "og:title", content: "Completed Tasks — Lumi" },
      { property: "og:description", content: "Everything you've finished with Lumi." },
    ],
  }),
  component: CompletedPage,
});

function CompletedPage() {
  const { tasks } = useLumi();
  const list = selectCompleted(tasks).sort((a, b) =>
    (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
  );

  return (
    <AppShell title="Completed" subtitle={`${list.length} finished so far`}>
      <TaskList
        tasks={list}
        showDate
        emptyTitle="No wins logged yet"
        emptyHint="Check off your first task to see it here."
      />
    </AppShell>
  );
}
