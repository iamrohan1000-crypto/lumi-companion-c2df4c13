import { createFileRoute } from "@tanstack/react-router";
import { Brain, Lightbulb } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/lumi/app-shell";
import { buildAnalysis, buildSmartSuggestions } from "@/lib/lumi-insights";
import { prettyMinutes, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "AI Productivity Analysis — Lumi" },
      {
        name: "description",
        content:
          "Weekly and monthly productivity analysis with discipline, focus, consistency, water, habit and sleep scores plus improvement suggestions.",
      },
      { property: "og:title", content: "AI Productivity Analysis — Lumi" },
      {
        property: "og:description",
        content: "See your discipline, focus, consistency and habit scores with tailored suggestions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalysisPage,
});

export function Ring({ value, label, size = 108 }: { value: number; label: string; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={9} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          className="fill-none stroke-primary transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="-mt-[calc(50%+6px)] mb-[calc(50%-18px)] text-center">
        <p className="font-display text-xl font-semibold tabular-nums">{value}%</p>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-muted">
        <div className="bg-brand h-2 rounded-full transition-all duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function AnalysisPage() {
  const { tasks, water, washroom, habits, habitLog, focusSessions, settings } = useLumi();
  const [range, setRange] = useState<7 | 30>(7);
  const input = {
    tasks,
    water,
    washroom,
    habits,
    habitLog,
    focusSessions,
    waterGoal: settings.waterGoal,
  };
  const a = buildAnalysis(input, range);
  const smart = buildSmartSuggestions(input);

  return (
    <AppShell title="AI productivity analysis" subtitle="Where your time and discipline actually go">
      <div className="mb-5 inline-flex rounded-full border border-border p-1">
        {([7, 30] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={
              range === r
                ? "bg-brand rounded-full px-4 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-full px-4 py-1.5 text-sm text-muted-foreground"
            }
          >
            {r === 7 ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>

      <section className="surface-card glow rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-around gap-6">
          <Ring value={a.productivity} label="Productivity" size={132} />
          <Ring value={a.discipline} label="Discipline" />
          <Ring value={a.focus} label="Focus" />
          <Ring value={a.consistency} label="Consistency" />
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Detailed scores</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Bar label="Completion rate" value={a.completionRate} />
            <Bar label="Delay rate (lower is better)" value={a.delayRate} />
            <Bar label="Water score" value={a.waterScore} />
            <Bar label="Habit score" value={a.habitScore} />
            <Bar label="Sleep score" value={a.sleepScore} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">{a.totals.completed} / {a.totals.all}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Missed</dt>
              <dd className="font-medium">{a.totals.missed}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Working time</dt>
              <dd className="font-medium">{prettyMinutes(a.totals.workingMinutes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Focus time</dt>
              <dd className="font-medium">{prettyMinutes(a.totals.focusMinutes)}</dd>
            </div>
          </dl>
        </section>

        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
            <Lightbulb className="size-4 text-primary" /> Suggestions
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {a.suggestions.map((s) => (
              <li key={s} className="rounded-2xl bg-accent/60 p-3 text-sm">
                {s}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
          <Brain className="size-4 text-primary" /> Smart suggestions from your behaviour
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {smart.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border p-4">
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
