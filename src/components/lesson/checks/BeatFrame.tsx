"use client";

import type { ReactNode } from "react";

/**
 * The furniture every beat shares: the question, the work, and the reason.
 *
 * The reason appears the moment a beat is checked, right or wrong, because the
 * explanation is the teaching and withholding it until the end of the page
 * would waste the one moment the learner actually wants it.
 */
export function BeatFrame({
  prompt,
  instruction,
  children,
  checked,
  ready,
  onCheck,
  right,
  total,
  because,
}: {
  prompt: string;
  /** Optional line telling them how this particular beat works. */
  instruction?: string;
  children: ReactNode;
  checked: boolean;
  /** Whether enough has been placed for checking to mean anything. */
  ready: boolean;
  onCheck: () => void;
  right: number;
  total: number;
  because: string;
}) {
  return (
    <li className="plate p-5">
      <p className="font-display mb-1 text-lg font-bold">{prompt}</p>
      {instruction ? (
        <p className="label text-ink-faint mb-4">{instruction}</p>
      ) : (
        <div className="mb-4" />
      )}

      {children}

      <div className="border-ink/20 mt-4 flex flex-wrap items-center gap-3 border-t pt-3.5">
        {checked ? (
          <>
            <span
              className={`data shrink-0 text-sm font-semibold ${
                right === total ? "text-teal-text" : "text-pink-text"
              }`}
            >
              {right} / {total}
            </span>
            <p className="text-ink-soft min-w-0 flex-1 text-[0.9375rem]">
              {because}
            </p>
          </>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={onCheck}
            className="plate misreg btn-primary font-display px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Check
          </button>
        )}
      </div>
    </li>
  );
}
