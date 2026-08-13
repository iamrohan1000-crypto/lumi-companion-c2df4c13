import { LumiOrb } from "./LumiOrb";

export function MessageBubble({
  role,
  content,
  pending = false,
}: {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex animate-rise gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <LumiOrb size={34} speaking={pending} />}
      <div
        className={`max-w-[80%] rounded-3xl px-4 py-3 text-[0.95rem] leading-relaxed shadow-soft ${
          isUser
            ? "rounded-br-lg bg-primary text-primary-foreground"
            : "rounded-bl-lg border border-border bg-surface text-surface-foreground"
        }`}
      >
        {content ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <span className="flex gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-muted-foreground animate-flicker"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
