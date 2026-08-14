import { useEffect } from "react";

import { buildBackup, getLumiState, markBackupDone, subscribeLumi, todayKey } from "@/lib/lumi-store";

export const AUTO_BACKUP_KEY = "lumi.backup.auto";

/** Phase 26 — keeps one automatic snapshot per day on this device. */
export function AutoBackup() {
  useEffect(() => {
    function run() {
      const { settings } = getLumiState();
      if (!settings.autoBackup) return;
      const last = settings.lastBackupAt?.slice(0, 10);
      if (last === todayKey()) return;
      try {
        window.localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(buildBackup()));
        markBackupDone();
      } catch {
        /* quota — ignore */
      }
    }
    const id = setTimeout(run, 4000);
    const interval = setInterval(run, 60 * 60_000);
    const unsub = subscribeLumi(() => {});
    return () => {
      clearTimeout(id);
      clearInterval(interval);
      unsub();
    };
  }, []);

  return null;
}
