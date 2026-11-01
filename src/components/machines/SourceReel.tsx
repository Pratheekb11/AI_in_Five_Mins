"use client";

import { useMemo } from "react";
import { Reel, useReel, type ReelStep } from "./Reel";

/**
 * Chapter 6, played rather than read. One question asked cold, the same
 * question with the source pasted in front of it, then a sum that no source
 * can help with. Every bar and reply is measured, from `provenance.json`.
 */

export function SourceReel({
  question,
  fact,
  options,
  cold,
  sourced,
  sum,
}: {
  question: string;
  fact: string;
  options: string[];
  /** Each option's share of the four, asked cold. */
  cold: number[];
  /** The same, with the source sentence pasted in first. */
  sourced: number[];
  sum: { prompt: string; truth: string; said: string };
}) {
  const pickOf = (xs: number[]) =>
    xs.reduce((best, x, i) => (x > xs[best] ? i : best), 0);
  const coldPick = options[pickOf(cold)];
  const sourcedPick = options[pickOf(sourced)];

  const steps = useMemo<ReelStep[]>(
    () => [
      {
        label: "Cold",
        caption: `Asked cold, it says “${coldPick}”. It guessed.`,
        ms: 4200,
      },
      {
        label: "With a source",
        caption: `Paste the source in and it says “${sourcedPick}”. It only needed something to read.`,
        ms: 4600,
      },
      {
        label: "A sum",
        caption: `No source helps here. It writes “${sum.said}”. A sum needs a calculator.`,
        ms: 4600,
      },
    ],
    [coldPick, sourcedPick, sum.said],
  );

  const { ref, at } = useReel(steps);
  const shares = at === 1 ? sourced : cold;
  const pick = pickOf(shares);

  return (
    <Reel
      steps={steps}
      at={at}
      frameRef={ref}
      tone={at === 1 ? "good" : "bad"}
      footnote="Bars are DistilGPT-2's own measured rating of each answer, as a share of these four."
    >
      {at < 2 ? (
        <>
          <p className="label text-ink-faint mb-1">You type</p>
          <div className="font-data bg-paper-sunk border-ink/20 mb-3 rounded-[2px] border px-3 py-2 text-[0.9375rem]">
            <p
              className={`transition-all duration-500 ${
                at === 1
                  ? "bg-yellow-wash mb-1 max-h-20 opacity-100"
                  : "max-h-0 overflow-hidden opacity-0"
              }`}
            >
              {fact}
            </p>
            <p>{question} ___</p>
          </div>
          <ul className="space-y-2">
            {options.map((o, i) => (
              <li key={o} className="flex items-center gap-3">
                <span className="w-[42%] shrink-0 truncate text-[0.9375rem] sm:w-44">
                  {o}
                </span>
                <span className="bg-paper-sunk border-ink/20 h-3.5 flex-1 overflow-hidden rounded-[1px] border">
                  <span
                    className={`block h-full transition-[width] duration-700 ease-out ${
                      i === pick
                        ? i === 0
                          ? "bg-teal"
                          : "bg-pink"
                        : "bg-ink/30"
                    }`}
                    style={{ width: `${Math.max(shares[i] * 100, 0.5)}%` }}
                  />
                </span>
                <span className="data w-10 shrink-0 text-right text-xs tabular-nums">
                  {Math.round(shares[i] * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex min-h-[11rem] flex-col items-center justify-center gap-3">
          <p className="font-data text-3xl font-bold">
            {sum.prompt}{" "}
            <span
              className="bg-pink-wash text-pink-text rounded-[2px] px-2"
              style={{ animation: "ink-pop 0.35s ease-out 0.6s both" }}
            >
              {sum.said}
            </span>
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            The answer is {sum.truth}.
          </p>
        </div>
      )}
    </Reel>
  );
}
