import { createFileRoute } from "@tanstack/react-router";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listen, parseTaskSpeech, recognitionSupported, type ParsedTask } from "@/lib/lumi-speech";
import { prettyDate, useLumi } from "@/lib/lumi-store";
import { address, speak } from "@/lib/lumi-voice";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice Task Creation — Lumi" },
      {
        name: "description",
        content:
          "Speak naturally — 'Tomorrow at 9 AM ACCA class' — and Lumi turns it into a scheduled task.",
      },
      { property: "og:title", content: "Voice Task Creation — Lumi" },
      {
        property: "og:description",
        content: "Create tasks by voice; Lumi detects the name, date, time, priority and category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoicePage,
});

const EXAMPLES = [
  "Tomorrow at 9 AM ACCA class",
  "Today at 5 PM gym",
  "Friday at 7 PM buy tomatoes",
  "Important meeting Monday at 11 AM",
];

function VoicePage() {
  const { addTask, settings } = useLumi();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<ParsedTask | null>(null);
  const [listening, setListening] = useState(false);
  const [handle, setHandle] = useState<{ stop: () => void } | null>(null);

  function analyse(value: string) {
    if (!value.trim()) return;
    const parsed = parseTaskSpeech(value);
    setDraft(parsed);
  }

  function toggleMic() {
    if (listening) {
      handle?.stop();
      setHandle(null);
      setListening(false);
      return;
    }
    if (!recognitionSupported()) {
      toast.error("Speech recognition isn't available in this browser.");
      return;
    }
    setListening(true);
    const h = listen(
      (t, isFinal) => {
        setText(t);
        if (isFinal) analyse(t);
      },
      {
        interim: true,
        onEnd: () => setListening(false),
        onError: () => {
          setListening(false);
          toast.error("Microphone permission is needed for voice input.");
        },
      },
    );
    setHandle(h);
  }

  function create() {
    if (!draft) return;
    addTask({
      title: draft.title,
      note: undefined,
      date: draft.date,
      time: draft.time,
      duration: 30,
      priority: draft.priority,
      category: draft.category,
      important: draft.important,
      reminder: true,
      repeatDaily: false,
      repeat: "none",
    });
    speak(`${address()}, ${draft.title} is scheduled for ${prettyDate(draft.date)}.`);
    toast.success("Task created from your voice");
    setDraft(null);
    setText("");
  }

  return (
    <AppShell title="Voice task creation" subtitle="Just say it — Lumi fills in the details">
      <section className="surface-card rounded-3xl p-6 text-center">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={listening ? "Stop listening" : "Start listening"}
          className={`press glow mx-auto grid size-28 place-items-center rounded-full ${
            listening ? "bg-destructive text-destructive-foreground" : "bg-brand text-primary-foreground"
          }`}
        >
          {listening ? <MicOff className="size-10" /> : <Mic className="size-10" />}
        </button>
        <p className="mt-4 text-sm text-muted-foreground">
          {listening ? "Listening… speak your task." : "Tap the mic and speak naturally."}
        </p>
        {!recognitionSupported() ? (
          <p className="mt-2 text-xs text-warning">
            This browser has no speech recognition — type the sentence below instead.
          </p>
        ) : null}

        <div className="mt-6 grid gap-2 text-left">
          <Label htmlFor="voice-text">What you said</Label>
          <Input
            id="voice-text"
            value={text}
            placeholder="Tomorrow at 9 AM ACCA class"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyse(text)}
          />
          <Button
            variant="outline"
            className="press mt-2 rounded-full"
            onClick={() => analyse(text)}
          >
            <Sparkles className="size-4" />
            Analyse sentence
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setText(e);
                analyse(e);
              }}
              className="press rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
            >
              {e}
            </button>
          ))}
        </div>
      </section>

      {draft ? (
        <section className="surface-card glow mt-6 rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Lumi understood</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Task name">
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>
            <Field label="Time">
              <Input
                type="time"
                value={draft.time ?? ""}
                onChange={(e) => setDraft({ ...draft, time: e.target.value || undefined })}
              />
            </Field>
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {settings.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Priority: {draft.priority}
            {draft.important ? " · marked important" : ""}
          </p>
          <Button
            onClick={create}
            className="press bg-brand mt-5 w-full rounded-full text-primary-foreground hover:opacity-90"
          >
            Create this task
          </Button>
        </section>
      ) : null}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 text-left">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
