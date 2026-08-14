import { AlertTriangle, CheckCircle2, Mic, RotateCw } from "lucide-react";

import type { VoiceFeedbackState } from "@/hooks/use-voice-commands";

/** On-screen confirmation + recovery for spoken commands. */
export function VoiceFeedback({
  supported,
  listening,
  heard,
  feedback,
  onRetry,
}: {
  supported: boolean;
  listening: boolean;
  heard: string;
  feedback: VoiceFeedbackState;
  onRetry: () => void;
}) {
  if (!supported) return null;

  if (feedback.kind === "confirmed")
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5" />
        {feedback.message}
      </p>
    );

  if (feedback.kind === "unrecognised" || feedback.kind === "error")
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning">
          <AlertTriangle className="size-3.5" />
          {feedback.message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCw className="size-3.5" />
          Listen again
        </button>
      </div>
    );

  return (
    <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Mic className={listening ? "size-3.5 text-primary" : "size-3.5"} />
      {listening
        ? heard || 'Say "done", "cancel", "snooze", "mute" or "resume"'
        : "Voice commands off"}
    </p>
  );
}
