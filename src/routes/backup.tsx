import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, Database, HardDriveDownload, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { downloadFile } from "@/lib/lumi-ics";
import { AUTO_BACKUP_KEY } from "@/components/lumi/auto-backup";
import { buildBackup, markBackupDone, restoreLumiBackup, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Restore — Lumi" },
      {
        name: "description",
        content:
          "Back up tasks, history, reports, habits, water, washroom and voice settings — locally, to Drive, or automatically each day.",
      },
      { property: "og:title", content: "Backup & Restore — Lumi" },
      {
        property: "og:description",
        content: "Keep a full copy of your Lumi data and restore it any time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BackupPage,
});

function filename() {
  return `lumi-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function BackupPage() {
  const { settings, updateSettings, tasks, habits, focusSessions } = useLumi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);

  function backupNow() {
    downloadFile(filename(), JSON.stringify(buildBackup(), null, 2), "application/json");
    markBackupDone();
    toast.success("Backup downloaded");
  }

  function toDrive() {
    downloadFile(filename(), JSON.stringify(buildBackup(), null, 2), "application/json");
    markBackupDone();
    window.open("https://drive.google.com/drive/my-drive", "_blank", "noopener");
    toast("Backup downloaded", {
      description: "Drop the file into the Drive tab that just opened.",
    });
  }

  async function restoreFile(file: File) {
    setRestoring(true);
    const result = restoreLumiBackup(await file.text());
    setRestoring(false);
    if (result.ok) toast.success("Backup restored");
    else toast.error(result.error ?? "Restore failed");
  }

  function restoreAuto() {
    const raw = window.localStorage.getItem(AUTO_BACKUP_KEY);
    if (!raw) {
      toast.error("No automatic backup saved yet.");
      return;
    }
    const result = restoreLumiBackup(raw);
    if (result.ok) toast.success("Restored the latest automatic backup");
    else toast.error(result.error ?? "Restore failed");
  }

  return (
    <AppShell title="Backup & restore" subtitle="Everything Lumi knows, in one file">
      <section className="surface-card rounded-3xl p-5">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <Database className="size-4" /> What's included
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {tasks.length} tasks · history & reports · {habits.length} habits · water & washroom logs ·{" "}
          {focusSessions.length} focus sessions · all settings including voice.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {settings.lastBackupAt
            ? `Last backup ${new Date(settings.lastBackupAt).toLocaleString()}`
            : "No backup taken yet."}
        </p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
            <HardDriveDownload className="size-4" /> Local backup
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Saves a JSON file to this device.
          </p>
          <Button
            onClick={backupNow}
            className="press bg-brand mt-4 rounded-full text-primary-foreground hover:opacity-90"
          >
            Back up now
          </Button>
        </section>

        <section className="surface-card rounded-3xl p-5">
          <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
            <CloudUpload className="size-4" /> Google Drive
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Lumi stays offline, so it prepares the file and opens Drive for you to drop it in.
          </p>
          <Button variant="outline" onClick={toDrive} className="press mt-4 rounded-full">
            Backup to Drive
          </Button>
        </section>
      </div>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Automatic daily backup</p>
            <p className="text-xs text-muted-foreground">
              Keeps a fresh snapshot on this device every day, restorable below.
            </p>
          </div>
          <Switch
            checked={settings.autoBackup}
            onCheckedChange={(v) => updateSettings({ autoBackup: v })}
          />
        </div>
      </section>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display inline-flex items-center gap-2 text-lg font-semibold">
          <RotateCcw className="size-4" /> Restore
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Restoring replaces everything currently stored in this browser.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void restoreFile(f);
            e.target.value = "";
          }}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={restoring}
            className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
          >
            Restore from file
          </Button>
          <Button variant="outline" onClick={restoreAuto} className="press rounded-full">
            Restore last automatic backup
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
