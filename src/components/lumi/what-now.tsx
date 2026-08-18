import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { speak } from "@/lib/lumi-voice";
import { minutesOf, selectPending, selectToday, sortTasks, useLumi, type Task } from "@/lib/lumi-store";

type Suggestion = { pick: Task; line: string; next: Task[] };

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function score(t: Task, mins: number) {
  let s = 0;
  if (t.important) s += 40;
  if (t.priority === "high") s += 30;
  else if (t.priority === "medium") s += 15;
  if (t.time) {
    const start = minutesOf(t.time);
    if (start <= mins) s += 60 + Math.min(60, mins - start); // already due / delayed
    else s += Math.max(0, 40 - (start - mins) / 4);
  }
  if ((t.postponedCount ?? 0) > 0) s += 20;
  return s;
}

/** Phase 42 — "What should I do now?" */
export function WhatNowCard() {
  const { tasks, settings, startTask } = useLumi();
  const [answer, setAnswer] = useState<Suggestion | null>(null);

  function decide() {
    const mins = nowMinutes();
    const candidates = [
      ...selectToday(tasks).filter((t) => t.status === "pending"),
      ...selectPending(tasks),
    ];
    if (!candidates.length) {
      toast("Nothing left on your plate, Sir. Enjoy the gap.");
      if (settings.voiceEnabled) speak("Nothing left on your plate, Sir. Enjoy the gap.");
      setAnswer(null);
      return;
    }
    const ranked = [...candidates].sort((a, b) => score(b, mins) - score(a, mins));
    const pick = ranked[0]!;
    const late = pick.time && minutesOf(pick.time) < mins;
    const line = `Sir, your next priority is ${pick.title}${
      late ? ` — it was due at ${pick.time}` : pick.time ? ` at ${pick.time}` : ""
    }.`;
    setAnswer({ pick, line, next: sortTasks(ranked.slice(1, 3)) });
    if (settings.voiceEnabled) speak(line);
  }

  return (
    <section className="surface-card rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">What should I do now?</p>
          <p className="text-sm text-muted-foreground">
            Lumi weighs the clock, your schedule and anything delayed.
          </p>
        </div>
        <Button
          className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
          onClick={decide}
        >
          <Compass className="size-4" />
          WHAT SHOULD I DO NOW?
        </Button>
      </div>

      {answer ? (
        <div className="mt-4">
          <p className="font-display text-base font-semibold">{answer.line}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="press rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                startTask(answer.pick.id);
                toast.success(`Started ${answer.pick.title}`);
              }}
            >
              <Play className="size-4" />
              START NOW
            </Button>
            <Button asChild variant="outline" className="press rounded-full">
              <Link to="/today">
                Open today
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {answer.next.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Next up
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {answer.next.map((t) => (
                  <li key={t.id} className="text-sm">
                    <span className="font-medium">{t.title}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {t.time ? `· ${t.time}` : "· flexible"}
                      {t.important ? " · important" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
