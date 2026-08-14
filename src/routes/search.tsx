import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mic, MicOff, Search as SearchIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { TaskList } from "@/components/lumi/task-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listen, recognitionSupported } from "@/lib/lumi-speech";
import {
  searchSuggestions,
  searchTasks,
  useLumi,
  type Priority,
  type TaskStatus,
} from "@/lib/lumi-store";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Smart Search — Lumi" },
      {
        name: "description",
        content:
          "Search every task by name, category, date, time, priority or status — with voice search and instant results.",
      },
      { property: "og:title", content: "Smart Search — Lumi" },
      {
        property: "og:description",
        content: "Instant search across pending, completed, cancelled and past Lumi tasks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { tasks, settings, recentSearches, rememberSearch, clearSearches } = useLumi();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [date, setDate] = useState("");
  const [listening, setListening] = useState(false);
  const [handle, setHandle] = useState<{ stop: () => void } | null>(null);

  const results = useMemo(
    () => searchTasks(tasks, query, { status, category, priority, date: date || undefined }),
    [tasks, query, status, category, priority, date],
  );
  const suggestions = useMemo(() => searchSuggestions(tasks, query), [tasks, query]);

  function commit(value: string) {
    setQuery(value);
    rememberSearch(value);
  }

  function toggleMic() {
    if (listening) {
      handle?.stop();
      setHandle(null);
      setListening(false);
      return;
    }
    if (!recognitionSupported()) {
      toast.error("Voice search isn't available in this browser.");
      return;
    }
    setListening(true);
    setHandle(
      listen(
        (t, isFinal) => {
          setQuery(t);
          if (isFinal) commit(t);
        },
        {
          interim: true,
          onEnd: () => setListening(false),
          onError: () => setListening(false),
        },
      ),
    );
  }

  return (
    <AppShell title="Smart search" subtitle="Find anything across your whole history">
      <section className="surface-card rounded-3xl p-5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              placeholder="Search tasks, categories, reasons…"
              className="pl-9"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commit(query)}
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={listening ? "Stop voice search" : "Voice search"}
            onClick={toggleMic}
            className={`press grid size-10 shrink-0 place-items-center rounded-full ${
              listening ? "bg-destructive text-destructive-foreground" : "bg-brand text-primary-foreground"
            }`}
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {settings.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="search-date">Date</Label>
            <Input
              id="search-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {suggestions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className="press rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {recentSearches.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> Recent
            </span>
            {recentSearches.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="press rounded-full bg-muted px-3 py-1.5 text-xs"
              >
                {s}
              </button>
            ))}
            <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" onClick={clearSearches}>
              Clear
            </Button>
          </div>
        ) : null}
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        {results.length} result{results.length === 1 ? "" : "s"}
      </p>
      <div className="mt-3">
        <TaskList tasks={results} emptyTitle="Nothing matches" emptyHint="Try a different word or filter." showDate />
      </div>
    </AppShell>
  );
}
