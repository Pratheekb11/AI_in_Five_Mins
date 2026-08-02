"use client";

import { useEffect, type ReactNode } from "react";
import { useBestScore } from "@/lib/game/useBestScore";

/**
 * The cabinet every game is mounted in.
 *
 * Rounds are deliberately under a minute, so losing costs nothing and going
 * again is the obvious move. That is the whole design: the teaching happens on
 * the third replay, not the first, so everything here exists to make the third
 * replay feel like the player's own idea.
 *
 * The levers are the boring proven ones — a visible personal best, a loud
 * moment when it is beaten, the score kept on screen while you play, and a
 * restart that takes one press and no confirmation.
 */

export type Readout = { label: string; value: string | number; accent?: boolean };

export function GameShell({
  gameId,
  name,
  instruction,
  readouts,
  phase,
  onStart,
  startLabel = "Play",
  finalScore,
  again,
  children,
  footer,
}: {
  /** Stable id for the personal best. Omit for games that are not scored. */
  gameId?: string;
  name: string;
  instruction: string;
  readouts: Readout[];
  phase: "ready" | "playing" | "over";
  onStart: () => void;
  startLabel?: string;
  /** The score to record when the round ends. */
  finalScore?: number;
  again?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { best, submit } = useBestScore(gameId ?? "unscored");

  // Recorded when the round ends, not while it runs — a best is a result.
  useEffect(() => {
    if (phase === "over" && gameId && typeof finalScore === "number") {
      submit(finalScore);
    }
  }, [phase, gameId, finalScore, submit]);

  const beatenBest =
    phase === "over" &&
    typeof finalScore === "number" &&
    finalScore > 0 &&
    finalScore >= best;

  return (
    <div className="plate scroll-mt-20 overflow-hidden" id="game">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">{name}</span>
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          {readouts.map((r) => (
            <div key={r.label} className="flex items-baseline gap-2">
              <dt className="label text-ink-faint">{r.label}</dt>
              <dd
                className={`data text-sm font-bold tabular-nums ${
                  r.accent ? "text-pink-text" : "text-ink"
                }`}
              >
                {r.value}
              </dd>
            </div>
          ))}
          {gameId && best > 0 ? (
            <div className="flex items-baseline gap-2">
              <dt className="label text-ink-faint">Best</dt>
              <dd className="data text-teal-text text-sm font-bold tabular-nums">
                {best}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="relative">
        {children}

        {phase !== "playing" ? (
          <div className="bg-paper/92 absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center backdrop-blur-[2px]">
            {phase === "ready" ? (
              <>
                <p className="prose-measure text-ink-soft text-[0.9375rem]">
                  {instruction}
                </p>
                {gameId && best > 0 ? (
                  <p className="label text-teal-text">Your best: {best}</p>
                ) : null}
                <button
                  type="button"
                  onClick={onStart}
                  className="plate misreg btn-primary font-display px-6 py-3 text-lg font-bold"
                >
                  {startLabel}
                </button>
              </>
            ) : (
              <>
                {beatenBest ? (
                  <p className="label text-teal-text">
                    ★ New best ★
                  </p>
                ) : null}
                {again}
                <button
                  type="button"
                  onClick={onStart}
                  className="plate misreg btn-primary font-display px-6 py-3 text-lg font-bold"
                >
                  Go again
                </button>
                {gameId && best > 0 && !beatenBest ? (
                  <p className="label text-ink-faint">
                    Best so far: {best}
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className="border-ink/25 text-ink-soft border-t px-4 py-3 text-sm">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
