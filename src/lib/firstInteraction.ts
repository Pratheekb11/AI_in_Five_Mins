"use client";

import { trackFirstInteraction } from "./telemetry";

/**
 * Milliseconds from a lesson route painting to the reader's first real
 * action in it, a tap on a game, not the page simply rendering. One clock
 * at a time, scoped to whichever page last called `startInteractionClock`,
 * which `Engagement` does on every mount.
 */

let paintedAt: number | null = null;
let currentPage: string | null = null;
let fired = false;

export function startInteractionClock(page: string) {
  paintedAt = performance.now();
  currentPage = page;
  fired = false;
}

/** Call from anywhere a real tap or click on a game happens. Only the first
 *  one per page counts; the rest are no-ops. */
export function markInteraction() {
  if (fired || paintedAt === null || !currentPage) return;
  fired = true;
  trackFirstInteraction(currentPage, Math.round(performance.now() - paintedAt));
}
