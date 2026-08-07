"use client";

import { useState } from "react";
import { TokenStrip } from "@/components/token-strip/TokenStrip";
import { type Ink, inkClasses } from "@/lib/ink";
import type { MeasuredText } from "@/lib/tokenExamples";

/**
 * Guess the token count, then see the split.
 *
 * The guess is the point: committing to a number before the reveal is what
 * turns "tokens are roughly words" into a belief the learner can be surprised
 * out of. The strip appears with the answer so the surprise comes with its
 * explanation attached.
 */

const ROUNDS = 5;

function verdict(guess: number, actual: number): { text: string; ink: Ink } {
  const off = Math.abs(guess - actual);
  if (off === 0) return { text: "Exact.", ink: "teal" };
  if (off === 1) return { text: "One off.", ink: "teal" };
  if (off <= 3) return { text: `${off} off, close.`, ink: "yellow" };
  return { text: `${off} off.`, ink: "pink" };
}

export function TokenGuessGame({ items }: { items: MeasuredText[] }) {
  const rounds = items.slice(0, ROUNDS);

  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState(5);
  const [revealed, setRevealed] = useState(false);
  const [exact, setExact] = useState(0);
  const [within, setWithin] = useState(0);

  const current = rounds[round];
  const finished = round >= rounds.length;

  function submit() {
    if (revealed || !current) return;
    setRevealed(true);
    const off = Math.abs(guess - current.tokenCount);
    if (off === 0) setExact((n) => n + 1);
    if (off <= 1) setWithin((n) => n + 1);
  }

  function advance() {
    setRevealed(false);
    setGuess(5);
    setRound((r) => r + 1);
  }

  function restart() {
    setRound(0);
    setGuess(5);
    setRevealed(false);
    setExact(0);
    setWithin(0);
  }

  if (finished) {
    return (
      <div className="plate p-6" aria-live="polite">
        <p className="label text-ink-faint mb-3">Round over</p>
        <p className="display-md mb-3">
          {within} of {rounds.length} within one token
        </p>
        <p className="text-ink-soft prose-measure mb-5">
          {within >= 4
            ? "You have the feel for it. Token count tracks characters far more than it tracks words."
            : "Most people guess low on long words and high on short sentences. Tokens are chunks of characters, not words. A common word is one token, and a rare one shatters."}
        </p>
        <button
          type="button"
          onClick={restart}
          className="plate misreg font-display px-4 py-2.5 font-bold"
        >
          Play again
        </button>
      </div>
    );
  }

  const v = revealed ? verdict(guess, current.tokenCount) : null;

  return (
    <div className="plate p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="label text-ink-faint">
          Round {round + 1} of {rounds.length}
        </span>
        <span className="label text-ink-faint">{exact} exact</span>
      </div>

      <p className="font-data bg-paper-sunk border-ink/25 mb-5 rounded-[2px] border px-4 py-3.5 text-lg break-words">
        {current.text}
      </p>

      {!revealed ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="guess" className="label text-ink-faint">
              How many tokens? ({current.chars} characters)
            </label>
            <div className="mt-2.5 flex items-center gap-4">
              <input
                id="guess"
                type="range"
                min={1}
                max={30}
                value={guess}
                onChange={(e) => setGuess(Number(e.target.value))}
                className="accent-pink h-2 w-full"
              />
              <output
                htmlFor="guess"
                className="data w-10 shrink-0 text-right text-2xl font-bold"
              >
                {guess}
              </output>
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
          >
            Lock it in
          </button>
        </div>
      ) : (
        <div className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className={`display-md ${inkClasses[v!.ink].text}`}>
              {current.tokenCount} tokens
            </span>
            <span className="label text-ink-faint">
              you said {guess} · {v!.text}
            </span>
          </div>

          <TokenStrip items={current.tokens.map((t) => ({ text: t.text }))} />

          <button
            type="button"
            onClick={advance}
            className="plate misreg font-display px-5 py-2.5 font-bold"
          >
            {round + 1 === rounds.length ? "See how you did" : "Next one"}
          </button>
        </div>
      )}
    </div>
  );
}
