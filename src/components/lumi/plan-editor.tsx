import { Check, Coffee, Droplets, GripVertical, Lock, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  resequencePlan,
  setBlockDuration,
  setBlockLead,
  type Plan,
  type PlanBlock,
} from "@/lib/lumi-autoplan";

function BlockIcon({ block }: { block: PlanBlock }) {
  if (block.kind === "water") return <Droplets className="size-4 text-info" />;
  if (block.kind === "break") return <Coffee className="size-4 text-muted-foreground" />;
  if (block.fixed) return <Lock className="size-4 text-warning" />;
  return <Sparkles className="size-4 text-primary" />;
}

/**
 * Drag-and-drop plan editor — flexible blocks can be reordered, resized and
 * given their own reminder lead before the plan is approved. Fixed blocks
 * (Phase 37) never move.
 */
export function PlanCard({
  plan,
  index,
  onChange,
  onApprove,
  onReject,
}: {
  plan: Plan;
  index: number;
  onChange: (next: Plan) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [tuning, setTuning] = useState(false);

  function move(fromId: string, toId: string) {
    if (fromId === toId) return;
    const flexible = plan.blocks.filter((b) => !b.fixed).map((b) => b.id);
    const from = flexible.indexOf(fromId);
    const to = flexible.indexOf(toId);
    if (from < 0 || to < 0) return;
    flexible.splice(to, 0, ...flexible.splice(from, 1));
    onChange(resequencePlan(plan, flexible));
  }

  return (
    <article className="surface-card flex flex-col rounded-3xl p-5">
      <header>
        <p className="font-display text-lg font-semibold">{plan.name}</p>
        <p className="text-sm text-muted-foreground">{plan.tagline}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {plan.stats.tasks} tasks · {Math.round(plan.stats.workMinutes / 6) / 10}h work ·{" "}
          {plan.stats.breakMinutes} min breaks · {plan.stats.fixed} fixed · {plan.stats.waters} water
          reminders
        </p>
      </header>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {tuning ? "Drag flexible items to reorder" : "Plan preview"}
        </p>
        <Button
          size="sm"
          variant={tuning ? "default" : "outline"}
          className="press h-7 rounded-full px-3 text-xs"
          onClick={() => setTuning((v) => !v)}
        >
          {tuning ? "Done editing" : "Fine-tune"}
        </Button>
      </div>

      <ul className="mt-2 max-h-96 overflow-y-auto pr-1">
        {plan.blocks.map((b) => (
          <li
            key={b.id}
            draggable={tuning && !b.fixed}
            onDragStart={() => setDragId(b.id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              if (!tuning || b.fixed || !dragId) return;
              e.preventDefault();
              setOverId(b.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) move(dragId, b.id);
              setDragId(null);
              setOverId(null);
            }}
            className={cn(
              "flex gap-3 border-b border-border/60 py-2 last:border-b-0",
              tuning && !b.fixed && "cursor-grab rounded-xl px-1 hover:bg-accent/40",
              overId === b.id && "bg-accent/60",
              dragId === b.id && "opacity-50",
            )}
          >
            {tuning ? (
              <span className="mt-1 w-4 shrink-0 text-muted-foreground">
                {b.fixed ? <Lock className="size-3.5" /> : <GripVertical className="size-4" />}
              </span>
            ) : null}
            <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
              {b.start}–{b.end}
            </span>
            <span className="mt-0.5 shrink-0">
              <BlockIcon block={b} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm",
                  b.kind === "task" ? "font-medium" : "text-muted-foreground",
                  b.important && "text-foreground",
                )}
              >
                {b.title}
                {b.important ? " ★" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {b.duration} min
                {b.kind === "task" ? ` · ${b.category}` : ""}
                {b.location && b.location !== "Anywhere" ? ` · ${b.location}` : ""}
                {b.note ? ` · ${b.note}` : ""}
              </span>

              {tuning ? (
                <span className="mt-2 flex flex-wrap items-center gap-3">
                  {!b.fixed ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">Minutes</span>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        className="h-7 w-20"
                        value={b.duration}
                        onChange={(e) =>
                          onChange(setBlockDuration(plan, b.id, Number(e.target.value) || 5))
                        }
                      />
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      {b.kind === "water" ? "Water alert" : "Alert"} min before
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      step={5}
                      className="h-7 w-20"
                      value={b.reminderLead ?? 0}
                      onChange={(e) => onChange(setBlockLead(plan, b.id, Number(e.target.value) || 0))}
                    />
                  </span>
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-muted/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Why Lumi chose this
        </p>
        <p className="mt-1 text-sm">{plan.shortReason}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">More detail</summary>
          <p className="mt-1 text-xs text-muted-foreground">{plan.reason}</p>
        </details>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          className="press flex-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={onApprove}
        >
          <Check className="size-4" />
          Approve Plan {index + 1}
        </Button>
        <Button
          className="press flex-1 rounded-full bg-red-600 text-white hover:bg-red-700"
          onClick={onReject}
        >
          <X className="size-4" />
          Reject
        </Button>
      </div>
    </article>
  );
}
