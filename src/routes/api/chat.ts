import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { systemPrompt } from "@/lib/lumi";

const bodySchema = z.object({
  personaId: z.string().max(32).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(60),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI is not configured." }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid request." }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { personaId, messages } = parsed.data;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            stream: true,
            messages: [{ role: "system", content: systemPrompt(personaId) }, ...messages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text();
          console.error(`AI gateway failed [${upstream.status}]: ${detail}`);
          const message =
            upstream.status === 429
              ? "Lumi needs a short breather — too many messages at once."
              : upstream.status === 402
                ? "AI credits are exhausted for this workspace."
                : "Lumi couldn't answer just now.";
          return new Response(JSON.stringify({ error: message }), {
            status: upstream.status,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(upstream.body, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
