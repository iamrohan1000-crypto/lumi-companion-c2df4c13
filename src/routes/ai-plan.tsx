import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Coffee, Droplets, Lock, Sparkles, Trash2, Wand2 } from "lucide-react";

import { AppShell } from "@/components/lumi/app-shell";
import { WhatNowCard } from "@/components/lumi/what-now";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearActivePlan, planAdherence, todayKey, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/ai-plan")({
  head: () => ({
    meta: [
      { title: "Today's AI Plan — Lumi" },
      {
        name: "description",
        content:
          "The AI plan you approved for today: full timetable, reminders, and how closely you are following it.",
      },
      { property: "og:title", content: "Today's AI Plan — Lumi" },
      {
        property: "og:description",
        content: "Your approved AI timetable with live adherence tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiPlanPage,
});

const OUTCOME_TONE: Record<string, string> = {
  "on-time": "text-emerald-600",
  late: "text-warning",
  cancelled: "text-muted-foreground",
  postponed: "text-warning",
  missed: "text-destructive",
  pending: "text-muted-foreground",
};

function AiPlanPage() {
  const { tasks, activePlan } = useLumi();
  const adherence = planAdherence(tasks, activePlan?.id);
  const isToday = activePlan?.date === todayKey();

  return (
    <AppShell
      title="Today's AI Plan"
      subtitle={activePlan ? activePlan.name : "No plan approved yet"}
      action={
        <Button asChild className="press bg-brand rounded-full text-primary-foreground">
          <Link to="/autoplan">
            <Wand2 className="size-4" />
            Generate plans
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <WhatNowCard />

        {!activePlan ? (
          <section className="surface-card rounded-3xl p-6 text-center">
            <p className="font-display text-lg font-semibold">No AI plan is running</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Head to AI Auto Plan, generate three timetables and approve the one that fits.
            </p>
          </section>
        ) : (
          <>
            <section className="surface-card rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                    <CalendarCheck className="size-5 text-emerald-600" />
                    {activePlan.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isToday ? "Running today" : `Approved for ${activePlan.date}`} · approved at{" "}
                    {new Date(activePlan.approvedAt).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="press rounded-full"
                  onClick={() => clearActivePlan()}
                >
                  <Trash2 className="size-4" />
                  Clear plan
                </Button>
              </div>
              <p className="mt-3 rounded-2xl bg-muted/50 p-3 text-sm">
                {activePlan.shortReason ?? activePlan.reason}
              </p>
            </section>

            <section className="surface-card rounded-3xl p-5">
              <p className="font-display text-lg font-semibold">Complete schedule</p>
              <ul className="mt-3">
                {activePlan.blocks.map((b, i) => (
                  <li
                    key={`${b.start}-${i}`}
                    className="flex gap-3 border-b border-border/60 py-2 last:border-b-0"
                  >
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                      {b.start}–{b.end}
                    </span>
                    <span className="mt-0.5 shrink-0">
                      {b.kind === "water" ? (
                        <Droplets className="size-4 text-info" />
                      ) : b.kind === "break" ? (
                        <Coffee className="size-4 text-muted-foreground" />
                      ) : b.taskId ? (
                        <Lock className="size-4 text-warning" />
                      ) : (
                        <Sparkles className="size-4 text-primary" />
                      )}
                    </span>
                    <span className={cn("text-sm", b.kind !== "task" && "text-muted-foreground")}>
                      {b.title}
                      {b.important ? " ★" : ""}
                      {b.duration ? (
                        <span className="ml-2 text-xs text-muted-foreground">{b.duration} min</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Phase 41 — plan learning */}
            <section className="surface-card rounded-3xl p-5">
              <p className="font-display text-lg font-semibold">How you're following it</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Lumi compares planned time against actual time to improve future plans.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["On time", adherence.onTime],
                  ["Late", adherence.late],
                  ["Postponed", adherence.postponed],
                  ["Cancelled", adherence.cancelled],
                  ["Missed", adherence.missed],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-2xl bg-muted/50 p-3 text-center">
                    <p className="font-display text-2xl font-semibold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Average drift: {adherence.avgDrift >= 0 ? "+" : ""}
                {adherence.avgDrift} min against plan.
              </p>

              <ul className="mt-4 flex flex-col gap-1">
                {adherence.rows.map((r, i) => (
                  <li key={`${r.title}-${i}`} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{r.title}</span>
                    <span className={cn("shrink-0 text-xs", OUTCOME_TONE[r.outcome])}>
                      {r.planned ?? "—"} → {r.actual ?? "—"} · {r.outcome}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
