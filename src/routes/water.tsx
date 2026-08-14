import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Minus, Target } from "lucide-react";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { lastNDays, todayKey, useLumi, waterTotal } from "@/lib/lumi-store";

export const Route = createFileRoute("/water")({
  head: () => ({
    meta: [
      { title: "Water Tracker — Lumi" },
      {
        name: "description",
        content: "Tap to log every glass of water and track daily, weekly and monthly hydration.",
      },
      { property: "og:title", content: "Water Tracker — Lumi" },
      {
        property: "og:description",
        content: "Log glasses of water and watch your hydration streak grow with Lumi.",
      },
    ],
  }),
  component: WaterPage,
});

function WaterPage() {
  const { water, settings, addWater, updateSettings } = useLumi();
  const today = water[todayKey()] ?? 0;
  const goal = settings.waterGoal || 8;
  const pct = Math.min(100, Math.round((today / goal) * 100));

  const week = lastNDays(7);
  const month = lastNDays(30);
  const weekTotal = waterTotal(water, week);
  const monthTotal = waterTotal(water, month);
  const max = Math.max(goal, ...week.map((k) => water[k] ?? 0));

  return (
    <AppShell title="Water" subtitle="One tap per glass — stay topped up.">
      <section className="surface-card glow mb-6 rounded-3xl p-6 text-center">
        <button
          type="button"
          aria-label="Add one glass of water"
          onClick={() => addWater(1)}
          className="press bg-brand glow mx-auto grid size-44 place-items-center rounded-full text-primary-foreground"
        >
          <span className="flex flex-col items-center">
            <Droplets className="size-10" />
            <span className="font-display mt-2 text-4xl font-semibold">{today}</span>
            <span className="text-xs opacity-80">glasses today</span>
          </span>
        </button>

        <Progress value={pct} className="mx-auto mt-6 h-2.5 max-w-sm" />
        <p className="mt-3 text-sm text-muted-foreground">
          {today >= goal
            ? "Daily target reached. Beautifully done."
            : `${goal - today} more to hit your target of ${goal}.`}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="press mt-4 rounded-full"
          onClick={() => addWater(-1)}
          disabled={today === 0}
        >
          <Minus className="size-4" />
          Undo a glass
        </Button>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Today" value={today} />
        <Stat label="This week" value={weekTotal} />
        <Stat label="Last 30 days" value={monthTotal} />
      </section>

      <section className="surface-card mb-6 rounded-3xl p-5">
        <h2 className="font-display mb-4 text-lg font-semibold">Last 7 days</h2>
        <div className="flex h-40 items-end gap-3">
          {week.map((key) => {
            const value = water[key] ?? 0;
            const height = max ? Math.round((value / max) * 100) : 0;
            const label = new Date(
              Number(key.slice(0, 4)),
              Number(key.slice(5, 7)) - 1,
              Number(key.slice(8, 10)),
            ).toLocaleDateString(undefined, { weekday: "short" });
            return (
              <div key={key} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{value}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="bg-brand w-full rounded-t-xl transition-all"
                    style={{ height: `${Math.max(height, value ? 6 : 2)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-card rounded-3xl p-5">
        <Label htmlFor="water-goal" className="inline-flex items-center gap-2">
          <Target className="size-4 text-primary" />
          Daily target (glasses)
        </Label>
        <Input
          id="water-goal"
          type="number"
          min={1}
          max={30}
          value={goal}
          className="mt-3 max-w-32"
          onChange={(e) => updateSettings({ waterGoal: Math.max(1, Number(e.target.value) || 1) })}
        />
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card rounded-3xl p-5">
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
