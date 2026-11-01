"use client";

import { useMemo } from "react";
import { Reel, useReel, type ReelStep } from "./Reel";

/**
 * Chapter 5, played rather than read. One fact asked three ways: plainly,
 * after being told the wrong answer, and after being told the right one. What
 * it said, and its measured chance of each answer, from `pushback.json`.
 */

export type PushShot = {
  label: string;
  prompt: string;
  says: string;
  right: number;
  wrong: number;
};

export function CopyYouReel({
  right,
  wrong,
  shots,
}: {
  right: string;
  wrong: string;
  /** Plain, wrong-first, right-first. */
  shots: [PushShot, PushShot, PushShot];
}) {
  const steps = useMemo<ReelStep[]>(
    () => [
      {
        label: shots[0].label,
        caption: `Asked plainly, it says “${right}”.`,
        ms: 3600,
      },
      {
        label: shots[1].label,
        caption: `Told “${wrong}” first, it repeats “${wrong}”.`,
        ms: 4200,
      },
      {
        label: shots[2].label,
        caption: `Told “${right}” first, it repeats that. It copies whoever spoke first.`,
        ms: 5200,
      },
    ],
    [shots, right, wrong],
  );

  const { ref, at } = useReel(steps);
  const shot = shots[at];
  const caved = shot.says.toLowerCase().startsWith(wrong.toLowerCase());

  return (
    <Reel
      steps={steps}
      at={at}
      frameRef={ref}
      tone={caved ? "bad" : "good"}
      footnote="What it says and both chances are DistilGPT-2's real output."
    >
      <p className="label text-ink-faint mb-1">You type</p>
      <p
        key={`p-${at}`}
        className="font-data bg-paper-sunk border-ink/20 mb-3 min-h-[4.5rem] rounded-[2px] border px-3 py-2 text-[0.9375rem]"
        style={{ animation: "ink-pop 0.35s ease-out both" }}
      >
        {shot.prompt}{" "}
        <span
          className={`rounded-[2px] px-1 font-bold ${
            caved
              ? "bg-pink-wash text-pink-text"
              : "bg-teal-wash text-teal-text"
          }`}
          style={{ animation: "ink-pop 0.35s ease-out 0.7s both" }}
        >
          {shot.says}
        </span>
      </p>

      <ul className="space-y-2">
        {[
          { name: right, p: shot.right, ink: "bg-teal" },
          { name: wrong, p: shot.wrong, ink: "bg-pink" },
        ].map((row) => (
          <li key={row.name} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[0.9375rem]">{row.name}</span>
            <span className="bg-paper-sunk border-ink/20 h-3.5 flex-1 overflow-hidden rounded-[1px] border">
              <span
                className={`block h-full ${row.ink} transition-[width] delay-700 duration-700 ease-out`}
                style={{ width: `${Math.max(row.p * 100, 0.5)}%` }}
              />
            </span>
            <span className="data w-12 shrink-0 text-right text-xs tabular-nums">
              {Math.round(row.p * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </Reel>
  );
}
