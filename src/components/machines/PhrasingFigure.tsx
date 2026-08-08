"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import {
  bareOf,
  type ListenData,
  type ListenRound,
  type Style,
  type Variant,
} from "@/lib/game/listen";

/**
 * Five ways of asking for the same thing, measured, on one set of bars that
 * never gets redrawn.
 *
 * The rows are all present from the first step. What changes is how much of
 * each one has been measured, so the figure reads as evidence arriving rather
 * than as four separate charts. That matters most at the last step, where the
 * worked example does not nudge the bar along, it runs off the end of the
 * scale, and the only reason that lands is that the other four bars are still
 * sitting there unchanged for comparison.
 *
 * Every probability is DistilGPT-2 scoring the wanted answer against the exact
 * prompt printed beside it. The prompt text is shown because the phrasing is
 * the lesson: a bar you cannot reproduce teaches nothing.
 *
 * A caveat the page states plainly: this is a base model, so instructions
 * genuinely do work better on the assistants people actually use. What is
 * measured here is the floor.
 *
 * Stages:
 *   0  the bare question, and the odds it gets you
 *   1  a role to play, which is the one people believe in
 *   2  an instruction about how to answer
 *   3  the same thing shown as a pattern
 *   4  every goal, so it is not one lucky example
 */

const ORDER: Style[] = ["bare", "role", "request", "pattern"];

const REVEALED_BY_STAGE: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 4,
};

function variantOf(round: ListenRound, style: Style): Variant | undefined {
  return round.variants.find((v) => v.style === style);
}

export function PhrasingFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<ListenData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<{ stage: number; id: string }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/listen.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ListenData>;
      })
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="plate-flush p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          The measurements did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the measurements…
        </p>
      </div>
    );
  }

  const round =
    (picked && picked.stage === stage
      ? data.rounds.find((r) => r.id === picked.id)
      : undefined) ?? data.rounds[0];

  const revealed = REVEALED_BY_STAGE[Math.min(stage, 4)] ?? 1;
  const shown = ORDER.slice(0, revealed);

  const bare = bareOf(round);
  const rows = shown
    .map((style) => ({ style, variant: variantOf(round, style) }))
    .filter((r): r is { style: Style; variant: Variant } => Boolean(r.variant));

  const widest = Math.max(...rows.map((r) => r.variant.probability), 0.000001);
  const newest = shown[shown.length - 1];

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 border-b px-4 py-3">
        <p className="label text-ink-faint mb-1">What you want out of it</p>
        <p className="text-[0.9375rem] font-semibold">{round.goal}</p>
      </div>

      <div className="px-4 py-4">
        <ul className="space-y-3">
          {rows.map(({ style, variant }) => {
            const times =
              bare && bare.probability > 0
                ? variant.probability / bare.probability
                : 1;
            const isNew = style === newest && stage < 4;
            const isPattern = style === "pattern";

            return (
              <motion.li
                key={style}
                layout={!still}
                initial={still ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`rounded-[2px] border px-3 py-2.5 ${
                  isNew ? "border-ink bg-paper-sunk" : "border-ink/20"
                }`}
              >
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-[0.875rem] font-semibold">
                    {data.styles[style]}
                  </span>
                  <span
                    className={`data text-xs tabular-nums ${
                      isPattern ? "text-teal-text font-bold" : "text-ink-soft"
                    }`}
                  >
                    {(variant.probability * 100).toFixed(2)}%
                    {style === "bare"
                      ? ""
                      : ` · ${times.toFixed(times >= 10 ? 0 : 2)}×`}
                  </span>
                </div>

                <span className="bg-paper-sunk border-ink/20 mb-2 block h-3 overflow-hidden rounded-[1px] border">
                  <motion.span
                    className={`block h-full ${
                      isPattern ? "bg-teal" : "bg-yellow"
                    }`}
                    initial={still ? false : { width: 0 }}
                    animate={{
                      width: `${(variant.probability / widest) * 100}%`,
                    }}
                    transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
                  />
                </span>

                <p className="font-data text-ink-faint text-[0.75rem] whitespace-pre-wrap">
                  {variant.prompt}
                </p>
              </motion.li>
            );
          })}
        </ul>

        {stage >= 3 ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-4 text-[0.9375rem]"
          >
            Showing it the shape of the answer wins by a margin nothing else
            gets near. Across all {data.rounds.length} goals the median is{" "}
            {data.summary
              .find((s) => s.style === "pattern")
              ?.medianTimesBare.toFixed(0)}
            × the bare question, and it takes every single goal. The role-play
            phrasing manages{" "}
            {data.summary.find((s) => s.style === "role")?.medianTimesBare}×,
            which is to say nothing at all.
          </motion.p>
        ) : null}
      </div>

      {stage >= 4 ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <p className="label text-ink-faint mb-2">
            Try another goal. It holds on all {data.rounds.length}.
          </p>
          <div className="flex flex-wrap gap-2">
            {data.rounds.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPicked({ stage, id: option.id })}
                className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                  option.id === round.id
                    ? "border-ink bg-paper-sunk font-semibold"
                    : "border-ink/25 hover:border-ink"
                }`}
              >
                {option.id}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.model.name} scoring the wanted answer against each prompt exactly
        as printed. It is a base model with no instruction training, so polite
        instructions really do work better on the assistants you use. This is
        the floor, and the pattern result is the part that carries over.
      </figcaption>
    </figure>
  );
}
