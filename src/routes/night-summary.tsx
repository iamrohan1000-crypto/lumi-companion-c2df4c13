import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Volume2 } from "lucide-react";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import {
  buildDailyReport,
  delayMinutes,
  prettyMinutes,
  todayKey,
  toKey,
  useLumi,
  type DailyReport,
  type Task,
} from "@/lib/lumi-store";
import { address, speak, stopSpeaking } from "@/lib/lumi-voice";

export const Route = createFileRoute("/night-summary")({
  head: () => ({
    meta: [
      { title: "Night Summary — Lumi" },
      {
        name: "description",
        content:
          "Lumi's AI night summary: what you finished, missed, your productivity score and tomorrow's plan.",
      },
      { property: "og:title", content: "Night Summary — Lumi" },
      {
        property: "og:description",
        content: "Close the day with Lumi's spoken recap and tomorrow's schedule check.",
      },
    ],
  }),
  component: NightSummaryPage,
});

export function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toKey(d);
}

export function nightScript(report: DailyReport, tomorrow: Task[], water: number, washroom: number) {
  const mostDelayed = [...report.completed].sort((a, b) => delayMinutes(b) - delayMinutes(a))[0];
  const parts = [
    `Good evening ${address()}. Here is your day.`,
    `You completed ${report.completed.length} of ${report.all.length} tasks, ${report.completionPct} percent.`,
  ];
  if (report.pending.length) parts.push(`${report.pending.length} still pending.`);
  if (report.cancelled.length) parts.push(`${report.cancelled.length} cancelled.`);
  if (report.mostImportant) parts.push(`Your most important task was ${report.mostImportant.title}.`);
  if (mostDelayed && delayMinutes(mostDelayed) > 0) {
    parts.push(`Most delayed was ${mostDelayed.title}, by ${delayMinutes(mostDelayed)} minutes.`);
  }
  parts.push(`You drank ${water} glasses of water and made ${washroom} washroom visits.`);
  parts.push(`Working time ${prettyMinutes(report.workingMinutes)}.`);
  parts.push(`Productivity score ${report.productivity} percent.`);
  parts.push(
    tomorrow.length
      ? `Tomorrow you have ${tomorrow.length} task${tomorrow.length === 1 ? "" : "s"} lined up.`
      : `Tomorrow is empty. Please create tomorrow's routine before you sleep.`,
  );
  return parts.join(" ");
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-semibold">{value}</p>
    </div>
  );
}

function NightSummaryPage() {
  const { tasks, water, washroom } = useLumi();
  const key = todayKey();
  const report = buildDailyReport(tasks, water, washroom, key);
  const tomorrow = tasks.filter((t) => t.date === tomorrowKey());
  const waterCount = report.waterCount;
  const mostDelayed = [...report.completed].sort((a, b) => delayMinutes(b) - delayMinutes(a))[0];

  return (
    <AppShell title="Night Summary" subtitle="How today really went">
      <div className="flex flex-col gap-6">
        <section className="surface-card glow rounded-3xl p-6">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary">
            <Moon className="size-4" />
            Tonight's recap
          </p>
          <h2 className="font-display mt-3 text-4xl font-semibold">{report.productivity}%</h2>
          <p className="text-sm text-muted-foreground">Productivity score</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
              onClick={() =>
                speak(nightScript(report, tomorrow, waterCount, report.washroomCount), {
                  force: true,
                })
              }
            >
              <Volume2 className="size-4" />
              Speak summary
            </Button>
            <Button variant="outline" className="press rounded-full" onClick={stopSpeaking}>
              Stop
            </Button>
          </div>
        </section>

        <section className="surface-card rounded-3xl px-5 py-2">
          <Line label="Completed" value={`${report.completed.length}`} />
          <Line label="Pending" value={`${report.pending.length}`} />
          <Line label="Cancelled" value={`${report.cancelled.length}`} />
          <Line label="Missed" value={`${report.missed.length}`} />
          <Line label="Most important task" value={report.mostImportant?.title ?? "—"} />
          <Line
            label="Most delayed task"
            value={
              mostDelayed && delayMinutes(mostDelayed) > 0
                ? `${mostDelayed.title} (+${delayMinutes(mostDelayed)}m)`
                : "None"
            }
          />
          <Line label="Water intake" value={`${waterCount} glasses`} />
          <Line label="Washroom visits" value={`${report.washroomCount}`} />
          <Line label="Working hours" value={prettyMinutes(report.workingMinutes)} />
        </section>

        <section className="surface-card rounded-3xl p-5">
          <p className="font-display text-lg font-semibold">Tomorrow</p>
          {tomorrow.length === 0 ? (
            <>
              <p className="mt-2 text-sm text-warning">
                Tomorrow's schedule is empty — set up your routine before you sleep.
              </p>
              <Link
                to="/tomorrow"
                className="press bg-brand mt-4 inline-flex rounded-full px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Plan tomorrow
              </Link>
            </>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {tomorrow.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm">
                    {t.important ? "⭐ " : ""}
                    {t.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t.time ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
