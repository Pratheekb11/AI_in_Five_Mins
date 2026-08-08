"use client";

/**
 * Everything this browser remembers about a learner, in one place.
 *
 * `useProgress().reset()` clears the chapters and the level. It does not know
 * about the personal bests a game keeps, the week somebody sorted in the task
 * audit, or the name on their certificate, and all three of those are just as
 * much "start from the start" as the level is.
 *
 * The theme and the mute switch are deliberately NOT here. Neither is
 * progress, and silently flipping somebody back to light mode with the sound
 * on is a worse surprise than keeping them.
 */

/** Keys holding something the learner earned, made or told us. */
const RECORD_KEYS = [
  "llai-progress",
  "llai-best",
  "llai-own-tasks",
  "llai-name",
] as const;

/** Keys kept across a reset, listed so the decision is visible. */
export const KEPT_KEYS = ["llai-theme", "llai-muted"] as const;

export function clearLocalRecord() {
  for (const key of RECORD_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Private mode, or storage full. Nothing to clear and nothing to say.
    }
  }
  /* The stores that read these keys listen for `storage`, which only fires in
     OTHER tabs. This one has to be told. */
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("llai-name-change"));
}
