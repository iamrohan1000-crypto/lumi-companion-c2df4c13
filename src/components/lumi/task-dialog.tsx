import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { todayKey, useLumi, type Priority, type Repeat, type Task } from "@/lib/lumi-store";

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180];

export function TaskDialog({
  task,
  defaultDate,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  task?: Task;
  defaultDate?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { addTask, updateTask, settings, places } = useLumi();
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;

  const [title, setTitle] = useState(task?.title ?? "");
  const [note, setNote] = useState(task?.note ?? "");
  const [date, setDate] = useState(task?.date ?? defaultDate ?? todayKey());
  const [time, setTime] = useState(task?.time ?? "");
  const [duration, setDuration] = useState(task?.duration ?? 30);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [category, setCategory] = useState(
    task?.category ?? settings.categories[0] ?? "Routine",
  );
  const [important, setImportant] = useState(task?.important ?? false);
  const [reminder, setReminder] = useState(task?.reminder ?? true);
  const [reminderLead, setReminderLead] = useState<number>(
    task?.reminderLead ??
      (/water/i.test(task?.title ?? "") ? settings.waterReminderLead : settings.taskReminderLead),
  );
  const [locationId, setLocationId] = useState(task?.locationId ?? "none");
  const [remindOnLeave, setRemindOnLeave] = useState(task?.remindOnLeave ?? false);
  const [repeat, setRepeat] = useState<Repeat>(
    task?.repeat ?? (task?.repeatDaily ? "daily" : "none"),
  );

  useEffect(() => {
    if (!open || task) return;
    setTitle("");
    setNote("");
    setDate(defaultDate ?? todayKey());
    setTime("");
    setDuration(30);
    setPriority("medium");
    setImportant(false);
    setReminder(true);
    setReminderLead(settings.taskReminderLead);
    setRepeat("none");
    setLocationId("none");
    setRemindOnLeave(false);
  }, [open, task, defaultDate]);

  function submit() {
    if (!title.trim()) {
      toast.error("Give the task a name first.");
      return;
    }
    const payload = {
      title: title.trim(),
      note: note.trim() || undefined,
      date,
      time: time || undefined,
      duration,
      priority,
      category,
      important,
      reminder,
      reminderLead,
      repeatDaily: repeat === "daily",
      repeat,
      locationId: locationId === "none" ? undefined : locationId,
      remindOnLeave: locationId === "none" ? undefined : remindOnLeave,
    };

    if (task) {
      updateTask(task.id, payload);
      toast.success("Task updated");
    } else {
      addTask(payload);
      toast.success("Added to your routine");
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{task ? "Edit task" : "Add a task"}</DialogTitle>
          <DialogDescription>Lumi will keep you on track with it.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Task name</Label>
            <Input
              id="task-title"
              value={title}
              autoFocus
              placeholder="Morning workout"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="task-date">Date</Label>
              <Input
                id="task-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-time">Time</Label>
              <Input
                id="task-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d < 60 ? `${d} min` : `${d / 60} hr`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-note">Notes</Label>
            <Textarea
              id="task-note"
              rows={2}
              value={note}
              placeholder="Optional details"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-border">
            <ToggleRow
              title="⭐ Important"
              hint="Highlighted in light blue and pinned to the top"
              checked={important}
              onChange={setImportant}
            />
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-xs text-muted-foreground">
                  Remind me when I reach this place
                </p>
              </div>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No place</SelectItem>
                  {places.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {locationId !== "none" ? (
              <ToggleRow
                title="Remind when leaving"
                hint="Nudge me about it if it's still unfinished when I leave"
                checked={remindOnLeave}
                onChange={setRemindOnLeave}
              />
            ) : null}
            <ToggleRow
              title="Reminder"
              hint="Vibrate, ring and alert at task time"
              checked={reminder}
              onChange={setReminder}
            />
            {reminder ? (
              <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Remind me before</p>
                  <p className="text-xs text-muted-foreground">
                    {reminderLead === 0
                      ? "Exactly at the scheduled time"
                      : `${reminderLead} min before it starts`}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  className="w-24"
                  value={reminderLead}
                  onChange={(e) =>
                    setReminderLead(Math.max(0, Math.min(120, Number(e.target.value) || 0)))
                  }
                />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Repeat</p>
                <p className="text-xs text-muted-foreground">
                  Future instances are generated automatically
                </p>
              </div>
              <Select value={repeat} onValueChange={(v) => setRepeat(v as Repeat)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Never</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            className="press bg-brand w-full rounded-full text-primary-foreground hover:opacity-90"
          >
            {task ? "Save changes" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
  last,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${last ? "" : "border-b border-border"}`}
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function AddTaskDialog({ defaultDate }: { defaultDate?: string }) {
  return (
    <TaskDialog
      defaultDate={defaultDate}
      trigger={
        <Button className="press bg-brand glow rounded-full text-primary-foreground hover:opacity-90">
          <Plus className="size-4" />
          New task
        </Button>
      }
    />
  );
}
