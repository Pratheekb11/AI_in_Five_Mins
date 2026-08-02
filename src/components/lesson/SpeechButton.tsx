"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Reads a lesson step aloud.
 *
 * Uses the browser's built-in speech synthesis — no service, no key, no
 * network. Where it isn't available the button simply doesn't render, because
 * a control that does nothing is worse than no control.
 */
export function SpeechButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  const supported = useSyncExternalStore(
    () => () => {},
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  // A new step should not carry on being read in the old step's voice. The
  // spoken text is part of the key below, so switching steps remounts this
  // component and the cleanup above cancels — no setState from an effect.
  if (!supported) return null;

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="label border-ink/40 hover:border-ink text-ink-soft hover:text-ink inline-flex shrink-0 items-center gap-2 rounded-[2px] border px-2.5 py-2 transition-colors"
      aria-label={speaking ? "Stop reading aloud" : "Read this aloud"}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {speaking ? (
          <rect x="2" y="2" width="8" height="8" fill="currentColor" />
        ) : (
          <path d="M2 1 L10 6 L2 11 Z" fill="currentColor" />
        )}
      </svg>
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
