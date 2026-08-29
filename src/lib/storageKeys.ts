/**
 * Every key this site writes to local storage, in one plain module.
 */

/** Things the learner earned, made or told us. Reset wipes these. */
export const RECORD_KEYS = [
  "llai-progress",
  "llai-best",
  "llai-own-tasks",
  "llai-name",
  "llai-celebrated",
  "llai-local-telemetry",
  "llai-tap-hint-count",
] as const;

/**
 * Kept across a reset, listed so the decision is visible. Being flipped back
 * to light mode with the sound on is a worse surprise than keeping them.
 */
export const KEPT_KEYS = ["llai-theme", "llai-muted"] as const;
