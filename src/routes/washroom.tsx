import { createFileRoute } from "@tanstack/react-router";
import { DoorClosed, DoorOpen, Trash2 } from "lucide-react";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import {
  todayKey,
  useLumi,
  visitDuration,
  visitsOn,
  prettyDuration,
} from "@/lib/lumi-store";

export const Route = createFileRoute("/washroom")({
  head: () => ({
    meta: [
      { title: "Washroom Tracker — Lumi" },
      {
        name: "description",
        content: "Log washroom entry and exit times, durations and daily visit reports.",
      },
      { property: "og:title", content: "Washroom Tracker — Lumi" },
      {
        property: "og:description",
        content: "Track entry, exit, duration and total visits with Lumi.",
      },
    ],
  }),
  component: WashroomPage,
});

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function WashroomPage() {
  const { washroom, enterWashroom, exitWashroom, removeVisit } = useLumi();
  const open = washroom.find((v) => !v.end);
  const today = visitsOn(washroom, todayKey());
  const totalMinutes = today.reduce((s, v) => s + visitDuration(v), 0);

  return (
    <AppShell title="Washroom" subtitle="Enter, exit, and Lumi keeps the log.">
      <section className="surface-card glow mb-6 rounded-3xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={enterWashroom}
            disabled={!!open}
            className="press bg-brand h-16 flex-1 rounded-2xl text-base text-primary-foreground hover:opacity-90"
          >
            <DoorOpen className="size-5" />
            Enter
          </Button>
          <Button
            onClick={exitWashroom}
            disabled={!open}
            variant="outline"
            className="press h-16 flex-1 rounded-2xl text-base"
          >
            <DoorClosed className="size-5" />
            Exit
          </Button>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {open ? `Inside since ${fmt(open.start)}` : "Not currently inside."}
        </p>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Visits today" value={String(today.length)} />
        <Stat label="Time today" value={prettyDuration(totalMinutes) || "0m"} />
        <Stat
          label="Average visit"
          value={
            today.length ? `${Math.round(totalMinutes / today.length)}m` : "—"
          }
        />
      </section>

      <section>
        <h2 className="font-display mb-3 text-lg font-semibold">Daily report</h2>
        {today.length === 0 ? (
          <div className="surface-card rounded-3xl px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold">No visits logged today</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap Enter when you go in and Exit when you're out.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {today.map((v) => (
              <div
                key={v.id}
                className="surface-card flex items-center justify-between gap-4 rounded-3xl p-4"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {fmt(v.start)} → {fmt(v.end)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.end ? `${visitDuration(v)} min` : "in progress"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete visit"
                  onClick={() => removeVisit(v.id)}
                  className="press grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-3xl p-5">
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
