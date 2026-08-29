/**
 * When the "tap a choice" hint is allowed to run.
 *
 * Pure, and apart from `GameShell`, because the interesting part is the
 * decision rather than the panel: a game dealt server-side is in "playing"
 * from the moment its page loads, which on a deck lesson can be a beat nobody
 * has reached yet and on a scrolling one a cabinet far below the fold. The
 * hint gets a handful of showings per game and they are worth spending on
 * somebody who is actually looking at the board.
 */

export type TapHintPhase = "ready" | "playing" | "over";

export type TapHintConditions = {
  phase: TapHintPhase;
  /** The cabinet is really in the viewport, not hidden in an inactive beat. */
  onScreen: boolean;
  /** Showings this game has already had, from this browser's own store. */
  count: number;
  /** Already armed once during this mount. */
  armed: boolean;
};

/** How many times one game may show it before it stops for good. */
export const TAP_HINT_LIMIT = 5;

/** How long it stays up when nothing dismisses it. */
export const TAP_HINT_MS = 5600;

export function canArmTapHint({
  phase,
  onScreen,
  count,
  armed,
}: TapHintConditions): boolean {
  return phase === "playing" && onScreen && count < TAP_HINT_LIMIT && !armed;
}
