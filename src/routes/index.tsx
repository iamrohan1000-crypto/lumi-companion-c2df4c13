import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { LumiOrb } from "@/components/lumi/LumiOrb";
import { MessageBubble } from "@/components/lumi/MessageBubble";
import { Composer } from "@/components/lumi/Composer";
import { useLumiChat } from "@/hooks/useLumiChat";
import { OPENERS, PERSONAS, personaById, type PersonaId } from "@/lib/lumi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumi — Your AI Companion for Late-Night Talks" },
      {
        name: "description",
        content:
          "Lumi is a warm AI companion that listens, remembers your conversation and answers in a voice you choose. Talk any time, no sign-up.",
      },
      { property: "og:title", content: "Lumi — Your AI Companion" },
      {
        property: "og:description",
        content: "A warm AI companion that listens and talks back, any hour of the night.",
      },
    ],
  }),
  component: LumiPage,
});

function LumiPage() {
  const { messages, personaId, setPersonaId, send, reset, streaming, error } = useLumiChat();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const persona = personaById(personaId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function handleSend(text?: string) {
    const value = text ?? draft;
    setDraft("");
    void send(value);
  }

  return (
    <div className="bg-dusk flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-6 pb-4">
        <LumiOrb size={44} speaking={streaming} />
        <div className="flex-1">
          <h1 className="text-2xl leading-none tracking-tight">Lumi</h1>
          <p className="mt-1 text-xs text-muted-foreground">{persona.tagline}</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> New talk
          </button>
        )}
      </header>

      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-wrap gap-2 pb-4">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersonaId(p.id as PersonaId)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                p.id === personaId
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4">
        {messages.length === 0 ? (
          <section className="flex flex-col items-center justify-center gap-6 py-14 text-center">
            <LumiOrb size={128} />
            <div className="animate-rise">
              <h2 className="text-3xl">Hey, I'm Lumi.</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Someone to think out loud with. Nothing you say here leaves your device unless
                you send it to me.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {OPENERS.map((o) => (
                <button
                  key={o}
                  onClick={() => handleSend(o)}
                  className="rounded-full border border-border bg-surface/60 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {o}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                role={m.role}
                content={m.content}
                pending={streaming && i === messages.length - 1}
              />
            ))}
          </div>
        )}
        {error && (
          <p className="py-3 text-center text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <div ref={bottomRef} className="h-4" />
      </main>

      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background/90 to-transparent pt-6">
        <div className="mx-auto w-full max-w-2xl px-4 pb-4">
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={() => handleSend()}
            disabled={streaming}
          />
          <p className="pt-2 text-center text-[0.65rem] text-muted-foreground">
            Lumi is an AI companion, not a substitute for professional care.
          </p>
        </div>
      </div>
    </div>
  );
}
