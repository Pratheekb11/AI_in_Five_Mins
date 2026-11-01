"use client";

import { useMemo } from "react";
import { Reel, useReel, type ReelStep } from "./Reel";

/**
 * Chapter 4, played rather than read. One thing wanted, four ways of asking
 * for it, and what the model actually said to each, from `listen.json`. Only
 * the example changes what it does, and it takes the example's shape.
 */

export type AskShot = { label: string; prompt: string; says: string };

export function CopyReel({
  want,
  answer,
  shots,
}: {
  want: string;
  answer: string;
  /** Plain, polite, role, example: in that order. */
  shots: [AskShot, AskShot, AskShot, AskShot];
}) {
  const steps = useMemo<ReelStep[]>(
    () =>
      shots.map((shot, i) => ({
        label: shot.label,
        ms: i === 3 ? 5600 : 3400,
        caption:
          i < 3
            ? shot.says
              ? `It rambles: “${shot.says}”`
              : "It says nothing useful."
            : `Only the example changes what it does: one word, like the example. It says “${shot.says}”. It copied the shape, not the sense.`,
      })),
    [shots],
  );

  const { ref, at } = useReel(steps);
  const shot = shots[at];

  return (
    <Reel
      steps={steps}
      at={at}
      frameRef={ref}
      tone={at === 3 ? undefined : "bad"}
      footnote="What it says is DistilGPT-2's real output for each prompt."
    >
      <p className="label text-ink-faint mb-1">Goal</p>
      <p className="mb-3 text-[1rem]">
        {want} The answer is{" "}
        <span className="font-data font-bold">{answer}</span>.
      </p>

      <p className="label text-ink-faint mb-1">You type</p>
      <pre
        key={`p-${at}`}
        className="font-data bg-paper-sunk border-ink/20 mb-3 min-h-[5.5rem] rounded-[2px] border px-3 py-2 text-[0.875rem] whitespace-pre-wrap"
        style={{ animation: "ink-pop 0.35s ease-out both" }}
      >
        {shot.prompt}
      </pre>

      <p className="label text-ink-faint mb-1">The AI says</p>
      <p
        key={`s-${at}`}
        className={`font-data min-h-[2rem] rounded-[2px] px-2 py-1 text-[0.9375rem] font-bold ${
          at === 3
            ? "bg-yellow-wash text-yellow-text"
            : "bg-pink-wash text-pink-text"
        }`}
        style={{ animation: "ink-pop 0.35s ease-out 0.6s both" }}
      >
        {shot.says || "(nothing)"}
      </p>
    </Reel>
  );
}
