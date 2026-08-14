import { AlertTriangle, ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { findCollisions, useLumi, type Task } from "@/lib/lumi-store";

/** Phase 5: warns about tasks that start at exactly the same time. */
export function CollisionAlerts({ tasks }: { tasks: Task[] }) {
  const { keptCollisions, moveTask, keepCollision } = useLumi();
  const collisions = findCollisions(tasks, keptCollisions);
  const kept = findCollisions(tasks).filter((c) => keptCollisions.includes(c.key));

  if (collisions.length === 0 && kept.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      {collisions.map(({ key, a, b }) => (
        <div key={key} className="surface-card rounded-3xl border border-warning/40 p-5">
          <p className="inline-flex items-center gap-2 font-display text-base font-semibold text-warning">
            <AlertTriangle className="size-5" />
            Time Collision Detected
          </p>
          <p className="mt-1 text-sm text-muted-foreground">I believe you can finish both.</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
              {a.title}
            </span>
            <span className="text-muted-foreground">{a.time}</span>
            <span className="text-muted-foreground">·</span>
            <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
              {b.title}
            </span>
            <span className="text-muted-foreground">{b.time}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="press rounded-full"
              onClick={() => moveTask(a.id, a.duration || 30)}
            >
              <ArrowRight className="size-4" />
              Move {a.title}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="press rounded-full"
              onClick={() => moveTask(b.id, b.duration || 30)}
            >
              <ArrowRight className="size-4" />
              Move {b.title}
            </Button>
            <Button
              size="sm"
              className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
              onClick={() => keepCollision(key)}
            >
              <Check className="size-4" />
              Keep both
            </Button>
          </div>
        </div>
      ))}

      {kept.map(({ key, a, b }) => (
        <div key={key} className="surface-card rounded-3xl border border-primary/40 p-4">
          <p className="text-sm font-medium text-primary">
            Sir, complete both tasks quickly.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.title} and {b.title} both start at {a.time}.
          </p>
        </div>
      ))}
    </div>
  );
}
