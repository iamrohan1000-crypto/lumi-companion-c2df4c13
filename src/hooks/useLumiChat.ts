import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PERSONA, type ChatMessage, type PersonaId } from "@/lib/lumi";

const STORAGE_KEY = "lumi.chat.v1";

type Stored = { personaId: PersonaId; messages: ChatMessage[] };

export function useLumiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [personaId, setPersonaId] = useState<PersonaId>(DEFAULT_PERSONA);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const personaRef = useRef(personaId);
  personaRef.current = personaId;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
        if (parsed.personaId) setPersonaId(parsed.personaId);
      }
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ personaId, messages } satisfies Stored));
    } catch {
      /* storage full or unavailable */
    }
  }, [hydrated, personaId, messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      setError(null);
      const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ personaId: personaRef.current, messages: history.slice(-24) }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.json().catch(() => ({ error: "Lumi couldn't answer." }));
          throw new Error(detail.error ?? "Lumi couldn't answer.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let reply = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta: string | undefined = json.choices?.[0]?.delta?.content;
              if (delta) {
                reply += delta;
                setMessages([...history, { role: "assistant", content: reply }]);
              }
            } catch {
              /* partial chunk */
            }
          }
        }

        if (!reply) {
          setMessages([
            ...history,
            { role: "assistant", content: "I'm here — say that again for me?" },
          ]);
        }
      } catch (e) {
        setMessages(history);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, personaId, setPersonaId, send, reset, streaming, error, hydrated };
}
