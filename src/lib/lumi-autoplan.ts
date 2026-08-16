/**
 * Phase 35 / 36 / 37 — AI Auto Planner.
 *
 * Builds three meaningfully different day plans (Highly Productive, Balanced,
 * Relaxed) from the user's own tasks, their fixed appointments, carried-over
 * pending work and everything Lumi has learned from past behaviour.
 */

import { minutesOf, timeOf, type Priority, type Task } from "@/lib/lumi-store";
import { parseTaskSpeech } from "@/lib/lumi-speech";

/* ---------- drafts (Phase 36 / 37) ---------- */

export type DraftTask = {
  id: string;
  title: string;
  /** minutes */
  duration: number;
  /** HH:mm — must be finished by */
  deadline?: string;
  importance: Priority;
  /** Phase 37 — a fixed task never moves */
  fixed: boolean;
  /** HH:mm — required for fixed tasks */
  time?: string;
  location: string;
  category: string;
};

const DURATION_HINTS: [RegExp, number][] = [
  [/\bclass|lecture|acca\b/, 90],
  [/\bstudy|revision|assignment\b/, 120],
  [/\bgym|workout|exercise\b/, 60],
  [/\bmeeting|call|interview\b/, 60],
  [/\bshopping|market|mandi|grocery\b/, 45],
  [/\bwalk|prayer|namaz\b/, 20],
  [/\bbreakfast|lunch|dinner|meal\b/, 30],
];

const LOCATION_HINTS: [RegExp, string][] = [
  [/\bgym|workout\b/, "Gym"],
  [/\bmarket|mandi|shopping|grocery\b/, "Market"],
  [/\bclass|lecture|college|acca|university\b/, "College"],
  [/\bmeeting|office|client\b/, "Office"],
  [/\bstudy|read|revision\b/, "Home"],
];

function guessDuration(title: string) {
  const t = title.toLowerCase();
  for (const [re, mins] of DURATION_HINTS) if (re.test(t)) return mins;
  return 45;
}

function guessLocation(title: string) {
  const t = title.toLowerCase();
  for (const [re, place] of LOCATION_HINTS) if (re.test(t)) return place;
  return "Anywhere";
}

/** Splits "Tomorrow I have ACCA class, gym and shopping" into individual drafts. */
export function parseTaskStatement(input: string): DraftTask[] {
  const cleaned = input
    .replace(/^\s*(tomorrow|today|tonight)?\s*(i\s+(have|need to|must|want to|got)|i've got)\s*/i, "")
    .trim();

  return cleaned
    .split(/,|;|\n|\band then\b|\bthen\b|\band also\b|\band\b|\bplus\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
    .map((part) => {
      const parsed = parseTaskSpeech(part);
      const title = parsed.title;
      return {
        id: crypto.randomUUID(),
        title,
        duration: guessDuration(title),
        deadline: undefined,
        importance: parsed.priority,
        fixed: Boolean(parsed.time),
        time: parsed.time,
        location: guessLocation(title),
        category: parsed.category,
      } satisfies DraftTask;
    });
}

export function emptyDraft(): DraftTask {
  return {
    id: crypto.randomUUID(),
    title: "",
    duration: 45,
    importance: "medium",
    fixed: false,
    location: "Anywhere",
    category: "Routine",
  };
}

/* ---------- behaviour learning ---------- */

export type Behaviour = {
  /** earliest minute-of-day the user actually completes things */
  earliestStart: number;
  /** typical productive hour */
  peakStart: number;
  /** average length of a completed task */
  avgSession: number;
  /** 0-100 */
  completionRate: number;
  /** how often tasks get postponed */
  postponeRate: number;
  /** Phase 41 — average minutes late finishing an AI-planned task */
  avgDrift: number;
  /** Phase 41 — % of AI-planned tasks finished on time */
  onTimeRate: number;
  /** Phase 41 — how many AI-planned tasks have been observed */
  observed: number;
  /** hour bucket (0-23) where the user completes most Study work */
  bestStudyHour?: number;
};

export function learnFromHistory(tasks: Task[]): Behaviour {
  const completed = tasks.filter((t) => t.status === "completed" && t.time);
  const starts = completed.map((t) => minutesOf(t.time!)).sort((a, b) => a - b);
  const all = tasks.filter((t) => t.status !== "pending");
  const postponed = tasks.filter((t) => (t.postponedCount ?? 0) > 0).length;

  const earliestStart = starts.length ? Math.max(5 * 60, starts[Math.floor(starts.length * 0.1)]!) : 7 * 60;
  const peakStart = starts.length ? starts[Math.floor(starts.length / 2)]! : 9 * 60;
  const avgSession = completed.length
    ? Math.round(completed.reduce((s, t) => s + (t.duration || 30), 0) / completed.length)
    : 45;

  // Phase 41 — learn from how the user actually followed previous AI plans.
  const planned = tasks.filter((t) => t.planId && t.plannedTime);
  const finished = planned.filter((t) => t.status === "completed" && t.completedAt);
  const drifts = finished.map((t) => {
    const d = new Date(t.completedAt!);
    const actual = d.getHours() * 60 + d.getMinutes();
    return actual - (minutesOf(t.plannedTime!) + (t.duration || 0));
  });
  const avgDrift = drifts.length
    ? Math.round(drifts.reduce((a, b) => a + b, 0) / drifts.length)
    : 0;
  const onTimeRate = planned.length
    ? Math.round((drifts.filter((d) => d <= 15).length / planned.length) * 100)
    : 0;

  const studyHours = completed
    .filter((t) => /study|read|revision|acca/i.test(`${t.category} ${t.title}`))
    .map((t) => Math.floor(minutesOf(t.time!) / 60));
  const counts = new Map<number, number>();
  studyHours.forEach((h) => counts.set(h, (counts.get(h) ?? 0) + 1));
  const bestStudyHour = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    earliestStart,
    peakStart,
    avgSession,
    completionRate: all.length
      ? Math.round((all.filter((t) => t.status === "completed").length / all.length) * 100)
      : 60,
    postponeRate: tasks.length ? Math.round((postponed / tasks.length) * 100) : 0,
    avgDrift,
    onTimeRate,
    observed: planned.length,
    bestStudyHour,
  };
}

/* ---------- plans ---------- */

export type PlanStyle = "productive" | "balanced" | "relaxed";

export type PlanBlock = {
  id: string;
  kind: "task" | "break" | "water";
  title: string;
  /** HH:mm */
  start: string;
  end: string;
  duration: number;
  fixed: boolean;
  important: boolean;
  category: string;
  location?: string;
  /** existing task this block reschedules */
  taskId?: string;
  note?: string;
  /** minutes before start that this item's reminder fires */
  reminderLead?: number;
};

export type Plan = {
  id: string;
  style: PlanStyle;
  name: string;
  tagline: string;
  date: string;
  blocks: PlanBlock[];
  unscheduled: string[];
  reason: string;
  /** Phase 39 — a short, human explanation */
  shortReason: string;
  dayStart: number;
  dayEnd: number;
  stats: { tasks: number; workMinutes: number; breakMinutes: number; fixed: number; waters: number };
};

export type PlanInput = {
  date: string;
  drafts: DraftTask[];
  appointments: Task[];
  pending: Task[];
  dislikes: string[];
  behaviour: Behaviour;
  /** increments every time all three plans are rejected */
  round: number;
};

type StyleConfig = {
  style: PlanStyle;
  name: string;
  tagline: string;
  dayStart: number;
  dayEnd: number;
  focusRun: number;
  breakLen: number;
  buffer: number;
  waterEvery: number;
  order: "heaviest" | "alternate" | "lightest";
};

const PLAN_NOTE: Record<PlanStyle, string> = {
  productive: "front-loads your hardest work while your focus is highest",
  balanced: "spreads effort evenly with steady recovery in between",
  relaxed: "keeps the day light with generous breathing room",
};

function baseConfigs(b: Behaviour, round: number): StyleConfig[] {
  const drift = (round % 3) * 20; // each fresh round shifts the day a little
  return [
    {
      style: "productive",
      name: "Plan 1 · Highly Productive",
      tagline: "Deep work first, minimal downtime",
      dayStart: Math.max(5 * 60 + 30, b.earliestStart - 30 + drift),
      dayEnd: 22 * 60,
      focusRun: 100,
      breakLen: 10,
      buffer: 0,
      waterEvery: 120,
      order: "heaviest",
    },
    {
      style: "balanced",
      name: "Plan 2 · Balanced",
      tagline: "Steady rhythm of work and rest",
      dayStart: Math.max(6 * 60 + 30, Math.round((b.earliestStart + b.peakStart) / 2) + drift),
      dayEnd: 21 * 60 + 30,
      focusRun: 60,
      breakLen: 15,
      buffer: 5,
      waterEvery: 150,
      order: "alternate",
    },
    {
      style: "relaxed",
      name: "Plan 3 · Relaxed / Flexible",
      tagline: "Gentle pace, lots of slack",
      dayStart: Math.max(8 * 60, b.peakStart + 30 + drift),
      dayEnd: 23 * 60,
      focusRun: 45,
      breakLen: 25,
      buffer: 15,
      waterEvery: 180,
      order: "lightest",
    },
  ];
}

export type DislikeEffect = {
  lateStart: boolean;
  moreBreaks: boolean;
  fewerBreaks: boolean;
  eveningCategories: string[];
  morningCategories: string[];
  earlyFinish: boolean;
  extraFixed: { title: string; time: string }[];
  shorterSessions: boolean;
};

const CATEGORY_WORDS: Record<string, RegExp> = {
  Study: /\bstudy|reading|revision|acca\b/i,
  Health: /\bgym|workout|exercise|walk\b/i,
  Work: /\bwork|office|meeting\b/i,
  Personal: /\bshopping|market|mandi|errand\b/i,
};

/** Turns free-text feedback ("I don't want to wake up early") into scheduling rules. */
export function readDislikes(lines: string[]): DislikeEffect {
  const text = lines.join(" . ").toLowerCase();
  const eveningCategories: string[] = [];
  const morningCategories: string[] = [];

  for (const [cat, re] of Object.entries(CATEGORY_WORDS)) {
    const m = text.match(new RegExp(`${re.source}[^.]*\\b(in the )?(evening|night|late)\\b`, "i"));
    if (m) eveningCategories.push(cat);
    const mm = text.match(new RegExp(`${re.source}[^.]*\\b(in the )?(morning|early)\\b`, "i"));
    if (mm) morningCategories.push(cat);
  }

  const extraFixed: { title: string; time: string }[] = [];
  const fixedRe = /\b(?:i (?:have to|need to|must) )?(go to |visit )?(the )?([a-z ]{3,20}?)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = fixedRe.exec(text)) !== null) {
    let h = Number(m[4]);
    const mins = Number(m[5] ?? 0);
    const suffix = (m[6] ?? "").toLowerCase();
    if (suffix.startsWith("p") && h < 12) h += 12;
    if (suffix.startsWith("a") && h === 12) h = 0;
    const title = (m[3] ?? "").trim();
    if (!title || h > 23) continue;
    extraFixed.push({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      time: timeOf(h * 60 + mins),
    });
  }

  return {
    lateStart: /(don'?t|do not|never).{0,20}(wake|get) up early|not? early|late(r)? start|hate mornings/.test(text),
    moreBreaks: /more breaks|need breaks|too tight|tired|rest more/.test(text),
    fewerBreaks: /fewer breaks|less breaks|too many breaks/.test(text),
    eveningCategories,
    morningCategories,
    earlyFinish: /finish early|not late night|sleep early|end early/.test(text),
    extraFixed,
    shorterSessions: /shorter|too long|smaller chunks/.test(text),
  };
}

function applyDislikes(cfg: StyleConfig, d: DislikeEffect): StyleConfig {
  const next = { ...cfg };
  if (d.lateStart) next.dayStart = Math.max(next.dayStart, 9 * 60 + 30);
  if (d.moreBreaks) {
    next.breakLen += 10;
    next.focusRun = Math.max(30, next.focusRun - 20);
  }
  if (d.fewerBreaks) {
    next.breakLen = Math.max(5, next.breakLen - 5);
    next.focusRun += 30;
  }
  if (d.shorterSessions) next.focusRun = Math.max(30, next.focusRun - 25);
  if (d.earlyFinish) next.dayEnd = Math.min(next.dayEnd, 20 * 60);
  return next;
}

type Item = {
  title: string;
  duration: number;
  important: boolean;
  priority: Priority;
  category: string;
  location?: string;
  taskId?: string;
  origin: "draft" | "pending" | "appointment";
  deadline?: number;
};

const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function orderItems(items: Item[], order: StyleConfig["order"], evening: string[]): Item[] {
  const rest = items.filter((i) => !evening.includes(i.category));
  const late = items.filter((i) => evening.includes(i.category));

  const heaviest = (list: Item[]) =>
    [...list].sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
      return b.duration - a.duration;
    });
  const lightest = (list: Item[]) =>
    [...list].sort((a, b) => {
      if (a.duration !== b.duration) return a.duration - b.duration;
      return rank[a.priority] - rank[b.priority];
    });

  let sorted: Item[];
  if (order === "heaviest") sorted = heaviest(rest);
  else if (order === "lightest") sorted = lightest(rest);
  else {
    const heavy = heaviest(rest);
    const light = lightest(rest);
    const out: Item[] = [];
    const used = new Set<Item>();
    while (out.length < rest.length) {
      const h = heavy.find((i) => !used.has(i));
      if (h) {
        used.add(h);
        out.push(h);
      }
      const l = light.find((i) => !used.has(i));
      if (l) {
        used.add(l);
        out.push(l);
      }
      if (!h && !l) break;
    }
    sorted = out;
  }
  return [...sorted, ...heaviest(late)];
}

function block(b: Omit<PlanBlock, "id" | "end"> & { end?: string }): PlanBlock {
  return {
    id: crypto.randomUUID(),
    end: b.end ?? timeOf(minutesOf(b.start) + b.duration),
    ...b,
  } as PlanBlock;
}

function buildOnePlan(cfg: StyleConfig, input: PlanInput, effects: DislikeEffect): Plan {
  const fixedBlocks: PlanBlock[] = [];

  for (const t of input.appointments) {
    if (!t.time) continue;
    fixedBlocks.push(
      block({
        kind: "task",
        title: t.title,
        start: t.time,
        duration: t.duration || 30,
        fixed: true,
        important: t.important,
        category: t.category,
        taskId: t.id,
        note: "Existing appointment — never moved",
      }),
    );
  }
  for (const d of input.drafts) {
    if (!d.fixed || !d.time) continue;
    fixedBlocks.push(
      block({
        kind: "task",
        title: d.title,
        start: d.time,
        duration: d.duration,
        fixed: true,
        important: d.importance === "high",
        category: d.category,
        location: d.location,
        note: "Fixed time — locked",
      }),
    );
  }
  for (const f of effects.extraFixed) {
    if (fixedBlocks.some((b) => b.title.toLowerCase() === f.title.toLowerCase())) continue;
    fixedBlocks.push(
      block({
        kind: "task",
        title: f.title,
        start: f.time,
        duration: 45,
        fixed: true,
        important: false,
        category: "Personal",
        note: "You told Lumi this is fixed",
      }),
    );
  }
  fixedBlocks.sort((a, b) => minutesOf(a.start) - minutesOf(b.start));

  const flexible: Item[] = [
    ...input.drafts
      .filter((d) => !d.fixed)
      .map<Item>((d) => ({
        title: d.title,
        duration: d.duration,
        important: d.importance === "high",
        priority: d.importance,
        category: d.category,
        location: d.location,
        origin: "draft",
        deadline: d.deadline ? minutesOf(d.deadline) : undefined,
      })),
    ...input.pending.map<Item>((t) => ({
      title: t.title,
      duration: t.duration || 30,
      important: t.important,
      priority: t.priority,
      category: t.category,
      taskId: t.id,
      origin: "pending",
    })),
  ];

  const ordered = orderItems(flexible, cfg.order, effects.eveningCategories);
  const eveningFloor = 17 * 60;
  const morningCeil = 12 * 60;

  const out: PlanBlock[] = [];
  const unscheduled: string[] = [];
  const queue = [...fixedBlocks];
  let cursor = cfg.dayStart;
  let sinceBreak = 0;
  let nextWater = cfg.dayStart + 30;
  let waters = 0;
  let breakMinutes = 0;

  const flushWater = (upto: number) => {
    while (nextWater <= upto && nextWater < cfg.dayEnd) {
      out.push(
        block({
          kind: "water",
          title: "Drink a glass of water",
          start: timeOf(nextWater),
          duration: 5,
          fixed: false,
          important: false,
          category: "Health",
        }),
      );
      waters += 1;
      nextWater += cfg.waterEvery;
    }
  };

  const placeFixed = (f: PlanBlock) => {
    out.push(f);
    cursor = Math.max(cursor, minutesOf(f.end)) + cfg.buffer;
    sinceBreak += f.duration;
    flushWater(cursor);
  };

  for (const item of ordered) {
    // never push a fixed task — work around it
    while (queue[0] && cursor + item.duration > minutesOf(queue[0].start)) {
      placeFixed(queue.shift()!);
    }

    if (effects.eveningCategories.includes(item.category)) cursor = Math.max(cursor, eveningFloor);
    if (effects.morningCategories.includes(item.category) && cursor > morningCeil) {
      // keep it in the morning next round rather than forcing it late
      unscheduled.push(item.title);
      continue;
    }

    if (sinceBreak >= cfg.focusRun) {
      out.push(
        block({
          kind: "break",
          title: cfg.style === "relaxed" ? "Relax & recharge" : "Short break",
          start: timeOf(cursor),
          duration: cfg.breakLen,
          fixed: false,
          important: false,
          category: "Routine",
        }),
      );
      breakMinutes += cfg.breakLen;
      cursor += cfg.breakLen;
      sinceBreak = 0;
    }

    if (cursor + item.duration > cfg.dayEnd) {
      unscheduled.push(item.title);
      continue;
    }

    out.push(
      block({
        kind: "task",
        title: item.title,
        start: timeOf(cursor),
        duration: item.duration,
        fixed: false,
        important: item.important,
        category: item.category,
        location: item.location,
        taskId: item.taskId,
        note: item.origin === "pending" ? "Carried over — pending task" : undefined,
      }),
    );
    cursor += item.duration + cfg.buffer;
    sinceBreak += item.duration;
    flushWater(cursor);
  }

  while (queue.length) placeFixed(queue.shift()!);
  flushWater(Math.min(cfg.dayEnd, cursor + cfg.waterEvery));

  out.sort((a, b) => minutesOf(a.start) - minutesOf(b.start));

  const taskBlocks = out.filter((b) => b.kind === "task");
  const workMinutes = taskBlocks.reduce((s, b) => s + b.duration, 0);

  const reason = buildReason(cfg, input, effects, {
    tasks: taskBlocks.length,
    fixed: fixedBlocks.length,
    workMinutes,
    breakMinutes,
    unscheduled,
  });

  return {
    id: crypto.randomUUID(),
    style: cfg.style,
    name: cfg.name,
    tagline: cfg.tagline,
    date: input.date,
    blocks: out,
    unscheduled,
    reason,
    shortReason: buildShortReason(cfg, input, effects, breakMinutes),
    dayStart: cfg.dayStart,
    dayEnd: cfg.dayEnd,
    stats: {
      tasks: taskBlocks.length,
      workMinutes,
      breakMinutes,
      fixed: fixedBlocks.length,
      waters,
    },
  };
}

function buildReason(
  cfg: StyleConfig,
  input: PlanInput,
  effects: DislikeEffect,
  s: { tasks: number; fixed: number; workMinutes: number; breakMinutes: number; unscheduled: string[] },
) {
  const parts: string[] = [];
  parts.push(
    `This plan ${PLAN_NOTE[cfg.style]}. It starts at ${timeOf(cfg.dayStart)} because your history shows you rarely get moving before ${timeOf(input.behaviour.earliestStart)}, and your most productive hour is around ${timeOf(input.behaviour.peakStart)}.`,
  );
  if (s.fixed)
    parts.push(
      `${s.fixed} fixed commitment${s.fixed === 1 ? "" : "s"} stayed exactly where ${s.fixed === 1 ? "it is" : "they are"} — everything flexible was arranged around ${s.fixed === 1 ? "it" : "them"}.`,
    );
  parts.push(
    `${s.tasks} task${s.tasks === 1 ? "" : "s"} · ${Math.round(s.workMinutes / 6) / 10}h of work with ${s.breakMinutes} minutes of breaks, sessions capped near ${cfg.focusRun} minutes (your average completed task runs ${input.behaviour.avgSession} minutes).`,
  );
  if (input.pending.length)
    parts.push(`${input.pending.length} pending item${input.pending.length === 1 ? "" : "s"} from earlier days were folded back in.`);
  if (input.behaviour.postponeRate > 25 && cfg.style !== "productive")
    parts.push(`You postpone about ${input.behaviour.postponeRate}% of tasks, so this version keeps the load light enough to actually finish.`);
  if (input.behaviour.completionRate > 70 && cfg.style === "productive")
    parts.push(`You complete around ${input.behaviour.completionRate}% of what you plan, so Lumi trusts you with a dense schedule.`);
  if (effects.lateStart) parts.push("You said you don't want early mornings — the day begins later.");
  if (effects.moreBreaks) parts.push("You asked for more breaks — recovery time is longer here.");
  if (effects.eveningCategories.length)
    parts.push(`${effects.eveningCategories.join(", ")} was pushed to the evening as you requested.`);
  if (effects.extraFixed.length)
    parts.push(`${effects.extraFixed.map((f) => `${f.title} at ${f.time}`).join(", ")} was locked in from your note.`);
  if (input.round > 0)
    parts.push(`Round ${input.round + 1}: Lumi rebuilt this from scratch after your rejections instead of nudging the old times.`);
  if (s.unscheduled.length)
    parts.push(`Didn't fit today: ${s.unscheduled.join(", ")}.`);
  return parts.join(" ");
}

export function buildPlans(input: PlanInput): Plan[] {
  const effects = readDislikes(input.dislikes);
  return baseConfigs(input.behaviour, input.round)
    .map((cfg) => applyDislikes(cfg, effects))
    .map((cfg) => buildOnePlan(cfg, input, effects));
}

export function prettyStyle(style: PlanStyle) {
  return style === "productive" ? "Highly Productive" : style === "balanced" ? "Balanced" : "Relaxed";
}

/* ---------- Phase 39: short explanations ---------- */

function buildShortReason(
  cfg: StyleConfig,
  input: PlanInput,
  effects: DislikeEffect,
  breakMinutes: number,
): string {
  const b = input.behaviour;
  if (cfg.style === "productive") {
    if (b.bestStudyHour !== undefined && b.bestStudyHour >= 16)
      return `You finish focus work best around ${timeOf(b.bestStudyHour * 60)}, so I put your heaviest session in that window and cleared the rest of the day for it.`;
    return `You complete about ${b.completionRate}% of what you plan, so I front-loaded your hardest work from ${timeOf(cfg.dayStart)} while your focus is highest.`;
  }
  if (cfg.style === "balanced") {
    if (b.postponeRate > 20)
      return `I added ${breakMinutes} minutes of breaks because your history shows you delay tasks when several are scheduled back to back.`;
    return `I kept an even rhythm of ${cfg.focusRun}-minute sessions with ${cfg.breakLen}-minute breaks, close to your usual ${b.avgSession}-minute working stretch.`;
  }
  if (effects.lateStart)
    return `You told me you don't like early mornings, so the day opens at ${timeOf(cfg.dayStart)} and I left big free blocks for anything unexpected.`;
  return `I left larger free-time blocks so unexpected work can be added, and kept sessions short at ${cfg.focusRun} minutes.`;
}

/* ---------- Phase 38: conflict & capacity check ---------- */

export type Bucket = { title: string; duration: number; why: string };

export type Feasibility = {
  overloaded: boolean;
  headline: string;
  /** minutes */
  needed: number;
  available: number;
  conflicts: string[];
  mustDo: Bucket[];
  shouldDo: Bucket[];
  canPostpone: Bucket[];
};

export function analyzeFeasibility(input: PlanInput): Feasibility {
  const effects = readDislikes(input.dislikes);
  const cfg = applyDislikes(baseConfigs(input.behaviour, input.round)[1]!, effects);
  const conflicts: string[] = [];

  type Candidate = {
    title: string;
    duration: number;
    fixed: boolean;
    time?: string;
    important: boolean;
    priority: Priority;
    origin: "draft" | "pending" | "appointment";
    location?: string;
  };

  const candidates: Candidate[] = [
    ...input.appointments.map<Candidate>((t) => ({
      title: t.title,
      duration: t.duration || 30,
      fixed: true,
      time: t.time,
      important: t.important,
      priority: t.priority,
      origin: "appointment",
    })),
    ...input.drafts.map<Candidate>((d) => ({
      title: d.title,
      duration: d.duration,
      fixed: d.fixed,
      time: d.time,
      important: d.importance === "high",
      priority: d.importance,
      origin: "draft",
      location: d.location,
    })),
    ...input.pending.map<Candidate>((t) => ({
      title: t.title,
      duration: t.duration || 30,
      fixed: false,
      important: t.important,
      priority: t.priority,
      origin: "pending",
    })),
  ];

  // time collisions between fixed items
  const timed = candidates.filter((c) => c.fixed && c.time).sort((a, b) => minutesOf(a.time!) - minutesOf(b.time!));
  for (let i = 0; i < timed.length - 1; i++) {
    const a = timed[i]!;
    const b = timed[i + 1]!;
    const aEnd = minutesOf(a.time!) + a.duration;
    const gap = minutesOf(b.time!) - aEnd;
    if (gap < 0) conflicts.push(`${a.title} and ${b.title} overlap at ${b.time}.`);
    else if (gap < 15 && (a.location ?? "") !== (b.location ?? ""))
      conflicts.push(`Only ${gap} minutes between ${a.title} and ${b.title} — that's not enough travel time.`);
  }

  for (const c of candidates) {
    if (c.duration < 10) conflicts.push(`${c.title} has only ${c.duration} minutes — likely too short to finish.`);
    if (c.fixed && c.time && minutesOf(c.time) + c.duration > 24 * 60)
      conflicts.push(`${c.title} would run past midnight.`);
  }

  const needed = candidates.reduce((s, c) => s + c.duration, 0);
  const breaksNeeded = Math.max(0, Math.floor(needed / cfg.focusRun)) * cfg.breakLen;
  const available = cfg.dayEnd - cfg.dayStart;

  if (candidates.length > 12) conflicts.push(`${candidates.length} items in one day is more than you usually finish.`);
  if (breaksNeeded === 0 && needed > 240) conflicts.push("No breaks fit in this load — that's not sustainable.");

  const overloaded = needed + breaksNeeded > available;

  const sorted = [...candidates].sort(
    (a, b) => Number(b.fixed) - Number(a.fixed) || Number(b.important) - Number(a.important) || rank[a.priority] - rank[b.priority],
  );

  const mustDo: Bucket[] = [];
  const shouldDo: Bucket[] = [];
  const canPostpone: Bucket[] = [];
  let used = 0;
  for (const c of sorted) {
    const why = c.fixed
      ? "Fixed appointment — cannot move"
      : c.important
        ? "You marked this important"
        : c.origin === "pending"
          ? "Carried over from an earlier day"
          : c.priority === "high"
            ? "High priority"
            : c.priority === "low"
              ? "Low priority"
              : "Normal priority";
    const bucket = { title: c.title, duration: c.duration, why };
    if (c.fixed || c.important || c.priority === "high") {
      mustDo.push(bucket);
      used += c.duration;
    } else if (used + c.duration + breaksNeeded <= available && c.priority !== "low") {
      shouldDo.push(bucket);
      used += c.duration;
    } else {
      canPostpone.push(bucket);
    }
  }

  return {
    overloaded,
    headline: overloaded
      ? "Sir, you have more work than available time."
      : conflicts.length
        ? "Sir, this day fits — but a few things clash."
        : "Sir, everything fits comfortably.",
    needed: needed + breaksNeeded,
    available,
    conflicts,
    mustDo,
    shouldDo,
    canPostpone,
  };
}

/* ---------- drag-and-drop fine tuning ---------- */

/**
 * Re-lays a plan after the user drags flexible blocks into a new order.
 * Fixed blocks keep their exact times; everything else flows around them.
 */
export function resequencePlan(plan: Plan, orderedFlexibleIds: string[]): Plan {
  const byId = new Map(plan.blocks.map((b) => [b.id, b]));
  const fixed = plan.blocks.filter((b) => b.fixed).sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
  const flexible = orderedFlexibleIds.map((id) => byId.get(id)).filter((b): b is PlanBlock => Boolean(b) && !b!.fixed);

  const out: PlanBlock[] = [...fixed];
  let cursor = plan.dayStart;
  const queue = [...fixed];

  for (const b of flexible) {
    while (queue[0] && cursor + b.duration > minutesOf(queue[0].start)) {
      const f = queue.shift()!;
      cursor = Math.max(cursor, minutesOf(f.end));
    }
    out.push({ ...b, start: timeOf(cursor), end: timeOf(cursor + b.duration) });
    cursor += b.duration;
  }

  out.sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
  return { ...plan, blocks: out };
}

/** Changes one block's duration and re-lays the day. */
export function setBlockDuration(plan: Plan, blockId: string, duration: number): Plan {
  const next = {
    ...plan,
    blocks: plan.blocks.map((b) => (b.id === blockId ? { ...b, duration: Math.max(5, duration) } : b)),
  };
  return resequencePlan(
    next,
    next.blocks.filter((b) => !b.fixed).map((b) => b.id),
  );
}

/** Sets the per-item reminder lead (minutes before start). */
export function setBlockLead(plan: Plan, blockId: string, lead: number): Plan {
  return {
    ...plan,
    blocks: plan.blocks.map((b) => (b.id === blockId ? { ...b, reminderLead: Math.max(0, lead) } : b)),
  };
}
