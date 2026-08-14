import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  getLumiState,
  markBriefingDone,
  markNightDone,
  minutesOf,
  subscribeLumi,
  todayKey,
} from "@/lib/lumi-store";
import { pushNotify } from "@/lib/lumi-notify";
import { address, speak } from "@/lib/lumi-voice";

/**
 * Phases 18–20: fires the spoken morning briefing and night summary at the
 * user's chosen times, once per day.
 */
export function DailyAgent() {
  const navigate = useNavigate();
  const running = useRef(false);

  useEffect(() => {
    async function check() {
      if (running.current) return;
      const state = getLumiState();
      const { settings } = state;
      const key = todayKey();
      const mins = new Date().getHours() * 60 + new Date().getMinutes();

      if (
        settings.briefingEnabled &&
        state.lastBriefing !== key &&
        mins >= minutesOf(settings.briefingTime) &&
        mins - minutesOf(settings.briefingTime) < 90
      ) {
        running.current = true;
        markBriefingDone(key);
        const today = state.tasks.filter((t) => t.date === key);
        const important = today.filter((t) => t.important || t.priority === "high");
        speak(
          `Good morning ${address()}. You have ${today.length} task${today.length === 1 ? "" : "s"} today, ${important.length} important. Open your briefing for the full picture.`,
        );
        void pushNotify("Good morning — your Lumi briefing is ready", {
          body: `${today.length} tasks today · ${important.length} important`,
          tag: "lumi-briefing",
        });
        toast("Morning briefing ready", {
          description: `${today.length} tasks today`,
          action: { label: "Open", onClick: () => void navigate({ to: "/briefing" }) },
          duration: 12_000,
        });
        running.current = false;
        return;
      }

      if (
        settings.nightEnabled &&
        state.lastNight !== key &&
        mins >= minutesOf(settings.nightTime) &&
        mins - minutesOf(settings.nightTime) < 120
      ) {
        running.current = true;
        markNightDone(key);
        const today = state.tasks.filter((t) => t.date === key);
        const done = today.filter((t) => t.status === "completed").length;
        speak(
          `Good evening ${address()}. You completed ${done} of ${today.length} tasks today. Your night summary is ready.`,
        );
        void pushNotify("Your Lumi night summary is ready", {
          body: `${done}/${today.length} tasks completed today`,
          tag: "lumi-night",
        });
        toast("Night summary ready", {
          description: `${done}/${today.length} completed`,
          action: { label: "Open", onClick: () => void navigate({ to: "/night-summary" }) },
          duration: 12_000,
        });
        running.current = false;
      }
    }

    void check();
    const id = setInterval(() => void check(), 30_000);
    const unsub = subscribeLumi(() => void check());
    return () => {
      clearInterval(id);
      unsub();
    };
  }, [navigate]);

  return null;
}
