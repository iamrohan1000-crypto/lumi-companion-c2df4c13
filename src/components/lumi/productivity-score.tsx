import { Gauge } from "lucide-react";

import { buildScore, useLumi } from "@/lib/lumi-store";

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-sm font-semibold">{value}%</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="bg-brand h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** AI Productivity Score — discipline, time management, focus and the overall blend. */
export function ProductivityScore() {
  const { tasks, water, washroom } = useLumi();
  const score = buildScore(tasks, water, washroom);

  return (
    <section className="surface-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display inline-flex items-center gap-2 text-lg font-semibold">
            <Gauge className="size-5 text-primary" />
            AI Productivity Score
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Rolling 7-day view</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold text-primary">{score.overall}%</p>
          <p className="text-xs text-muted-foreground">Overall</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Bar label="Discipline" value={score.discipline} />
        <Bar label="Time Management" value={score.timeManagement} />
        <Bar label="Focus" value={score.focus} />
        <Bar label="Overall" value={score.overall} />
      </div>
    </section>
  );
}
