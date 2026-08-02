"use client";

import type { ReactNode } from "react";

/**
 * The cabinet every game is mounted in.
 *
 * Holds the title strip, the live readouts, and the two screens a short game
 * needs either side of play. Rounds are deliberately brief — under a minute —
 * so a learner can lose, understand why, and immediately go again, which is
 * where the actual teaching happens.
 */

export type Readout = { label: string; value: string | number; accent?: boolean };

export function GameShell({
  name,
  instruction,
  readouts,
  phase,
  onStart,
  startLabel = "Start",
  again,
  children,
  footer,
}: {
  name: string;
  instruction: string;
  readouts: Readout[];
  phase: "ready" | "playing" | "over";
  onStart: () => void;
  startLabel?: string;
  /** Shown on the end screen. */
  again?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="plate overflow-hidden">
      {/* Title strip — the printed header of the cabinet */}
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
                {again}
                <button
                  type="button"
                  onClick={onStart}
                  className="plate misreg btn-primary font-display px-6 py-3 text-lg font-bold"
                >
                  Go again
                </button>
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
