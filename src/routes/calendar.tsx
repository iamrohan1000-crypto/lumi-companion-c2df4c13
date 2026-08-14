import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadFile, icsToEvents, tasksToICS } from "@/lib/lumi-ics";
import { importEventsAsTasks, markCalendarSynced, todayKey, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar Sync — Lumi" },
      {
        name: "description",
        content:
          "Import Google or Android Calendar events and export your Lumi tasks as a calendar file.",
      },
      { property: "og:title", content: "Calendar Sync — Lumi" },
      {
        property: "og:description",
        content: "Two-way calendar sync for Lumi tasks through standard .ics files.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { tasks, settings, updateSettings } = useLumi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const upcoming = tasks.filter((t) => t.date >= todayKey() && t.status !== "cancelled");

  function exportTasks() {
    if (upcoming.length === 0) {
      toast.error("No upcoming tasks to export.");
      return;
    }
    downloadFile("lumi-tasks.ics", tasksToICS(upcoming), "text/calendar");
    markCalendarSynced();
    toast.success(`Exported ${upcoming.length} tasks — open the file to add them to your calendar.`);
  }

  async function importFile(file: File) {
    const text = await file.text();
    const events = icsToEvents(text);
    if (events.length === 0) {
      toast.error("No events found in that calendar file.");
      return;
    }
    const added = importEventsAsTasks(events);
    markCalendarSynced();
    setPreview(added);
    toast.success(`Imported ${added} new event${added === 1 ? "" : "s"} as tasks.`);
  }

  return (
    <AppShell title="Calendar sync" subtitle="Google Calendar and Android Calendar via .ics">
      <section className="surface-card rounded-3xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Synchronisation</p>
            <p className="text-xs text-muted-foreground">
              {settings.lastCalendarSync
                ? `Last sync ${new Date(settings.lastCalendarSync).toLocaleString()}`
                : "Never synced yet"}
            </p>
          </div>
          <Switch
            checked={settings.calendarSync}
            onCheckedChange={(v) => updateSettings({ calendarSync: v })}
          />
        </div>

        <div className="mt-4 grid gap-2">
          <Label>Sync frequency</Label>
          <Select
            value={settings.calendarFrequency}
            onValueChange={(v) =>
              updateSettings({ calendarFrequency: v as "manual" | "hourly" | "daily" })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual only</SelectItem>
              <SelectItem value="hourly">Hourly reminder</SelectItem>
              <SelectItem value="daily">Daily reminder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
            <Download className="size-4" /> Export tasks
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Downloads {upcoming.length} upcoming task{upcoming.length === 1 ? "" : "s"} as
            lumi-tasks.ics. Open it on your phone or import it in Google Calendar → Settings →
            Import.
          </p>
          <Button
            onClick={exportTasks}
            disabled={!settings.calendarSync}
            className="press bg-brand mt-4 rounded-full text-primary-foreground hover:opacity-90"
          >
            Export .ics
          </Button>
        </section>

        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
            <Upload className="size-4" /> Import events
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Export your calendar as .ics (Google Calendar → Settings → Import & export) and drop it
            here. Duplicates are skipped automatically.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            disabled={!settings.calendarSync}
            onClick={() => fileRef.current?.click()}
            className="press mt-4 rounded-full"
          >
            Choose .ics file
          </Button>
          {preview !== null ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-success">
              <CalendarDays className="size-3.5" /> {preview} task{preview === 1 ? "" : "s"} added
            </p>
          ) : null}
        </section>
      </div>

      {!settings.calendarSync ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Turn synchronisation on to enable import and export.
        </p>
      ) : null}
    </AppShell>
  );
}
