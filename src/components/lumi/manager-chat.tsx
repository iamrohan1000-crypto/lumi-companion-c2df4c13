import { Link, useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askManager } from "@/lib/lumi-insights";
import {
  appendMessage,
  ensureThread,
  newThreadId,
  useManagerThreads,
} from "@/lib/lumi-manager";
import { useLumi } from "@/lib/lumi-store";
import { address, speak } from "@/lib/lumi-voice";
import { cn } from "@/lib/utils";

const STARTERS = [
  "How many tasks are left?",
  "What should I do now?",
  "Which task is most important?",
  "Did I drink enough water today?",
  "How am I doing this week?",
];

export function ManagerChat({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const { threads, remove } = useManagerThreads();
  const { tasks, water, washroom, habits, habitLog, focusSessions, settings } = useLumi();
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    ensureThread(threadId);
  }, [threadId]);

  const thread = threads.find((t) => t.id === threadId);
  const messages = thread?.messages ?? [];

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, thinking]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    appendMessage(threadId, { role: "user", text: q });
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      const answer = askManager(
        { tasks, water, washroom, habits, habitLog, focusSessions, waterGoal: settings.waterGoal },
        q,
        address(),
      );
      appendMessage(threadId, { role: "assistant", text: answer });
      speak(answer);
      setThinking(false);
    }, 350);
  }

  return (
    <AppShell
      title="AI manager"
      subtitle="Ask about your day — answers come from your own data"
      action={
        <Button
          className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
          onClick={() => navigate({ to: "/manager/$threadId", params: { threadId: newThreadId() } })}
        >
          <MessageSquarePlus className="size-4" /> New chat
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="surface-card hidden max-h-[70vh] overflow-y-auto rounded-3xl p-3 lg:block">
          <p className="px-2 pb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Conversations
          </p>
          {threads.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">No chats yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {threads.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-1 rounded-2xl px-2",
                    t.id === threadId ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <Link
                    to="/manager/$threadId"
                    params={{ threadId: t.id }}
                    className="min-w-0 flex-1 truncate py-2 text-sm"
                  >
                    {t.title}
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${t.title}`}
                    onClick={() => {
                      remove(t.id);
                      if (t.id === threadId)
                        navigate({ to: "/manager/$threadId", params: { threadId: newThreadId() } });
                    }}
                    className="press grid size-7 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="surface-card flex h-[70vh] flex-col rounded-3xl p-4">
          <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto size-8 text-primary" />
                  <p className="font-display mt-3 text-lg font-semibold">
                    How can I help, {address()}?
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="press rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <p
                    className={cn(
                      "animate-fade-in max-w-[85%] rounded-3xl px-4 py-2.5 text-sm",
                      m.role === "user"
                        ? "bg-brand text-primary-foreground"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {m.text}
                  </p>
                </div>
              ))
            )}
            {thinking ? (
              <p className="inline-flex items-center gap-1 rounded-3xl bg-accent px-4 py-2.5 text-sm text-muted-foreground">
                <span className="pulse">Lumi is thinking…</span>
              </p>
            ) : null}
          </div>

          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask Lumi about your tasks, water, habits or focus…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl"
            />
            <Button
              type="submit"
              disabled={!input.trim() || thinking}
              className="press bg-brand size-11 rounded-2xl p-0 text-primary-foreground hover:opacity-90"
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
