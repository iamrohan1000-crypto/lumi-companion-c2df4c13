import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend();
    if (ref.current) ref.current.style.height = "auto";
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 rounded-3xl border border-border bg-surface/80 p-2 shadow-soft backdrop-blur"
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
        }}
        onKeyDown={handleKey}
        placeholder="Say anything to Lumi…"
        aria-label="Message Lumi"
        className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.95rem] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="bg-ember grid size-10 shrink-0 place-items-center rounded-full text-primary-foreground transition-opacity disabled:opacity-40"
      >
        <ArrowUp className="size-5" />
      </button>
    </form>
  );
}
