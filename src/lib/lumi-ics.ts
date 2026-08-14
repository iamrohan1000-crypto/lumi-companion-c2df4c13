/** Phase 25 — calendar sync through the .ics format (Google Calendar / Android Calendar). */

import { minutesOf, type Task } from "@/lib/lumi-store";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(date: string, time?: string, offsetMinutes = 0) {
  const [y, m, d] = date.split("-").map(Number);
  const base = new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  const mins = (time ? minutesOf(time) : 9 * 60) + offsetMinutes;
  base.setMinutes(base.getMinutes() + mins);
  return (
    `${base.getFullYear()}${pad(base.getMonth() + 1)}${pad(base.getDate())}` +
    `T${pad(base.getHours())}${pad(base.getMinutes())}00`
  );
}

/** Builds an .ics calendar with one VEVENT per task. */
export function tasksToICS(tasks: Task[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lumi//Task Export//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const t of tasks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${t.id}@lumi.app`,
      `DTSTAMP:${toICSDate(t.date, t.time)}`,
      `DTSTART:${toICSDate(t.date, t.time)}`,
      `DTEND:${toICSDate(t.date, t.time, t.duration || 30)}`,
      `SUMMARY:${escapeICS(t.title)}`,
      `DESCRIPTION:${escapeICS([t.note, `Category: ${t.category}`, `Priority: ${t.priority}`].filter(Boolean).join(" — "))}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeICS(value = "") {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export type ImportedEvent = { title: string; date: string; time?: string; duration: number };

function parseICSDate(raw: string) {
  const clean = raw.trim().replace(/Z$/, "");
  const m = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return null;
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    time: m[4] ? `${m[4]}:${m[5]}` : undefined,
    stamp: new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
    ).getTime(),
  };
}

/** Reads VEVENTs out of an .ics file exported from Google / Android Calendar. */
export function icsToEvents(source: string): ImportedEvent[] {
  const unfolded = source.replace(/\r?\n[ \t]/g, "");
  const events: ImportedEvent[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0] ?? "";
    const get = (key: string) => body.match(new RegExp(`^${key}[^:\\r\\n]*:(.*)$`, "m"))?.[1];
    const title = get("SUMMARY")?.replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
    const start = get("DTSTART");
    if (!title || !start) continue;
    const s = parseICSDate(start);
    if (!s) continue;
    const endRaw = get("DTEND");
    const e = endRaw ? parseICSDate(endRaw) : null;
    const duration = e ? Math.max(5, Math.round((e.stamp - s.stamp) / 60_000)) : 30;
    events.push({ title, date: s.date, time: s.time, duration });
  }
  return events;
}

export function downloadFile(filename: string, contents: string, type = "text/plain") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
