import { createFileRoute } from "@tanstack/react-router";
import { Ban, CalendarPlus, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { AddTaskDialog } from "@/components/lumi/task-dialog";
import { AppShell } from "@/components/lumi/app-shell";
import { PendingAnalysis } from "@/components/lumi/pending-analysis";
import { TaskList } from "@/components/lumi/task-list";
import { Button } from "@/components/ui/button";
import {
  daysPending,
  selectPending,
  sortTasks,
  todayKey,
  tomorrowKey,
  useLumi,
} from "@/lib/lumi-store";

export const Route = createFileRoute("/pending")({
  head: () => ({
    meta: [
      { title: "Pending Manager — Lumi" },
      {
        name: "description",
        content: "Move, finish or cancel every overdue task in one place with Lumi.",
      },
      { property: "og:title", content: "Pending Manager — Lumi" },
      {
        property: "og:description",
        content: "Move, finish or cancel every overdue task in one place with Lumi.",
      },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const { tasks, rescheduleTasks, bulkStatus } = useLumi();
  const list = sortTasks(selectPending(tasks));
  const ids = list.map((t) => t.id);
  const oldest = list.reduce((max, t) => Math.max(max, daysPending(t)), 0);

  return (
    <AppShell
      title="Pending"
      subtitle={`${list.length} task${list.length === 1 ? "" : "s"} carried over`}
      action={<AddTaskDialog />}
    >
      <PendingAnalysis />

      {list.length > 0 ? (
        <section className="surface-card mb-6 rounded-3xl p-5">
          <p className="font-display text-lg font-semibold">Pending manager</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Oldest item has been waiting {oldest} day{oldest === 1 ? "" : "s"}. Clear the backlog in
            one move.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
              onClick={() => {
                rescheduleTasks(ids, todayKey());
                toast.success("Moved to today");
              }}
            >
              <CalendarPlus className="size-4" />
              Move all to today
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="press rounded-full"
              onClick={() => {
                rescheduleTasks(ids, tomorrowKey());
                toast.success("Moved to tomorrow");
              }}
            >
              <CalendarPlus className="size-4" />
              Move all to tomorrow
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="press rounded-full"
              onClick={() => {
                bulkStatus(ids, "completed");
                toast.success("All marked complete");
              }}
            >
              <CheckCheck className="size-4" />
              Mark all complete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="press rounded-full"
              onClick={() => {
                bulkStatus(ids, "cancelled");
                toast("Backlog cancelled");
              }}
            >
              <Ban className="size-4" />
              Cancel all
            </Button>
          </div>
        </section>
      ) : null}

      <TaskList
        tasks={list}
        showDate
        emptyTitle="Nothing overdue"
        emptyHint="You're fully caught up. Keep the streak alive."
      />
    </AppShell>
  );
}
