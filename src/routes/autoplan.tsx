import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Mic,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { PlanCard } from "@/components/lumi/plan-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listen, recognitionSupported } from "@/lib/lumi-speech";
import { speak } from "@/lib/lumi-voice";
import {
  analyzeFeasibility,
  buildPlans,
  emptyDraft,
  learnFromHistory,
  parseTaskStatement,
  prettyStyle,
  type DraftTask,
  type Feasibility,
  type Plan,
  type PlanInput,
} from "@/lib/lumi-autoplan";
import {
  addTasksBulk,
  reminderLeadFor,
  rememberPlanDislike,
  saveApprovedPlan,
  todayKey,
  type Priority,
  type TaskInput,
  useLumi,
} from "@/lib/lumi-store";

export const Route = createFileRoute("/autoplan")({
  head: () => ({
    meta: [
      { title: "AI Auto Plan — Lumi" },
      {
        name: "description",
        content:
          "Let Lumi build three optimized day plans — productive, balanced and relaxed — then approve the one that fits.",
      },
      { property: "og:title", content: "AI Auto Plan — Lumi" },
      {
        property: "og:description",
        content: "Three AI-optimized timetables for your day. Approve one, reject the rest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AutoPlanPage,
});

const PRIORITIES: Priority[] = ["low", "medium", "high"];

function DraftRow({
  draft,
  onChange,
  onRemove,
}: {
  draft: DraftTask;
  onChange: (patch: Partial<DraftTask>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2">
        <Input
          value={draft.title}
          placeholder="Task name"
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <Button variant="ghost" size="icon" className="press shrink-0" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs text-muted-foreground">Duration (min)</Label>
          <Input
            type="number"
            min={5}
            max={480}
            value={draft.duration}
            onChange={(e) => onChange({ duration: Math.max(5, Number(e.target.value) || 5) })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Deadline</Label>
          <Input
            type="time"
            value={draft.deadline ?? ""}
            onChange={(e) => onChange({ deadline: e.target.value || undefined })}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Location</Label>
          <Input value={draft.location} onChange={(e) => onChange({ location: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Input value={draft.category} onChange={(e) => onChange({ category: e.target.value })} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Importance</span>
          {PRIORITIES.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={draft.importance === p ? "default" : "outline"}
              className="press h-7 rounded-full px-3 text-xs capitalize"
              onClick={() => onChange({ importance: p })}
            >
              {p}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={draft.fixed}
            onCheckedChange={(v) => onChange({ fixed: v, time: v ? (draft.time ?? "09:00") : undefined })}
          />
          <span className="text-xs text-muted-foreground">
            {draft.fixed ? "Fixed time" : "Flexible time"}
          </span>
          {draft.fixed ? (
            <Input
              type="time"
              className="h-8 w-28"
              value={draft.time ?? "09:00"}
              onChange={(e) => onChange({ time: e.target.value })}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Bucketed({
  title,
  tone,
  items,
}: {
  title: string;
  tone: string;
  items: { title: string; duration: number; why: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{title}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((b) => (
          <li key={b.title} className="text-sm">
            <span className="font-medium">{b.title}</span>{" "}
            <span className="text-xs text-muted-foreground">
              · {b.duration} min · {b.why}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Phase 38 — conflict and capacity report shown before the plans. */
function FeasibilityPanel({ report }: { report: Feasibility }) {
  return (
    <section
      className={`surface-card rounded-3xl p-5 ${report.overloaded ? "border border-destructive/40" : ""}`}
    >
      <p className="font-display inline-flex items-center gap-2 text-lg font-semibold">
        {report.overloaded ? <AlertTriangle className="size-5 text-destructive" /> : null}
        {report.headline}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {Math.round(report.needed / 6) / 10}h of work and breaks against{" "}
        {Math.round(report.available / 6) / 10}h of usable day.
      </p>

      {report.conflicts.length ? (
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-warning">
          {report.conflicts.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Bucketed title="Must do" tone="text-destructive" items={report.mustDo} />
        <Bucketed title="Should do" tone="text-primary" items={report.shouldDo} />
        <Bucketed title="Can postpone" tone="text-muted-foreground" items={report.canPostpone} />
      </div>
    </section>
  );
}

function AutoPlanPage() {
  const { tasks, settings, planHistory, planDislikes, updateTask, removeTask } = useLumi();
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [statement, setStatement] = useState("");
  const [dislike, setDislike] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [approved, setApproved] = useState<Plan | null>(null);
  const [feasibility, setFeasibility] = useState<Feasibility | null>(null);
  const [listening, setListening] = useState(false);
  const handleRef = useRef<{ stop: () => void } | null>(null);

  const date = todayKey();
  const behaviour = useMemo(() => learnFromHistory(tasks), [tasks]);
  const appointments = useMemo(
    () => tasks.filter((t) => t.date === date && t.status === "pending" && t.time),
    [tasks, date],
  );
  const pending = useMemo(
    () => tasks.filter((t) => t.status === "pending" && t.date < date),
    [tasks, date],
  );

  function generate(nextRound = round, extraDislikes: string[] = []) {
    const usable = drafts.filter((d) => d.title.trim());
    if (!usable.length && !appointments.length && !pending.length) {
      toast.error("Add at least one task first, Sir.");
      return;
    }
    const input: PlanInput = {
      date,
      drafts: usable,
      appointments,
      pending,
      dislikes: [...planDislikes, ...extraDislikes],
      behaviour,
      round: nextRound,
    };
    // Phase 38 — check the day for conflicts and overload before planning.
    const check = analyzeFeasibility(input);
    setFeasibility(check);
    if (check.overloaded && settings.voiceEnabled) {
      speak("Sir, you have more work than available time.");
    }
    const built = buildPlans(input);
    setPlans(built);
    setRejected([]);
    setApproved(null);
  }

  function startVoice() {
    if (!recognitionSupported()) {
      toast.error("This browser has no speech recognition.");
      return;
    }
    setListening(true);
    handleRef.current = listen(
      (text, isFinal) => {
        setStatement((prev) => (isFinal ? `${prev ? `${prev} ` : ""}${text}` : prev));
      },
      {
        interim: false,
        onEnd: () => setListening(false),
        onError: () => {
          setListening(false);
          toast.error("Couldn't hear that — try again.");
        },
      },
    );
  }

  function stopVoice() {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
  }

  function interpret() {
    const parsed = parseTaskStatement(statement);
    if (!parsed.length) {
      toast.error("Lumi couldn't find any tasks in that.");
      return;
    }
    setDrafts((prev) => [...prev, ...parsed]);
    setStatement("");
    toast.success(`Lumi found ${parsed.length} task${parsed.length === 1 ? "" : "s"}`);
  }

  function approve(plan: Plan) {
    const fresh: TaskInput[] = [];
    const keep = new Set<string>();
    for (const b of plan.blocks) {
      if (b.kind === "water") continue;
      if (b.taskId) {
        keep.add(b.taskId);
        updateTask(b.taskId, {
          date,
          time: b.start,
          duration: b.duration,
          reminder: true,
          reminderLead: b.reminderLead ?? settings.taskReminderLead,
          planId: plan.id,
          plannedTime: b.start,
        });
        continue;
      }
      fresh.push({
        title: b.title,
        date,
        time: b.start,
        duration: b.duration,
        priority: b.important ? "high" : b.kind === "break" ? "low" : "medium",
        category: b.category,
        important: b.important,
        reminder: b.kind === "task",
        reminderLead:
          b.reminderLead ??
          (b.kind === "task" ? settings.taskReminderLead : settings.waterReminderLead),
        repeatDaily: false,
        repeat: "none",
        note: b.note,
        planId: plan.id,
        plannedTime: b.start,
      });
    }

    // Phase 40 — the approved plan replaces today's routine.
    tasks
      .filter((t) => t.date === date && t.status === "pending" && !keep.has(t.id))
      .forEach((t) => removeTask(t.id));

    if (fresh.length) addTasksBulk(fresh);

    saveApprovedPlan({
      id: plan.id,
      date,
      style: plan.style,
      name: plan.name,
      reason: plan.reason,
      shortReason: plan.shortReason,
      approvedAt: new Date().toISOString(),
      approvedBy: "user",
      rejectedStyles: plans.filter((p) => p.id !== plan.id).map((p) => prettyStyle(p.style)),
      blocks: plan.blocks.map((b) => ({
        title: b.title,
        start: b.start,
        end: b.end,
        kind: b.kind,
        duration: b.duration,
        taskId: b.taskId,
        important: b.important,
      })),
    });

    setApproved(plan);
    setPlans([]);
    const label = `Plan ${plans.findIndex((p) => p.id === plan.id) + 1}`;
    toast.success(`${label} approved.`, { description: `${plan.name} is now your routine today.` });
    if (settings.voiceEnabled) {
      speak(
        `${label} approved. The ${prettyStyle(plan.style)} plan is now your routine, and reminders are running.`,
      );
    }
  }

  function reject(plan: Plan) {
    const remaining = plans.filter((p) => p.id !== plan.id);
    setRejected((prev) => [...prev, prettyStyle(plan.style)]);
    if (remaining.length === 0) {
      const note = dislike.trim();
      if (note) rememberPlanDislike(note);
      toast("None of these plans work for you, Sir. Let me create three new plans.");
      if (settings.voiceEnabled)
        speak("None of these plans work for you, Sir. Let me create three new plans.");
      const next = round + 1;
      setRound(next);
      setDislike("");
      generate(next, note ? [note] : []);
      return;
    }
    setPlans(remaining);
  }

  return (
    <AppShell title="AI Auto Plan" subtitle="Three optimized days — approve the one that fits">
      <div className="flex flex-col gap-6">
        {/* Phase 36 — My Tasks */}
        <section className="surface-card rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            <p className="font-display text-lg font-semibold">My Tasks</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Type or speak everything on your plate. Lumi splits it into tasks you can edit.
          </p>

          <Textarea
            className="mt-4"
            rows={3}
            value={statement}
            placeholder='e.g. "Tomorrow I have ACCA class at 9 am, gym, mandi work, study, shopping and a meeting"'
            onChange={(e) => setStatement(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant={listening ? "destructive" : "secondary"}
              className="press rounded-full"
              onClick={listening ? stopVoice : startVoice}
            >
              <Mic className="size-4" />
              {listening ? "Stop listening" : "Speak tasks"}
            </Button>
            <Button className="press rounded-full" onClick={interpret} disabled={!statement.trim()}>
              <Sparkles className="size-4" />
              Interpret with AI
            </Button>
            <Button
              variant="outline"
              className="press rounded-full"
              onClick={() => setDrafts((p) => [...p, emptyDraft()])}
            >
              <Plus className="size-4" />
              Add task manually
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {drafts.map((d) => (
              <DraftRow
                key={d.id}
                draft={d}
                onChange={(patch) =>
                  setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, ...patch } : x)))
                }
                onRemove={() => setDrafts((prev) => prev.filter((x) => x.id !== d.id))}
              />
            ))}
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tasks yet — Lumi will still plan around your existing appointments and pending
                work.
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            <Label className="text-sm">Tell AI what you don't like (optional)</Label>
            <Textarea
              className="mt-2"
              rows={2}
              value={dislike}
              placeholder='"I don&apos;t want to wake up early", "I need more breaks", "Put study in the evening", "I have to go to the market at 4 AM"'
              onChange={(e) => setDislike(e.target.value)}
            />
            {planDislikes.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Lumi remembers: {planDislikes.slice(0, 4).join(" · ")}
              </p>
            ) : null}
          </div>

          <Button
            className="press bg-brand mt-4 rounded-full text-primary-foreground hover:opacity-90"
            onClick={() => {
              const note = dislike.trim();
              if (note) rememberPlanDislike(note);
              generate(round, note ? [note] : []);
            }}
          >
            <Wand2 className="size-4" />
            Generate 3 Plans
          </Button>
        </section>

        {approved ? (
          <section className="surface-card rounded-3xl border border-emerald-600/40 p-5">
            <p className="font-display text-lg font-semibold text-emerald-600">
              {approved.name} approved
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your dashboard and reminders now follow this schedule. The other plans were
              cancelled. See it any time on the AI Plan screen.
            </p>
          </section>
        ) : null}

        {feasibility ? <FeasibilityPanel report={feasibility} /> : null}

        {plans.length ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((p, i) => (
              <PlanCard
                key={p.id}
                plan={p}
                index={i}
                onChange={(next) => setPlans((prev) => prev.map((x) => (x.id === p.id ? next : x)))}
                onApprove={() => approve(p)}
                onReject={() => reject(p)}
              />
            ))}
          </div>
        ) : null}

        {rejected.length && plans.length ? (
          <p className="text-xs text-muted-foreground">Rejected this round: {rejected.join(", ")}</p>
        ) : null}

        {planHistory.length ? (
          <section className="surface-card rounded-3xl p-5">
            <p className="font-display text-lg font-semibold">Approved plan history</p>
            <ul className="mt-3 flex flex-col gap-2">
              {planHistory.slice(0, 8).map((p) => (
                <li key={p.id} className="border-b border-border/60 pb-2 text-sm last:border-b-0">
                  <span className="font-medium">{p.name}</span>{" "}
                  <span className="text-muted-foreground">
                    · {p.date} · approved by you at {new Date(p.approvedAt).toLocaleTimeString()}
                    {p.rejectedStyles.length ? ` · rejected: ${p.rejectedStyles.join(", ")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
