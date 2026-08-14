import { useCallback, useSyncExternalStore } from "react";

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "completed" | "cancelled" | "missed";
export type Repeat = "none" | "daily" | "weekly" | "monthly";

export type Task = {
  id: string;
  title: string;
  note?: string;
  /** yyyy-mm-dd */
  date: string;
  /** HH:mm, optional */
  time?: string;
  /** minutes */
  duration: number;
  priority: Priority;
  category: string;
  important: boolean;
  reminder: boolean;
  repeatDaily: boolean;
  /** Phase: recurring tasks */
  repeat: Repeat;
  /** id of the master task this instance was generated from */
  seriesId?: string;
  status: TaskStatus;
  /** kept in sync with status === "completed" */
  completed: boolean;
  completedAt?: string;
  /** ISO of the moment the reminder was acknowledged */
  remindedAt?: string;
  /** ISO — reminder suppressed until this moment */
  snoozedUntil?: string;
  /** how many times the reminder was snoozed / the task postponed */
  postponedCount: number;
  /** ISO — the 10-minute warning was shown */
  warnedAt?: string;
  /** Phase 11 — why the task was cancelled */
  cancelReason?: string;
  /** Phase 14 — fixed completion date the user committed to */
  dueBy?: string;
  /** Phase 14 — pending-analysis notice acknowledged */
  pendingAckAt?: string;
  /** Phase 23 — saved place this task is tied to */
  locationId?: string;
  /** Phase 23 — also remind about it when leaving the place */
  remindOnLeave?: boolean;
  createdAt: string;
};

export type WashroomVisit = {
  id: string;
  /** ISO */
  start: string;
  /** ISO */
  end?: string;
};

/** Phase 23 — a saved place (Home, Office, Gym…) */
export type Place = {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  /** metres */
  radius: number;
};

/** Focus Mode session history */
export type FocusSession = {
  id: string;
  taskId: string;
  taskTitle: string;
  /** yyyy-mm-dd */
  date: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  outcome: "completed" | "cancelled" | "exited";
};

export type Habit = {
  id: string;
  name: string;
  icon: string;
  /** times per day */
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
  createdAt: string;
};

export type LumiSettings = {
  name: string;
  theme: "dark" | "light";
  dailyGoal: number;
  reminders: boolean;
  categories: string[];
  /** user-picked ringtone (data URL) + display name */
  ringtoneName?: string;
  ringtoneData?: string;
  autoSchedule: boolean;
  /** minutes added by the Snooze button */
  snoozeMinutes: number;
  /** glasses per day */
  waterGoal: number;
  /* Phase 18 — voice assistant */
  voiceEnabled: boolean;
  voiceURI?: string;
  voiceGender: "female" | "male";
  voiceRate: number;
  voicePitch: number;
  voiceVolume: number;
  /* Phase 19 / 20 */
  briefingEnabled: boolean;
  briefingTime: string;
  nightEnabled: boolean;
  nightTime: string;
  /* push / system notifications */
  notifications: boolean;
  /* Phase 22 */
  focusMode: boolean;
  focusDim: boolean;
  /* Phase 23 */
  locationReminders: boolean;
  /* voice commands during reminders / focus */
  voiceCommands: boolean;
  /* Phase 25 */
  calendarSync: boolean;
  calendarFrequency: "manual" | "hourly" | "daily";
  lastCalendarSync?: string;
  /* Phase 26 */
  autoBackup: boolean;
  lastBackupAt?: string;
};

type LumiState = {
  tasks: Task[];
  settings: LumiSettings;
  /** yyyy-mm-dd -> glasses drunk */
  water: Record<string, number>;
  washroom: WashroomVisit[];
  /** collision pair keys the user chose to keep */
  keptCollisions: string[];
  /** Phase 21 */
  habits: Habit[];
  /** habitId -> yyyy-mm-dd -> count */
  habitLog: Record<string, Record<string, number>>;
  /** Phase 23 */
  places: Place[];
  /** Focus Mode history */
  focusSessions: FocusSession[];
  /** Phase 27 */
  recentSearches: string[];
  /** yyyy-mm-dd of the last spoken morning briefing / night summary */
  lastBriefing?: string;
  lastNight?: string;
};

const STORAGE_KEY = "lumi.state.v1";

export const DEFAULT_SETTINGS: LumiSettings = {
  name: "",
  theme: "dark",
  dailyGoal: 5,
  reminders: true,
  categories: ["Routine", "Work", "Health", "Study", "Personal"],
  autoSchedule: true,
  snoozeMinutes: 10,
  waterGoal: 8,
  voiceEnabled: true,
  voiceGender: "female",
  voiceRate: 1,
  voicePitch: 1,
  voiceVolume: 1,
  briefingEnabled: true,
  briefingTime: "07:00",
  nightEnabled: true,
  nightTime: "22:00",
  notifications: false,
  focusMode: true,
  focusDim: true,
  locationReminders: false,
  voiceCommands: true,
  calendarSync: false,
  calendarFrequency: "manual",
  autoBackup: false,
};

export const DEFAULT_HABITS: Habit[] = [
  "Study",
  "Gym",
  "Exercise",
  "Prayer",
  "Reading",
  "Meditation",
  "Walking",
  "Sleep",
].map((name, i) => ({
  id: `habit-${name.toLowerCase()}`,
  name,
  icon: ["📚", "🏋️", "🤸", "🕌", "📖", "🧘", "🚶", "😴"][i]!,
  dailyGoal: 1,
  weeklyGoal: 5,
  monthlyGoal: 20,
  createdAt: new Date(0).toISOString(),
}));

export const DEFAULT_PLACES: Place[] = [];

const EMPTY: LumiState = {
  tasks: [],
  settings: DEFAULT_SETTINGS,
  water: {},
  washroom: [],
  keptCollisions: [],
  habits: DEFAULT_HABITS,
  habitLog: {},
  places: DEFAULT_PLACES,
  focusSessions: [],
  recentSearches: [],
};


let state: LumiState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — ignore */
  }
}

function migrateTask(raw: Partial<Task>): Task {
  const status: TaskStatus = raw.status ?? (raw.completed ? "completed" : "pending");
  return {
    id: raw.id ?? crypto.randomUUID(),
    title: raw.title ?? "Untitled",
    note: raw.note,
    date: raw.date ?? todayKey(),
    time: raw.time,
    duration: raw.duration ?? 30,
    priority: raw.priority ?? "medium",
    category: raw.category ?? "Routine",
    important: raw.important ?? false,
    reminder: raw.reminder ?? true,
    repeatDaily: raw.repeatDaily ?? false,
    repeat: raw.repeat ?? (raw.repeatDaily ? "daily" : "none"),
    seriesId: raw.seriesId,
    status,
    completed: status === "completed",
    completedAt: raw.completedAt,
    remindedAt: raw.remindedAt,
    snoozedUntil: raw.snoozedUntil,
    postponedCount: raw.postponedCount ?? 0,
    warnedAt: raw.warnedAt,
    cancelReason: raw.cancelReason,
    dueBy: raw.dueBy,
    pendingAckAt: raw.pendingAckAt,
    locationId: raw.locationId,
    remindOnLeave: raw.remindOnLeave,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LumiState>;
      state = {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(migrateTask) : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        water: parsed.water ?? {},
        washroom: Array.isArray(parsed.washroom) ? parsed.washroom : [],
        keptCollisions: Array.isArray(parsed.keptCollisions) ? parsed.keptCollisions : [],
        habits:
          Array.isArray(parsed.habits) && parsed.habits.length ? parsed.habits : DEFAULT_HABITS,
        habitLog: parsed.habitLog ?? {},
        places: Array.isArray(parsed.places) ? parsed.places : DEFAULT_PLACES,
        focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions : [],
        recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
        lastBriefing: parsed.lastBriefing,
        lastNight: parsed.lastNight,
      };
    }
  } catch {
    state = EMPTY;
  }
  const grown = expandRecurring(state.tasks);
  if (grown !== state.tasks) {
    state = { ...state, tasks: grown };
    persist();
  }
  applyTheme(state.settings.theme);
  emit();
}

export function applyTheme(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(next: LumiState) {
  state = next;
  persist();
  emit();
}

/* ---------- time helpers ---------- */

export function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function timeOf(minutes: number) {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Auto-arranges timed tasks per day: sorts by start time and pushes any
 * overlapping task to start when the previous one ends. Tasks that share the
 * exact same start time are left alone — those are surfaced as collisions.
 */
export function autoSchedule(tasks: Task[], pinnedId?: string): Task[] {
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const byDate = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.time || t.status === "cancelled") continue;
    const list = byDate.get(t.date) ?? [];
    list.push(t);
    byDate.set(t.date, list);
  }

  const moved = new Map<string, string>();
  for (const list of byDate.values()) {
    const sorted = [...list].sort((a, b) => {
      const d = minutesOf(a.time!) - minutesOf(b.time!);
      if (d !== 0) return d;
      if (a.id === pinnedId) return -1;
      if (b.id === pinnedId) return 1;
      return rank[a.priority] - rank[b.priority];
    });
    let cursor = -1;
    let previousStart = -1;
    for (const t of sorted) {
      const original = minutesOf(t.time!);
      let start = original;
      // identical start times stay put → reported as a collision instead
      if (original !== previousStart && start < cursor) start = cursor;
      if (start !== original) moved.set(t.id, timeOf(start));
      previousStart = original;
      cursor = Math.max(cursor, start + (t.duration || 0));
    }
  }

  if (moved.size === 0) return tasks;
  return tasks.map((t) => (moved.has(t.id) ? { ...t, time: moved.get(t.id)! } : t));
}

/* ---------- recurring tasks ---------- */

const HORIZON_DAYS = 45;

function addRepeat(d: Date, repeat: Repeat) {
  const next = new Date(d);
  if (repeat === "daily") next.setDate(next.getDate() + 1);
  else if (repeat === "weekly") next.setDate(next.getDate() + 7);
  else if (repeat === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

/** Generates future instances of recurring tasks up to the horizon. */
export function expandRecurring(tasks: Task[]): Task[] {
  const masters = tasks.filter((t) => t.repeat && t.repeat !== "none" && !t.seriesId);
  if (masters.length === 0) return tasks;

  const horizon = new Date();
  horizon.setDate(horizon.getDate() + HORIZON_DAYS);
  const today = todayKey();
  const created: Task[] = [];

  for (const master of masters) {
    const existing = new Set(
      tasks.filter((t) => t.seriesId === master.id || t.id === master.id).map((t) => t.date),
    );
    const [y, m, d] = master.date.split("-").map(Number);
    let cursor = new Date(y!, (m ?? 1) - 1, d ?? 1);
    let guard = 0;
    while (cursor <= horizon && guard < 400) {
      guard += 1;
      const key = toKey(cursor);
      if (key >= today && !existing.has(key)) {
        existing.add(key);
        created.push({
          ...master,
          id: crypto.randomUUID(),
          seriesId: master.id,
          date: key,
          status: "pending",
          completed: false,
          completedAt: undefined,
          remindedAt: undefined,
          snoozedUntil: undefined,
          warnedAt: undefined,
          postponedCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
      cursor = addRepeat(cursor, master.repeat);
    }
  }

  return created.length ? [...tasks, ...created] : tasks;
}

function commit(tasks: Task[], pinnedId?: string) {
  const grown = expandRecurring(tasks);
  const next = state.settings.autoSchedule ? autoSchedule(grown, pinnedId) : grown;
  setState({ ...state, tasks: next });
}

/* ---------- collisions ---------- */

export type Collision = { key: string; a: Task; b: Task };

export function collisionKey(a: Task, b: Task) {
  return [a.id, b.id].sort().join("::");
}

/** Pairs of pending tasks that start at exactly the same time on the same day. */
export function findCollisions(tasks: Task[], kept: string[] = []): Collision[] {
  const out: Collision[] = [];
  const timed = tasks.filter((t) => t.time && t.status === "pending");
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i]!;
      const b = timed[j]!;
      if (a.date !== b.date || a.time !== b.time) continue;
      const key = collisionKey(a, b);
      if (kept.includes(key)) continue;
      out.push({ key, a, b });
    }
  }
  return out;
}

export type TaskInput = Omit<
  Task,
  | "id"
  | "createdAt"
  | "completed"
  | "status"
  | "completedAt"
  | "remindedAt"
  | "snoozedUntil"
  | "postponedCount"
  | "warnedAt"
  | "cancelReason"
  | "dueBy"
  | "pendingAckAt"
  | "seriesId"
>;

export function useLumi() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );

  const addTask = useCallback((input: TaskInput) => {
    const task: Task = {
      ...input,
      id: crypto.randomUUID(),
      status: "pending",
      completed: false,
      postponedCount: 0,
      createdAt: new Date().toISOString(),
    };
    commit([...state.tasks, task], task.id);
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    commit(
      state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      id,
    );
  }, []);

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    commit(
      state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              completed: status === "completed",
              completedAt: status === "completed" ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
  }, []);

  const toggleTask = useCallback((id: string) => {
    const task = state.tasks.find((t) => t.id === id);
    const next: TaskStatus = task?.status === "completed" ? "pending" : "completed";
    commit(
      state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: next,
              completed: next === "completed",
              completedAt: next === "completed" ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
  }, []);

  const removeTask = useCallback((id: string) => {
    setState({
      ...state,
      tasks: state.tasks.filter((t) => t.id !== id && t.seriesId !== id),
    });
  }, []);

  const snoozeTask = useCallback((id: string, minutes?: number) => {
    snoozeTaskById(id, minutes);
  }, []);

  const moveTask = useCallback((id: string, minutes: number) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task?.time) return;
    commit(
      state.tasks.map((t) =>
        t.id === id ? { ...t, time: timeOf(minutesOf(task.time!) + minutes) } : t,
      ),
      id,
    );
  }, []);

  const keepCollision = useCallback((key: string) => {
    setState({ ...state, keptCollisions: [...new Set([...state.keptCollisions, key])] });
  }, []);

  const updateSettings = useCallback((patch: Partial<LumiSettings>) => {
    const settings = { ...state.settings, ...patch };
    if (patch.theme) applyTheme(patch.theme);
    setState({ ...state, settings });
  }, []);

  const clearAll = useCallback(() => {
    setState({ ...state, tasks: [] });
  }, []);

  /* Phase 11 — cancel with a reason */
  const cancelTask = useCallback((id: string, reason: string) => {
    cancelTaskById(id, reason);
  }, []);

  /* Phase 14 — commit to a fixed completion date */
  const setDueDate = useCallback((id: string, date: string) => {
    commit(
      state.tasks.map((t) =>
        t.id === id ? { ...t, dueBy: date, date, pendingAckAt: new Date().toISOString() } : t,
      ),
      id,
    );
  }, []);

  const ackPending = useCallback((id: string) => {
    setState({
      ...state,
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, pendingAckAt: new Date().toISOString() } : t,
      ),
    });
  }, []);


  /* water */
  const addWater = useCallback((amount = 1) => {
    const key = todayKey();
    const next = Math.max(0, (state.water[key] ?? 0) + amount);
    setState({ ...state, water: { ...state.water, [key]: next } });
  }, []);

  /* washroom */
  const enterWashroom = useCallback(() => {
    if (state.washroom.some((v) => !v.end)) return;
    setState({
      ...state,
      washroom: [{ id: crypto.randomUUID(), start: new Date().toISOString() }, ...state.washroom],
    });
  }, []);

  const exitWashroom = useCallback(() => {
    setState({
      ...state,
      washroom: state.washroom.map((v) => (v.end ? v : { ...v, end: new Date().toISOString() })),
    });
  }, []);

  const removeVisit = useCallback((id: string) => {
    setState({ ...state, washroom: state.washroom.filter((v) => v.id !== id) });
  }, []);

  /* pending manager — bulk actions */
  const rescheduleTasks = useCallback((ids: string[], date: string) => {
    const set = new Set(ids);
    commit(state.tasks.map((t) => (set.has(t.id) ? { ...t, date, remindedAt: undefined } : t)));
  }, []);

  const bulkStatus = useCallback((ids: string[], status: TaskStatus) => {
    const set = new Set(ids);
    commit(
      state.tasks.map((t) =>
        set.has(t.id)
          ? {
              ...t,
              status,
              completed: status === "completed",
              completedAt: status === "completed" ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
  }, []);

  /* Phase 21 — habits */
  const addHabit = useCallback((habit: Omit<Habit, "id" | "createdAt">) => {
    setState({
      ...state,
      habits: [
        ...state.habits,
        { ...habit, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ],
    });
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Habit>) => {
    setState({
      ...state,
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    });
  }, []);

  const removeHabit = useCallback((id: string) => {
    const habitLog = { ...state.habitLog };
    delete habitLog[id];
    setState({ ...state, habits: state.habits.filter((h) => h.id !== id), habitLog });
  }, []);

  const logHabit = useCallback((id: string, amount = 1, date = todayKey()) => {
    const forHabit = { ...(state.habitLog[id] ?? {}) };
    forHabit[date] = Math.max(0, (forHabit[date] ?? 0) + amount);
    setState({ ...state, habitLog: { ...state.habitLog, [id]: forHabit } });
  }, []);

  /* Phase 23 — places */
  const addPlace = useCallback((place: Omit<Place, "id">) => {
    setState({ ...state, places: [...state.places, { ...place, id: crypto.randomUUID() }] });
  }, []);

  const updatePlace = useCallback((id: string, patch: Partial<Place>) => {
    setState({ ...state, places: state.places.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }, []);

  const removePlace = useCallback((id: string) => {
    setState({
      ...state,
      places: state.places.filter((p) => p.id !== id),
      tasks: state.tasks.map((t) => (t.locationId === id ? { ...t, locationId: undefined } : t)),
    });
  }, []);

  /* Phase 27 — searches */
  const rememberSearch = useCallback((q: string) => {
    rememberSearchTerm(q);
  }, []);

  const clearSearches = useCallback(() => {
    setState({ ...state, recentSearches: [] });
  }, []);

  const restoreBackup = useCallback((raw: unknown) => {
    return restoreLumiBackup(raw);
  }, []);

  return {
    tasks: snapshot.tasks,
    settings: snapshot.settings,
    water: snapshot.water,
    washroom: snapshot.washroom,
    keptCollisions: snapshot.keptCollisions,
    habits: snapshot.habits,
    habitLog: snapshot.habitLog,
    places: snapshot.places,
    focusSessions: snapshot.focusSessions,
    recentSearches: snapshot.recentSearches,
    lastBriefing: snapshot.lastBriefing,
    lastNight: snapshot.lastNight,
    addPlace,
    updatePlace,
    removePlace,
    rememberSearch,
    clearSearches,
    restoreBackup,
    addTask,
    updateTask,
    setStatus,
    toggleTask,
    removeTask,
    snoozeTask,
    moveTask,
    keepCollision,
    updateSettings,
    clearAll,
    addWater,
    enterWashroom,
    exitWashroom,
    removeVisit,
    rescheduleTasks,
    bulkStatus,
    cancelTask,
    setDueDate,
    ackPending,
    addHabit,
    updateHabit,
    removeHabit,
    logHabit,
  };
}


/** read-only access outside React (reminder engine) */
export function getLumiState() {
  hydrate();
  return state;
}

export function subscribeLumi(listener: () => void) {
  return subscribe(listener);
}

export function markReminded(id: string) {
  setState({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, remindedAt: new Date().toISOString() } : t,
    ),
  });
}

export function markWarned(id: string) {
  setState({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, warnedAt: new Date().toISOString() } : t)),
  });
}

export function snoozeTaskById(id: string, minutes?: number) {
  const mins = minutes ?? state.settings.snoozeMinutes ?? 10;
  const until = new Date(Date.now() + mins * 60_000).toISOString();
  setState({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            snoozedUntil: until,
            remindedAt: undefined,
            warnedAt: undefined,
            postponedCount: (t.postponedCount ?? 0) + 1,
          }
        : t,
    ),
  });
  return mins;
}

export function setStatusById(id: string, status: TaskStatus) {
  setState({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status,
            completed: status === "completed",
            completedAt: status === "completed" ? new Date().toISOString() : undefined,
          }
        : t,
    ),
  });
}

/* ---------- date helpers ---------- */

export function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function todayKey() {
  return toKey(new Date());
}

export function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toKey(d);
}

export function prettyDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  if (key === todayKey()) return "Today";
  if (key === tomorrowKey()) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function prettyDuration(minutes: number) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function endTime(task: Task) {
  if (!task.time) return undefined;
  return timeOf(minutesOf(task.time) + (task.duration || 0));
}

/** Whole days a pending task has been carried over. */
export function daysPending(task: Task) {
  const [y, m, d] = task.date.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now.getTime() - start.getTime()) / 86_400_000));
}

export function selectToday(tasks: Task[]) {
  return tasks.filter((t) => t.date === todayKey());
}

export function selectTomorrow(tasks: Task[]) {
  return tasks.filter((t) => t.date === tomorrowKey());
}

/** Unfinished work from before today. */
export function selectPending(tasks: Task[]) {
  return tasks.filter((t) => t.status === "pending" && t.date < todayKey());
}

export function selectCompleted(tasks: Task[]) {
  return tasks.filter((t) => t.status === "completed");
}

export function sortTasks(tasks: Task[]) {
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const aDone = a.status !== "pending";
    const bDone = b.status !== "pending";
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (a.important !== b.important) return a.important ? -1 : 1;
    if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    return rank[a.priority] - rank[b.priority];
  });
}

export function streakFrom(tasks: Task[]) {
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = toKey(cursor);
    const dayTasks = tasks.filter((t) => t.date === key);
    const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.status !== "pending");
    if (allDone) {
      streak += 1;
    } else if (i > 0 || dayTasks.length > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ---------- water helpers ---------- */

export function waterFor(water: Record<string, number>, key: string) {
  return water[key] ?? 0;
}

export function lastNDays(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const c = new Date(d);
    c.setDate(d.getDate() - i);
    out.push(toKey(c));
  }
  return out;
}

export function waterTotal(water: Record<string, number>, days: string[]) {
  return days.reduce((sum, k) => sum + (water[k] ?? 0), 0);
}

/* ---------- washroom helpers ---------- */

export function visitDuration(v: WashroomVisit) {
  if (!v.end) return 0;
  return Math.max(0, Math.round((Date.parse(v.end) - Date.parse(v.start)) / 60_000));
}

export function visitsOn(visits: WashroomVisit[], key: string) {
  return visits.filter((v) => toKey(new Date(v.start)) === key);
}

/* ---------- Phase 11: cancel with reason ---------- */

export function cancelTaskById(id: string, reason: string) {
  setState({
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status: "cancelled" as TaskStatus,
            completed: false,
            completedAt: undefined,
            cancelReason: reason.trim() || undefined,
          }
        : t,
    ),
  });
}

/* ---------- Phase 16: motivation ---------- */

export const MOTIVATIONS = [
  "Sir, let's finish this.",
  "One task at a time.",
  "Stay disciplined.",
  "Small progress every day.",
  "You said you would — so let's do it.",
  "Two minutes of starting beats an hour of thinking.",
  "Future you is watching.",
  "Discipline now, freedom later.",
];

export function motivationFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return MOTIVATIONS[hash % MOTIVATIONS.length]!;
}

/* ---------- Phase 13: daily report ---------- */

/** Minutes a completed task finished after its scheduled end. */
export function delayMinutes(task: Task) {
  if (!task.completedAt || !task.time) return 0;
  const [y, m, d] = task.date.split("-").map(Number);
  const scheduledEnd = new Date(y!, (m ?? 1) - 1, d ?? 1);
  scheduledEnd.setMinutes(minutesOf(task.time) + (task.duration || 0));
  return Math.max(0, Math.round((Date.parse(task.completedAt) - scheduledEnd.getTime()) / 60_000));
}

export type DailyReport = {
  date: string;
  all: Task[];
  completed: Task[];
  pending: Task[];
  cancelled: Task[];
  missed: Task[];
  completionPct: number;
  mostImportant?: Task;
  longest?: Task;
  delayed: Task[];
  waterCount: number;
  washroomCount: number;
  workingMinutes: number;
  freeMinutes: number;
  productivity: number;
};

const AWAKE_MINUTES = 16 * 60;

export function buildDailyReport(
  tasks: Task[],
  water: Record<string, number>,
  washroom: WashroomVisit[],
  date: string,
): DailyReport {
  const all = tasks.filter((t) => t.date === date);
  const completed = all.filter((t) => t.status === "completed");
  const pending = all.filter((t) => t.status === "pending");
  const cancelled = all.filter((t) => t.status === "cancelled");
  const missed = all.filter((t) => t.status === "missed");
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

  const mostImportant = [...all].sort((a, b) => {
    if (a.important !== b.important) return a.important ? -1 : 1;
    return rank[a.priority] - rank[b.priority];
  })[0];
  const longest = [...all].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
  const delayed = completed.filter((t) => delayMinutes(t) > 0);
  const workingMinutes = completed.reduce((sum, t) => sum + (t.duration || 0), 0);
  const completionPct = all.length ? Math.round((completed.length / all.length) * 100) : 0;
  const penalty = missed.length * 6 + cancelled.length * 3 + delayed.length * 2;
  const productivity = Math.max(0, Math.min(100, completionPct - penalty));

  return {
    date,
    all,
    completed,
    pending,
    cancelled,
    missed,
    completionPct,
    mostImportant,
    longest,
    delayed,
    waterCount: water[date] ?? 0,
    washroomCount: visitsOn(washroom, date).length,
    workingMinutes,
    freeMinutes: Math.max(0, AWAKE_MINUTES - workingMinutes),
    productivity,
  };
}

/* ---------- Phase 14: pending analysis ---------- */

export const PENDING_THRESHOLD_DAYS = 2;

/** Pending tasks stuck for more than the threshold, most-stuck first. */
export function mostPending(tasks: Task[]) {
  return tasks
    .filter((t) => t.status === "pending" && daysPending(t) > PENDING_THRESHOLD_DAYS)
    .sort((a, b) => daysPending(b) - daysPending(a));
}

/* ---------- Phase 17: statistics ---------- */

export type StatRange = "weekly" | "monthly" | "yearly";

export const RANGE_DAYS: Record<StatRange, number> = {
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

export type StatBucket = {
  label: string;
  key: string;
  completed: number;
  pending: number;
  cancelled: number;
  missed: number;
  hours: number;
  water: number;
  washroom: number;
  productivity: number;
};

function bucketLabel(key: string, range: StatRange) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  if (range === "weekly") return date.toLocaleDateString(undefined, { weekday: "short" });
  if (range === "monthly") return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return date.toLocaleDateString(undefined, { month: "short" });
}

export function buildStats(
  tasks: Task[],
  water: Record<string, number>,
  washroom: WashroomVisit[],
  range: StatRange,
): StatBucket[] {
  const days = lastNDays(RANGE_DAYS[range]);
  const perDay = days.map((key) => {
    const r = buildDailyReport(tasks, water, washroom, key);
    return {
      key,
      label: bucketLabel(key, range),
      completed: r.completed.length,
      pending: r.pending.length,
      cancelled: r.cancelled.length,
      missed: r.missed.length,
      hours: Math.round((r.workingMinutes / 60) * 10) / 10,
      water: r.waterCount,
      washroom: r.washroomCount,
      productivity: r.productivity,
    };
  });

  if (range === "weekly") return perDay;

  // group by month for yearly, keep days for monthly
  if (range === "monthly") return perDay;

  const byMonth = new Map<string, StatBucket>();
  for (const d of perDay) {
    const monthKey = d.key.slice(0, 7);
    const existing = byMonth.get(monthKey);
    if (!existing) {
      byMonth.set(monthKey, { ...d, key: monthKey, label: bucketLabel(`${monthKey}-01`, "yearly") });
    } else {
      existing.completed += d.completed;
      existing.pending += d.pending;
      existing.cancelled += d.cancelled;
      existing.missed += d.missed;
      existing.hours = Math.round((existing.hours + d.hours) * 10) / 10;
      existing.water += d.water;
      existing.washroom += d.washroom;
      existing.productivity = Math.round((existing.productivity + d.productivity) / 2);
    }
  }
  return [...byMonth.values()];
}

export function prettyMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* ---------- Phase 19 / 20: briefing + night summary bookkeeping ---------- */

export function markBriefingDone(date = todayKey()) {
  setState({ ...state, lastBriefing: date });
}

export function markNightDone(date = todayKey()) {
  setState({ ...state, lastNight: date });
}

/* ---------- AI Productivity Score breakdown ---------- */

export type ScoreBreakdown = {
  discipline: number;
  timeManagement: number;
  focus: number;
  overall: number;
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Discipline = follow-through, Time management = on-time starts, Focus = deep-work share. */
export function buildScore(
  tasks: Task[],
  water: Record<string, number>,
  washroom: WashroomVisit[],
  days: string[] = lastNDays(7),
): ScoreBreakdown {
  const reports = days.map((d) => buildDailyReport(tasks, water, washroom, d));
  const all = reports.flatMap((r) => r.all);
  const completed = reports.flatMap((r) => r.completed);
  const cancelled = reports.flatMap((r) => r.cancelled);
  const missed = reports.flatMap((r) => r.missed);
  const delayed = reports.flatMap((r) => r.delayed);

  if (all.length === 0) return { discipline: 0, timeManagement: 0, focus: 0, overall: 0 };

  const discipline = clampPct(
    (completed.length / all.length) * 100 - missed.length * 4 - cancelled.length * 2,
  );
  const avgDelay = delayed.length
    ? delayed.reduce((s, t) => s + delayMinutes(t), 0) / delayed.length
    : 0;
  const onTime = completed.length ? 1 - delayed.length / completed.length : 0;
  const timeManagement = clampPct(onTime * 100 - avgDelay);
  const importantAll = all.filter((t) => t.important || t.priority === "high");
  const importantDone = importantAll.filter((t) => t.status === "completed");
  const longWork = completed.reduce((s, t) => s + (t.duration >= 45 ? t.duration : 0), 0);
  const totalWork = completed.reduce((s, t) => s + (t.duration || 0), 0) || 1;
  const focus = clampPct(
    (importantAll.length ? (importantDone.length / importantAll.length) * 60 : 40) +
      (longWork / totalWork) * 40,
  );
  const overall = clampPct(discipline * 0.4 + timeManagement * 0.3 + focus * 0.3);
  return { discipline, timeManagement, focus, overall };
}

/* ---------- Phase 21: habit statistics ---------- */

export type HabitStats = {
  habit: Habit;
  today: number;
  weekTotal: number;
  monthTotal: number;
  dailyPct: number;
  weeklyPct: number;
  monthlyPct: number;
  streak: number;
  missedDays: number;
  series: { label: string; key: string; value: number }[];
};

export function habitStats(
  habit: Habit,
  log: Record<string, Record<string, number>>,
  rangeDays = 30,
): HabitStats {
  const entries = log[habit.id] ?? {};
  const days = lastNDays(rangeDays);
  const week = lastNDays(7);
  const month = lastNDays(30);
  const today = entries[todayKey()] ?? 0;
  const weekTotal = week.reduce((s, k) => s + (entries[k] ?? 0), 0);
  const monthTotal = month.reduce((s, k) => s + (entries[k] ?? 0), 0);

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 400; i++) {
    const key = toKey(cursor);
    const done = (entries[key] ?? 0) >= habit.dailyGoal;
    if (!done) {
      if (i === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const started = toKey(new Date(habit.createdAt));
  const missedDays = month.filter(
    (k) => k >= started && k < todayKey() && (entries[k] ?? 0) < habit.dailyGoal,
  ).length;

  return {
    habit,
    today,
    weekTotal,
    monthTotal,
    dailyPct: clampPct((today / Math.max(1, habit.dailyGoal)) * 100),
    weeklyPct: clampPct((weekTotal / Math.max(1, habit.weeklyGoal)) * 100),
    monthlyPct: clampPct((monthTotal / Math.max(1, habit.monthlyGoal)) * 100),
    streak,
    missedDays,
    series: days.map((k) => ({
      key: k,
      label: new Date(k).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      value: entries[k] ?? 0,
    })),
  };
}

/* ---------- Phase 23: places ---------- */

export const PLACE_PRESETS = [
  { name: "Home", icon: "🏠" },
  { name: "Office", icon: "🏢" },
  { name: "College", icon: "🎓" },
  { name: "Gym", icon: "🏋️" },
  { name: "Market", icon: "🛒" },
];

/** metres between two coordinates (haversine) */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function placeById(places: Place[], id?: string) {
  return id ? places.find((p) => p.id === id) : undefined;
}

/* ---------- Focus session history ---------- */

export function logFocusSession(session: Omit<FocusSession, "id">) {
  setState({
    ...state,
    focusSessions: [{ ...session, id: crypto.randomUUID() }, ...state.focusSessions].slice(0, 500),
  });
}

export type FocusTaskTotal = { taskId: string; title: string; minutes: number; sessions: number };

export type FocusStats = {
  totalMinutes: number;
  todayMinutes: number;
  sessions: number;
  streak: number;
  bestStreak: number;
  perTask: FocusTaskTotal[];
};

export function buildFocusStats(sessions: FocusSession[]): FocusStats {
  const today = todayKey();
  const perTaskMap = new Map<string, FocusTaskTotal>();
  for (const s of sessions) {
    const existing = perTaskMap.get(s.taskId);
    if (existing) {
      existing.minutes += s.minutes;
      existing.sessions += 1;
    } else {
      perTaskMap.set(s.taskId, {
        taskId: s.taskId,
        title: s.taskTitle,
        minutes: s.minutes,
        sessions: 1,
      });
    }
  }

  const days = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(toKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(toKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedDays = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sortedDays) {
    if (prev) {
      const gap = (Date.parse(d) - Date.parse(prev)) / 86_400_000;
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }

  return {
    totalMinutes: sessions.reduce((s, x) => s + x.minutes, 0),
    todayMinutes: sessions.filter((s) => s.date === today).reduce((s, x) => s + x.minutes, 0),
    sessions: sessions.length,
    streak,
    bestStreak: best,
    perTask: [...perTaskMap.values()].sort((a, b) => b.minutes - a.minutes),
  };
}

/* ---------- Phase 27: smart search ---------- */

export type SearchFilters = {
  status?: TaskStatus | "all";
  category?: string | "all";
  priority?: Priority | "all";
  date?: string;
};

export function searchTasks(tasks: Task[], query: string, filters: SearchFilters = {}) {
  const q = query.trim().toLowerCase();
  return tasks
    .filter((t) => {
      if (filters.status && filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.category && filters.category !== "all" && t.category !== filters.category)
        return false;
      if (filters.priority && filters.priority !== "all" && t.priority !== filters.priority)
        return false;
      if (filters.date && t.date !== filters.date) return false;
      if (!q) return true;
      return [t.title, t.note, t.category, t.date, t.time, t.priority, t.status, t.cancelReason]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    })
    .sort((a, b) => (a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : b.date.localeCompare(a.date)));
}

export function searchSuggestions(tasks: Task[], query: string) {
  const q = query.trim().toLowerCase();
  const pool = new Set<string>();
  for (const t of tasks) {
    pool.add(t.title);
    pool.add(t.category);
  }
  return [...pool]
    .filter((s) => s && (!q || s.toLowerCase().includes(q)))
    .slice(0, 8);
}

export function rememberSearchTerm(q: string) {
  const term = q.trim();
  if (!term) return;
  const recentSearches = [term, ...state.recentSearches.filter((s) => s !== term)].slice(0, 10);
  setState({ ...state, recentSearches });
}

/* ---------- Phase 26: backup & restore ---------- */

export type LumiBackup = LumiState & { __lumi: 1; exportedAt: string };

export function buildBackup(): LumiBackup {
  hydrate();
  return { ...state, __lumi: 1, exportedAt: new Date().toISOString() };
}

export function restoreLumiBackup(raw: unknown): { ok: boolean; error?: string } {
  try {
    const parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<LumiState>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.tasks)) {
      return { ok: false, error: "That file doesn't look like a Lumi backup." };
    }
    setState({
      tasks: parsed.tasks.map(migrateTask),
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      water: parsed.water ?? {},
      washroom: Array.isArray(parsed.washroom) ? parsed.washroom : [],
      keptCollisions: Array.isArray(parsed.keptCollisions) ? parsed.keptCollisions : [],
      habits: Array.isArray(parsed.habits) && parsed.habits.length ? parsed.habits : DEFAULT_HABITS,
      habitLog: parsed.habitLog ?? {},
      places: Array.isArray(parsed.places) ? parsed.places : [],
      focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions : [],
      recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
      lastBriefing: parsed.lastBriefing,
      lastNight: parsed.lastNight,
    });
    applyTheme(state.settings.theme);
    return { ok: true };
  } catch {
    return { ok: false, error: "The backup file could not be read." };
  }
}

export function markBackupDone(at = new Date().toISOString()) {
  setState({ ...state, settings: { ...state.settings, lastBackupAt: at } });
}

export function markCalendarSynced(at = new Date().toISOString()) {
  setState({ ...state, settings: { ...state.settings, lastCalendarSync: at } });
}

/** Phase 25 — import parsed calendar events as tasks, skipping duplicates. */
export function importEventsAsTasks(
  events: { title: string; date: string; time?: string; duration: number }[],
) {
  const existing = new Set(state.tasks.map((t) => `${t.title}|${t.date}|${t.time ?? ""}`));
  const fresh: Task[] = [];
  for (const e of events) {
    const key = `${e.title}|${e.date}|${e.time ?? ""}`;
    if (existing.has(key)) continue;
    existing.add(key);
    fresh.push(
      migrateTask({
        id: crypto.randomUUID(),
        title: e.title,
        date: e.date,
        time: e.time,
        duration: e.duration,
        category: "Personal",
        priority: "medium",
        reminder: true,
        createdAt: new Date().toISOString(),
      }),
    );
  }
  if (fresh.length) setState({ ...state, tasks: [...state.tasks, ...fresh] });
  return fresh.length;
}

/** Toggle spoken output from anywhere (voice command "mute" / "resume"). */
export function setVoiceSpeech(on: boolean) {
  setState({ ...state, settings: { ...state.settings, voiceEnabled: on } });
}
