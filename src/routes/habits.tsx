import { createFileRoute } from "@tanstack/react-router";
import { Flame, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { habitStats, useLumi, type Habit } from "@/lib/lumi-store";
import { speak } from "@/lib/lumi-voice";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "Habit Tracker — Lumi" },
      {
        name: "description",
        content:
          "Track study, gym, prayer, reading and custom habits with streaks, goals and 30-day graphs.",
      },
      { property: "og:title", content: "Habit Tracker — Lumi" },
      {
        property: "og:description",
        content: "Streaks, daily/weekly/monthly goals and graphs for every habit.",
      },
    ],
  }),
  component: HabitsPage,
});

function Ring({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[11px] font-semibold">{value}%</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="bg-brand h-full rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function HabitCard({ habit }: { habit: Habit }) {
  const { habitLog, logHabit, removeHabit } = useLumi();
  const stats = habitStats(habit, habitLog);

  return (
    <section className="surface-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display truncate text-lg font-semibold">
            <span aria-hidden>{habit.icon}</span> {habit.name}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="size-3.5 text-warning" />
            {stats.streak} day streak · {stats.missedDays} missed this month
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Remove one ${habit.name}`}
            onClick={() => logHabit(habit.id, -1)}
            className="press grid size-9 place-items-center rounded-full bg-muted"
          >
            <Minus className="size-4" />
          </button>
          <span className="font-display w-8 text-center text-lg font-semibold">{stats.today}</span>
          <button
            type="button"
            aria-label={`Log one ${habit.name}`}
            onClick={() => {
              logHabit(habit.id, 1);
              if (stats.today + 1 === habit.dailyGoal) {
                speak(`${habit.name} goal complete. Well done.`);
              }
            }}
            className="press bg-brand grid size-9 place-items-center rounded-full text-primary-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Ring label="Daily" value={stats.dailyPct} />
        <Ring label="Weekly" value={stats.weeklyPct} />
        <Ring label="Monthly" value={stats.monthlyPct} />
      </div>

      <div className="mt-4 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.series}>
            <defs>
              <linearGradient id={`fill-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              fill={`url(#fill-${habit.id})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <button
        type="button"
        onClick={() => removeHabit(habit.id)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        Remove habit
      </button>
    </section>
  );
}

function HabitsPage() {
  const { habits, addHabit } = useLumi();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");
  const [daily, setDaily] = useState(1);

  return (
    <AppShell title="Habits" subtitle="Small reps, compounding results">
      <div className="flex flex-col gap-6">
        <section className="surface-card rounded-3xl p-5">
          <p className="font-display text-lg font-semibold">Add a custom habit</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[80px_1fr_110px_auto]">
            <div>
              <Label className="text-xs">Icon</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 2))} />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                placeholder="e.g. Journaling"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Daily goal</Label>
              <Input
                type="number"
                min={1}
                value={daily}
                onChange={(e) => setDaily(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="press bg-brand w-full rounded-full text-primary-foreground hover:opacity-90"
                onClick={() => {
                  if (!name.trim()) return toast.error("Give the habit a name first.");
                  addHabit({
                    name: name.trim(),
                    icon: icon || "✨",
                    dailyGoal: daily,
                    weeklyGoal: daily * 5,
                    monthlyGoal: daily * 20,
                  });
                  setName("");
                  toast.success("Habit added");
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
