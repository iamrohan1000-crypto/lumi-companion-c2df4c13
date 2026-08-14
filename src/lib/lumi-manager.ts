/** Phase 31 — conversation threads for the AI Manager, stored in this browser only. */

import { useCallback, useSyncExternalStore } from "react";

export type ManagerMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
};

export type ManagerThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ManagerMessage[];
};

const KEY = "lumi-manager-threads";

let threads: ManagerThread[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
const EMPTY: ManagerThread[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(threads));
  } catch {
    /* quota */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ManagerThread[]) : [];
    threads = Array.isArray(parsed) ? parsed : [];
  } catch {
    threads = [];
  }
  emit();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setThreads(next: ManagerThread[]) {
  threads = next;
  persist();
  emit();
}

export function getThreads() {
  hydrate();
  return threads;
}

export function newThreadId() {
  return crypto.randomUUID().slice(0, 8);
}

/** Creates the thread if it doesn't exist yet (idempotent). */
export function ensureThread(id: string) {
  hydrate();
  if (threads.some((t) => t.id === id)) return;
  setThreads([
    { id, title: "New conversation", updatedAt: new Date().toISOString(), messages: [] },
    ...threads,
  ]);
}

export function appendMessage(threadId: string, message: Omit<ManagerMessage, "id" | "at">) {
  hydrate();
  const msg: ManagerMessage = { ...message, id: crypto.randomUUID(), at: new Date().toISOString() };
  setThreads(
    threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: [...t.messages, msg],
            updatedAt: msg.at,
            title:
              t.messages.length === 0 && message.role === "user"
                ? message.text.slice(0, 42)
                : t.title,
          }
        : t,
    ),
  );
}

export function deleteThread(id: string) {
  hydrate();
  setThreads(threads.filter((t) => t.id !== id));
}

export function useManagerThreads() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => threads,
    () => EMPTY,
  );
  const remove = useCallback((id: string) => deleteThread(id), []);
  return { threads: snapshot, remove };
}
