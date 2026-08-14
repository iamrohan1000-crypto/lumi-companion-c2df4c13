/**
 * Phases 28–33 — local, offline AI analysis engine.
 * Everything here is derived from the user's own stored data.
 */

import {
  buildDailyReport,
  buildFocusStats,
  daysPending,
  delayMinutes,
  habitStats,
  lastNDays,
  prettyMinutes,
  toKey,
  todayKey,
  visitsOn,
  type FocusSession,
  type Habit,
  type Task,
  type WashroomVisit,
} from "@/lib/lumi-store";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export type AnalysisInput = {
  tasks: Task[];
  water: Record<string, number>;
  washroom: WashroomVisit[];
  habits: Habit[];
  habitLog: Record<string, Record<string, number>>;
  focusSessions: FocusSession[];
  waterGoal: number;
};

export type Analysis = {
  days: string[];
  productivity: number;
  discipline: number;
  focus: number;
  consistency: number;
  completionRate: number;
  delayRate: number;
  waterScore: number;
  habitScore: number;
  sleepScore: number;
  totals: {
    all: number;
    completed: number;
    pending: number;
    cancelled: number;
    missed: number;
    workingMinutes: number;
    focusMinutes: number;
    avgWater: number;
  };
  suggestions: string[];
};

/** Phase 28 — full productivity analysis over a window of days. */
export function buildAnalysis(input: AnalysisInput, dayCount = 7): Analysis {
  const days = lastNDays(dayCount);
  const reports = days.map((d) => buildDailyReport(input.tasks, input.water, input.washroom, d));
  const all = reports.flatMap((r) => r.all);
  const completed = reports.flatMap((r) => r.completed);
  const pending = reports.flatMap((r) => r.pending);
  const cancelled = reports.flatMap((r) => r.cancelled);
  const missed = reports.flatMap((r) => r.missed);
  const delayed = reports.flatMap((r) => r.delayed);

  const completionRate = all.length ? clamp((completed.length / all.length) * 100) : 0;
  const delayRate = completed.length ? clamp((delayed.length / completed.length) * 100) : 0;
  const discipline = clamp(completionRate - missed.length * 4 - cancelled.length * 2);

  const focusStats = buildFocusStats(
    input.focusSessions.filter((s) => days.includes(s.date)),
  );
  const importantAll = all.filter((t) => t.important || t.priority === "high");
  const importantDone = importantAll.filter((t) => t.status === "completed");
  const focus = clamp(
    (importantAll.length ? (importantDone.length / importantAll.length) * 60 : 35) +
      Math.min(40, focusStats.totalMinutes / (dayCount * 1.5)),
  );

  const activeDays = days.filter((d) =>
    input.tasks.some((t) => t.date === d && t.status === "completed"),
  ).length;
  const consistency = clamp((activeDays / days.length) * 100);

  const waterDays = days.map((d) => input.water[d] ?? 0);
  const avgWater = waterDays.reduce((s, n) => s + n, 0) / days.length;
  const waterScore = clamp((avgWater / Math.max(1, input.waterGoal)) * 100);

  const habitScores = input.habits.map((h) => {
    const entries = input.habitLog[h.id] ?? {};
    const hit = days.filter((d) => (entries[d] ?? 0) >= h.dailyGoal).length;
    return (hit / days.length) * 100;
  });
  const habitScore = habitScores.length
    ? clamp(habitScores.reduce((s, n) => s + n, 0) / habitScores.length)
    : 0;

  const sleep = input.habits.find((h) => h.name.toLowerCase() === "sleep");
  const sleepEntries = sleep ? (input.habitLog[sleep.id] ?? {}) : {};
  const sleepScore = sleep
    ? clamp(
        (days.filter((d) => (sleepEntries[d] ?? 0) >= sleep.dailyGoal).length / days.length) * 100,
      )
    : 0;

  const productivity = clamp(
    discipline * 0.3 +
      focus * 0.2 +
      consistency * 0.2 +
      completionRate * 0.15 +
      habitScore * 0.1 +
      waterScore * 0.05 -
      delayRate * 0.1,
  );

  const workingMinutes = completed.reduce((s, t) => s + (t.duration || 0), 0);

  const suggestions: string[] = [];
  if (completionRate < 60)
    suggestions.push(
      "Your completion rate is under 60%. Plan fewer tasks per day and protect two deep-work blocks.",
    );
  if (delayRate > 30)
    suggestions.push(
      "Around a third of your finished tasks started late. Add a 10-minute buffer between tasks.",
    );
  if (missed.length > 2)
    suggestions.push(`${missed.length} tasks were missed. Turn reminders on for your key routines.`);
  if (consistency < 70)
    suggestions.push("Try to complete at least one task every day — consistency beats intensity.");
  if (waterScore < 70)
    suggestions.push(
      `You average ${avgWater.toFixed(1)} glasses a day against a goal of ${input.waterGoal}. Log water after every task.`,
    );
  if (habitScore < 60) suggestions.push("Pick just two habits to hit daily until the streak sticks.");
  if (sleep && sleepScore < 60)
    suggestions.push("Sleep is your weakest habit — set a fixed lights-out time tonight.");
  if (focusStats.totalMinutes < dayCount * 20)
    suggestions.push("Use Focus Mode on important tasks; deep work is what moves your focus score.");
  if (!suggestions.length)
    suggestions.push("Excellent balance — keep the current rhythm and raise one goal slightly.");

  return {
    days,
    productivity,
    discipline,
    focus,
    consistency,
    completionRate,
    delayRate,
    waterScore,
    habitScore,
    sleepScore,
    totals: {
      all: all.length,
      completed: completed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      missed: missed.length,
      workingMinutes,
      focusMinutes: focusStats.totalMinutes,
      avgWater: Math.round(avgWater * 10) / 10,
    },
    suggestions,
  };
}

export type DayScore = { key: string; label: string; completed: number; minutes: number; productivity: number };

export type PeriodReview = {
  label: string;
  days: string[];
  analysis: Analysis;
  perDay: DayScore[];
  completed: Task[];
  pending: Task[];
  cancelled: Task[];
  missed: Task[];
  longestDay?: DayScore;
  mostProductive?: DayScore;
  leastProductive?: DayScore;
  bestHabit?: { name: string; pct: number };
  worstHabit?: { name: string; pct: number };
  avgWater: number;
  avgWorkingHours: number;
  topPending: Task[];
  topRepeated: { title: string; count: number }[];
  biggestDelays: { task: Task; minutes: number }[];
  achievements: Task[];
};

function buildReview(input: AnalysisInput, dayCount: number, label: string): PeriodReview {
  const analysis = buildAnalysis(input, dayCount);
  const days = analysis.days;
  const reports = days.map((d) => buildDailyReport(input.tasks, input.water, input.washroom, d));

  const perDay: DayScore[] = reports.map((r) => ({
    key: r.date,
    label: new Date(r.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
    completed: r.completed.length,
    minutes: r.workingMinutes,
    productivity: r.productivity,
  }));

  const completed = reports.flatMap((r) => r.completed);
  const pending = reports.flatMap((r) => r.pending);
  const cancelled = reports.flatMap((r) => r.cancelled);
  const missed = reports.flatMap((r) => r.missed);

  const withData = perDay.filter((d) => d.completed > 0 || d.minutes > 0);
  const longestDay = [...perDay].sort((a, b) => b.minutes - a.minutes)[0];
  const mostProductive = [...perDay].sort((a, b) => b.productivity - a.productivity)[0];
  const leastProductive = [...withData].sort((a, b) => a.productivity - b.productivity)[0];

  const habitPcts = input.habits.map((h) => {
    const entries = input.habitLog[h.id] ?? {};
    const hit = days.filter((d) => (entries[d] ?? 0) >= h.dailyGoal).length;
    return { name: h.name, pct: Math.round((hit / days.length) * 100) };
  });
  const sortedHabits = [...habitPcts].sort((a, b) => b.pct - a.pct);

  const repeated = new Map<string, number>();
  for (const t of reports.flatMap((r) => r.all)) {
    const key = t.title.trim().toLowerCase();
    repeated.set(key, (repeated.get(key) ?? 0) + 1);
  }
  const topRepeated = [...repeated.entries()]
    .map(([k, count]) => ({
      title: k.charAt(0).toUpperCase() + k.slice(1),
      count,
    }))
    .filter((r) => r.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const biggestDelays = completed
    .map((task) => ({ task, minutes: delayMinutes(task) }))
    .filter((d) => d.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  const avgWater =
    Math.round((days.reduce((s, d) => s + (input.water[d] ?? 0), 0) / days.length) * 10) / 10;
  const avgWorkingHours =
    Math.round((perDay.reduce((s, d) => s + d.minutes, 0) / days.length / 60) * 10) / 10;

  const topPending = [...input.tasks]
    .filter((t) => t.status === "pending")
    .sort((a, b) => daysPending(b) - daysPending(a))
    .slice(0, 5);

  const achievements = [...completed]
    .sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return (b.duration || 0) - (a.duration || 0);
    })
    .slice(0, 5);

  return {
    label,
    days,
    analysis,
    perDay,
    completed,
    pending,
    cancelled,
    missed,
    longestDay,
    mostProductive,
    leastProductive,
    bestHabit: sortedHabits[0],
    worstHabit: sortedHabits[sortedHabits.length - 1],
    avgWater,
    avgWorkingHours,
    topPending,
    topRepeated,
    biggestDelays,
    achievements,
  };
}

/** Phase 29 */
export function buildWeeklyReview(input: AnalysisInput): PeriodReview {
  return buildReview(input, 7, "This week");
}

/** Phase 30 */
export function buildMonthlyReview(input: AnalysisInput): PeriodReview {
  return buildReview(input, 30, "This month");
}

/* ---------- Weekly Focus Mode dashboard ---------- */

export type WeeklyFocus = {
  days: { key: string; label: string; minutes: number; sessions: number }[];
  totalMinutes: number;
  bestDayMinutes: number;
  streak: number;
  bestStreak: number;
  topPerformers: { taskId: string; title: string; minutes: number; sessions: number }[];
};

export function buildWeeklyFocus(sessions: FocusSession[]): WeeklyFocus {
  const days = lastNDays(7);
  const all = buildFocusStats(sessions);
  const week = sessions.filter((s) => days.includes(s.date));
  const weekStats = buildFocusStats(week);

  return {
    days: days.map((key) => {
      const day = week.filter((s) => s.date === key);
      return {
        key,
        label: new Date(key).toLocaleDateString(undefined, { weekday: "short" }),
        minutes: day.reduce((s, x) => s + x.minutes, 0),
        sessions: day.length,
      };
    }),
    totalMinutes: weekStats.totalMinutes,
    bestDayMinutes: Math.max(
      0,
      ...days.map((key) =>
        week.filter((s) => s.date === key).reduce((s, x) => s + x.minutes, 0),
      ),
    ),
    streak: all.streak,
    bestStreak: all.bestStreak,
    topPerformers: weekStats.perTask.slice(0, 5),
  };
}

/* ---------- Phase 32: smart suggestions from behaviour ---------- */

export type SmartSuggestion = { id: string; title: string; detail: string; action?: string };

export function buildSmartSuggestions(input: AnalysisInput): SmartSuggestion[] {
  const out: SmartSuggestion[] = [];

  // Repeatedly postponed tasks → suggest a better slot.
  const postponed = [...input.tasks]
    .filter((t) => t.postponedCount >= 2)
    .sort((a, b) => b.postponedCount - a.postponedCount)
    .slice(0, 3);
  for (const t of postponed) {
    out.push({
      id: `postpone-${t.id}`,
      title: `You postpone "${t.title}" a lot`,
      detail: `Snoozed ${t.postponedCount} times. Your best completion window lately is ${bestHour(input.tasks)}. Try moving it there.`,
      action: `Reschedule to ${bestHour(input.tasks)}`,
    });
  }

  // Night owl / early bird pattern.
  const hourPattern = completionHours(input.tasks);
  if (hourPattern.night > hourPattern.morning && hourPattern.night >= 3) {
    out.push({
      id: "night-owl",
      title: "You finish most work at night",
      detail: "Most of your completed tasks land after 8 PM. Schedule deep work in the evening and keep mornings light.",
    });
  } else if (hourPattern.morning > hourPattern.night && hourPattern.morning >= 3) {
    out.push({
      id: "early-bird",
      title: "Mornings are your strongest hours",
      detail: "Put your most important task before noon — that's when you actually complete things.",
    });
  }

  // Water pattern.
  const week = lastNDays(7);
  const avgWater = week.reduce((s, d) => s + (input.water[d] ?? 0), 0) / 7;
  if (avgWater < input.waterGoal * 0.7) {
    out.push({
      id: "water",
      title: "Water reminders aren't landing",
      detail: `You average ${avgWater.toFixed(1)} of ${input.waterGoal} glasses. Try one glass after every completed task instead of fixed times.`,
    });
  }

  // Missed tasks pattern.
  const missed = input.tasks.filter((t) => t.status === "missed");
  if (missed.length >= 3) {
    out.push({
      id: "missed",
      title: "Some tasks keep getting missed",
      detail: `${missed.length} missed recently — mostly ${topCategory(missed)}. Shorten them to 20 minutes so they feel easy to start.`,
    });
  }

  // Habit nudge.
  const weakest = input.habits
    .map((h) => habitStats(h, input.habitLog, 7))
    .sort((a, b) => a.weeklyPct - b.weeklyPct)[0];
  if (weakest && weakest.weeklyPct < 50) {
    out.push({
      id: `habit-${weakest.habit.id}`,
      title: `${weakest.habit.name} is slipping`,
      detail: `Only ${weakest.weeklyPct}% of the weekly goal. Attach it to an existing routine so it happens automatically.`,
    });
  }

  if (!out.length)
    out.push({
      id: "all-good",
      title: "Nothing to fix right now",
      detail: "Your patterns look healthy. Keep logging and I'll flag anything that drifts.",
    });

  return out;
}

function completionHours(tasks: Task[]) {
  let morning = 0;
  let night = 0;
  for (const t of tasks) {
    if (t.status !== "completed" || !t.completedAt) continue;
    const h = new Date(t.completedAt).getHours();
    if (h < 12) morning += 1;
    if (h >= 20 || h < 3) night += 1;
  }
  return { morning, night };
}

function bestHour(tasks: Task[]) {
  const counts = new Map<number, number>();
  for (const t of tasks) {
    if (t.status !== "completed" || !t.completedAt) continue;
    const h = new Date(t.completedAt).getHours();
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const hour = best ? best[0] : 9;
  return `${String(hour).padStart(2, "0")}:00`;
}

function topCategory(tasks: Task[]) {
  const counts = new Map<string, number>();
  for (const t of tasks) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "routine tasks";
}

/* ---------- Phase 33: motivation engine ---------- */

const PRAISE = [
  "Excellent work, {you}.",
  "Well done, {you}. That one's behind you.",
  "Keep going, {you} — momentum looks good on you.",
  "Beautifully handled, {you}.",
  "That's discipline in action, {you}.",
  "Another one done, {you}. Steady progress.",
  "Sharp work, {you}. On to the next.",
];

const ENCOURAGE = [
  "No problem, {you} — let's pick it up again shortly.",
  "Delays happen, {you}. The plan still holds.",
  "One slip changes nothing, {you}. Next block is yours.",
  "Let's reset gently, {you}, and continue.",
  "It's still a good day, {you}. Small step now.",
];

function dailySeed() {
  const k = todayKey();
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return h;
}

function pick(list: string[], seed: string, you: string) {
  let h = dailySeed();
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  return (list[h % list.length] ?? list[0]!).replace("{you}", you);
}

/** A fresh congratulation line (rotates daily and per task). */
export function praiseFor(seed: string, you: string) {
  return pick(PRAISE, seed, you);
}

/** A positive line for delays — never discouraging. */
export function encourageFor(seed: string, you: string) {
  return pick(ENCOURAGE, seed, you);
}

/* ---------- Phase 31: conversational manager ---------- */

export function askManager(input: AnalysisInput, question: string, you: string): string {
  const q = question.toLowerCase().trim();
  const today = todayKey();
  const todays = input.tasks.filter((t) => t.date === today);
  const pending = input.tasks.filter((t) => t.status === "pending");
  const todayPending = todays.filter((t) => t.status === "pending");
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const analysis = buildAnalysis(input, 7);

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (!q) return `I'm listening, ${you}.`;

  if (has("hello", "hi ", "hey", "salam", "good morning", "good evening"))
    return `Hello ${you}. You have ${todayPending.length} task${todayPending.length === 1 ? "" : "s"} left today. Ask me anything about your schedule.`;

  if (has("how many tasks", "tasks left", "remaining", "left today"))
    return `${todayPending.length} of ${todays.length} tasks are still open today, ${you}. ${pending.length - todayPending.length} more are carried over from other days.`;

  if (has("what should i do now", "what now", "next task", "what next", "what should i do")) {
    const next = [...todayPending]
      .filter((t) => t.time)
      .sort((a, b) => timeNum(a.time) - timeNum(b.time))
      .find((t) => timeNum(t.time) >= nowMins - 15);
    const fallback = [...todayPending].sort((a, b) => Number(b.important) - Number(a.important))[0];
    const pickTask = next ?? fallback;
    return pickTask
      ? `Do "${pickTask.title}"${pickTask.time ? ` at ${pickTask.time}` : ""}, ${you}. It should take about ${prettyMinutes(pickTask.duration || 30)}.`
      : `Nothing scheduled right now, ${you}. A good moment to plan tomorrow or take a break.`;
  }

  if (has("most important", "important task")) {
    const imp = [...todays].filter((t) => t.important || t.priority === "high")[0];
    return imp
      ? `Your most important task today is "${imp.title}"${imp.time ? ` at ${imp.time}` : ""}, ${you}.`
      : `Nothing is flagged important today, ${you}.`;
  }

  if (has("postpone", "snooze", "delay")) {
    const named = input.tasks
      .filter((t) => q.includes(t.title.toLowerCase().split(" ")[0] ?? "\u0000"))
      .sort((a, b) => b.postponedCount - a.postponedCount)[0];
    if (named)
      return `"${named.title}" has been postponed ${named.postponedCount} time${named.postponedCount === 1 ? "" : "s"}, ${you}.`;
    const worst = [...input.tasks].sort((a, b) => b.postponedCount - a.postponedCount)[0];
    return worst && worst.postponedCount
      ? `Your most postponed task is "${worst.title}" — ${worst.postponedCount} times, ${you}.`
      : `You haven't postponed anything, ${you}. Impressive.`;
  }

  if (has("water", "drink")) {
    const count = input.water[today] ?? 0;
    return count >= input.waterGoal
      ? `Yes ${you} — ${count} of ${input.waterGoal} glasses. Goal reached.`
      : `Not yet, ${you}. ${count} of ${input.waterGoal} glasses so far. ${input.waterGoal - count} to go.`;
  }

  if (has("washroom", "bathroom"))
    return `${visitsOn(input.washroom, today).length} washroom visits logged today, ${you}.`;

  if (has("productivity", "score", "how am i doing", "performance"))
    return `Over the last 7 days: productivity ${analysis.productivity}%, discipline ${analysis.discipline}%, focus ${analysis.focus}%, consistency ${analysis.consistency}%. ${analysis.suggestions[0]}`;

  if (has("focus", "deep work")) {
    const wf = buildWeeklyFocus(input.focusSessions);
    return `You focused ${prettyMinutes(wf.totalMinutes)} this week across ${wf.topPerformers.reduce((s, t) => s + t.sessions, 0)} sessions, ${you}. Current streak: ${wf.streak} day${wf.streak === 1 ? "" : "s"}.`;
  }

  if (has("habit")) {
    const stats = input.habits.map((h) => habitStats(h, input.habitLog, 7));
    const best = [...stats].sort((a, b) => b.weeklyPct - a.weeklyPct)[0];
    const worst = [...stats].sort((a, b) => a.weeklyPct - b.weeklyPct)[0];
    return best && worst
      ? `Best habit this week is ${best.habit.name} (${best.weeklyPct}%), weakest is ${worst.habit.name} (${worst.weeklyPct}%), ${you}.`
      : `No habits tracked yet, ${you}.`;
  }

  if (has("completed", "finished", "done today")) {
    const done = todays.filter((t) => t.status === "completed");
    return `${done.length} completed today, ${you}${done.length ? `: ${done.slice(0, 4).map((t) => t.title).join(", ")}` : "."}`;
  }

  if (has("pending", "stuck", "overdue")) {
    const stuck = [...pending].sort((a, b) => daysPending(b) - daysPending(a)).slice(0, 3);
    return stuck.length
      ? `Top pending, ${you}: ${stuck.map((t) => `"${t.title}" (${daysPending(t)}d)`).join(", ")}.`
      : `Nothing pending, ${you}. Clean slate.`;
  }

  if (has("tomorrow")) {
    const tk = toKey(new Date(Date.now() + 86_400_000));
    const list = input.tasks.filter((t) => t.date === tk);
    return list.length
      ? `${list.length} tasks planned for tomorrow, ${you}: ${list.slice(0, 4).map((t) => t.title).join(", ")}.`
      : `Tomorrow is empty, ${you}. Shall we plan it tonight?`;
  }

  if (has("suggest", "advice", "improve", "better")) {
    const s = buildSmartSuggestions(input)[0]!;
    return `${s.title}. ${s.detail}`;
  }

  if (has("schedule", "today"))
    return todays.length
      ? `Today's schedule, ${you}: ${[...todays]
          .sort((a, b) => timeNum(a.time) - timeNum(b.time))
          .map((t) => `${t.time ?? "any time"} ${t.title}`)
          .join(" · ")}.`
      : `Nothing scheduled today, ${you}.`;

  return `I can answer things like "how many tasks are left", "what should I do now", "did I drink enough water", "how many times did I postpone gym", or "how am I doing this week", ${you}.`;
}

function timeNum(t?: string) {
  if (!t) return 24 * 60;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
