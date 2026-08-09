/**
 * Every key this site writes to local storage, in one plain module.
 *
 * Deliberately not `"use client"`. `reset.ts` is, because it touches
 * localStorage, and a server component that imports a value from a client
 * module gets a client reference rather than the value — which is how the
 * privacy page ended up calling `.map` on something that was not an array.
 * The lists live here so both sides can read them.
 */

/** Things the learner earned, made or told us. Reset wipes these. */
export const RECORD_KEYS = [
  "llai-progress",
  "llai-best",
  "llai-own-tasks",
  "llai-name",
] as const;

/**
 * Kept across a reset, listed so the decision is visible. Being flipped back
 * to light mode with the sound on is a worse surprise than keeping them.
 */
export const KEPT_KEYS = ["llai-theme", "llai-muted"] as const;
