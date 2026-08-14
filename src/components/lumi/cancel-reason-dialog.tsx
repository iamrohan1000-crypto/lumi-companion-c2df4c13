import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { prettyDate, useLumi, type Task } from "@/lib/lumi-store";

const QUICK_REASONS = [
  "No time today",
  "Not needed anymore",
  "Feeling unwell",
  "Changed my plan",
  "Something urgent came up",
];

/** Phase 11 — asks why a task is being cancelled and stores the reason. */
export function CancelReasonDialog({
  task,
  open,
  onOpenChange,
  onCancelled,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCancelled?: () => void;
}) {
  const { cancelTask } = useLumi();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  function save() {
    if (!reason.trim()) {
      toast.error("Please add a short reason.");
      return;
    }
    cancelTask(task.id, reason);
    toast("Task cancelled", { description: reason.trim() });
    onOpenChange(false);
    onCancelled?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Why are you cancelling?</DialogTitle>
          <DialogDescription>Lumi keeps this in your history so patterns show up.</DialogDescription>
        </DialogHeader>

        <div className="surface-card rounded-2xl p-4 text-sm">
          <p className="font-medium">{task.title}</p>
          <p className="mt-1 text-muted-foreground">
            {prettyDate(task.date)}
            {task.time ? ` · ${task.time}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="press rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {r}
            </button>
          ))}
        </div>

        <Textarea
          rows={3}
          autoFocus
          value={reason}
          placeholder="Reason…"
          onChange={(e) => setReason(e.target.value)}
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="press rounded-full" onClick={() => onOpenChange(false)}>
            Keep task
          </Button>
          <Button
            onClick={save}
            className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
