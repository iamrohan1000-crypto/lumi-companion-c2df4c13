import { useCallback, useEffect, useRef, useState } from "react";

import { listen, matchCommand, recognitionSupported, type VoiceCommand } from "@/lib/lumi-speech";

export type VoiceFeedbackState = {
  kind: "idle" | "confirmed" | "unrecognised" | "error";
  message: string;
};

const ERROR_TEXT: Record<string, string> = {
  "not-allowed": "Microphone blocked. Allow mic access to use voice commands.",
  "service-not-allowed": "Microphone blocked by the browser settings.",
  "no-speech": "I didn't hear anything. Try again.",
  "audio-capture": "No microphone found.",
  network: "Voice service unreachable. Use the buttons instead.",
  unsupported: "Voice commands aren't supported in this browser.",
};

/**
 * Listens continuously for the spoken commands "done", "cancel", "mute",
 * "resume" and "snooze" while `active` is true. Reports on-screen confirmation
 * and recoverable errors so the user always knows what was heard.
 */
export function useVoiceCommands(
  active: boolean,
  onCommand: (command: Exclude<VoiceCommand, null>, transcript: string) => void,
) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [feedback, setFeedback] = useState<VoiceFeedbackState>({ kind: "idle", message: "" });
  const [attempt, setAttempt] = useState(0);
  const handler = useRef(onCommand);
  handler.current = onCommand;
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((next: VoiceFeedbackState, ms = 3500) => {
    setFeedback(next);
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => setFeedback({ kind: "idle", message: "" }), ms);
  }, []);

  const retry = useCallback(() => {
    setFeedback({ kind: "idle", message: "" });
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!active || !recognitionSupported()) return;
    const handle = listen(
      (text, isFinal) => {
        setHeard(text);
        if (!isFinal) return;
        const cmd = matchCommand(text);
        if (cmd) {
          flash({ kind: "confirmed", message: `Heard "${cmd}" — applying it now.` });
          handler.current(cmd, text);
        } else if (text.trim()) {
          flash({
            kind: "unrecognised",
            message: `I heard "${text}" but that isn't a command. Say done, cancel, snooze, mute or resume.`,
            }, 5000);
        }
      },
      {
        continuous: true,
        interim: true,
        onError: (e) => {
          setListening(false);
          setFeedback({
            kind: "error",
            message: ERROR_TEXT[e] ?? "Voice recognition stopped. Tap retry or use the buttons.",
          });
        },
      },
    );
    setListening(true);
    return () => {
      handle.stop();
      setListening(false);
      setHeard("");
    };
  }, [active, attempt, flash]);

  useEffect(
    () => () => {
      if (clearRef.current) clearTimeout(clearRef.current);
    },
    [],
  );

  return { listening, heard, feedback, retry, supported: recognitionSupported() };
}
