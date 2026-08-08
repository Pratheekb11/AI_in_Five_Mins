"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { Curve, CurveData } from "@/lib/game/curve";

/**
 * Four learning curves on one axis, arriving one at a time, and crossing.
 *
 * The axis never changes and no curve is ever removed, which is what makes the
 * crossing readable: the model that starts worst finishes best, and you can see
 * the exact amount of data at which that stops being a trade and starts being
 * obvious.
 *
 * The flat line is the argument in one stroke. A hand-written rule ignores the
 * training data entirely, so its curve is a horizontal line, and every learned
 * model spends the first few hundred examples climbing towards it. Below that
 * crossing, learning from data is worse than not bothering.
 *
 * Stages:
 *   0  the rule that ignores the data
 *   1  a small tree, learning
 *   2  twelve features, learned
 *   3  every word, learned, which starts worst
 *   4  where the curves cross
 *   5  what ten times the data is worth, at each point
 */

const W = 640;
const H = 300;
const PAD = 44;

/** How many curves are on screen at each step, in the order they arrive. */
const ORDER = ["one-rule", "tree", "twelve-features", "words"];

const STROKE: Record<string, string> = {
  "one-rule": "stroke-ink/50",
  tree: "stroke-yellow",
  "twelve-features": "stroke-blue",
  words: "stroke-pink",
};

const TEXT: Record<string, string> = {
  "one-rule": "text-ink-soft",
  tree: "text-yellow-text",
  "twelve-features": "text-blue-text",
  words: "text-pink-text",
};

export function CurveFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<CurveData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/data/curve.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<CurveData>;
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
          The curves did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the curves…</p>
      </div>
    );
  }

  const shown = ORDER.slice(0, Math.min(stage + 1, ORDER.length));
  const curves = shown
    .map((id) => data.curves.find((c) => c.id === id))
    .filter((c): c is Curve => Boolean(c));

  const all = data.curves.flatMap((c) => c.points.map((p) => p.accuracy));
  const low = Math.min(...all) - 0.01;
  const high = Math.max(...all) + 0.01;

  const sizes = data.sizes;
  const x = (size: number) =>
    PAD +
    (Math.log10(size / sizes[0]) /
      Math.log10(sizes[sizes.length - 1] / sizes[0])) *
      (W - PAD * 2);
  const y = (accuracy: number) =>
    H - PAD - ((accuracy - low) / (high - low)) * (H - PAD * 2);

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          Accuracy on the same {data.corpus.testSize} held-out messages
        </p>
        <p className="label text-ink-faint">
          training examples, across · doubling each way
        </p>
      </div>

      <div className="px-4 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label="Learning curves for four models against the number of training examples"
        >
          <line
            x1={PAD}
            y1={H - PAD}
            x2={W - PAD}
            y2={H - PAD}
            className="stroke-ink/30"
          />
          <line
            x1={PAD}
            y1={PAD - 10}
            x2={PAD}
            y2={H - PAD}
            className="stroke-ink/30"
          />

          {curves.map((curve, index) => (
            <motion.path
              key={curve.id}
              d={curve.points
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"}${x(p.size).toFixed(1)} ${y(p.accuracy).toFixed(1)}`,
                )
                .join(" ")}
              className={`fill-none ${STROKE[curve.id]}`}
              strokeWidth={curve.id === "one-rule" ? 2 : 2.5}
              strokeDasharray={curve.id === "one-rule" ? "6 4" : undefined}
              initial={still ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: still ? 0 : 0.8,
                delay: still ? 0 : index === curves.length - 1 ? 0.05 : 0,
              }}
            />
          ))}

          {curves.map((curve) =>
            curve.points.map((p) => (
              <circle
                key={`${curve.id}-${p.size}`}
                cx={x(p.size)}
                cy={y(p.accuracy)}
                r={2.6}
                className={STROKE[curve.id].replace("stroke", "fill")}
              />
            )),
          )}

          {sizes.map((size) => (
            <text
              key={size}
              x={x(size)}
              y={H - PAD + 16}
              textAnchor="middle"
              className="fill-ink-faint font-data"
              style={{ fontSize: 9 }}
            >
              {size}
            </text>
          ))}
          {[low + (high - low) * 0.08, high - (high - low) * 0.08].map((at) => (
            <text
              key={at}
              x={PAD - 6}
              y={y(at) + 3}
              textAnchor="end"
              className="fill-ink-faint font-data"
              style={{ fontSize: 9 }}
            >
              {(at * 100).toFixed(0)}%
            </text>
          ))}
        </svg>

        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {curves.map((curve) => (
            <li key={curve.id} className={`label ${TEXT[curve.id]}`}>
              {curve.name}
            </li>
          ))}
        </ul>

        <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
          {stage <= 0
            ? "A hand-written rule ignores the training data completely, so its curve is a flat line at 96.8 per cent. Everything else on this page has to earn its way up to that line."
            : stage === 1
              ? "A small tree with twenty examples is worse than the rule by thirteen points. It needs about a hundred before it catches up, and that is a model with only twelve questions to learn."
              : stage === 2
                ? "Learning from the same twelve features rather than splitting on them does better everywhere, and is already ahead of the rule at twenty examples. Same data, same features, different model."
                : stage === 3
                  ? "And here is the one that starts worst. Every word in the vocabulary is far more to learn, so at twenty examples it is at 89 per cent, seven points behind a single hand-written rule."
                  : stage === 4
                    ? "Then it crosses everything. At two thousand examples it is ahead, and at the full set it is the best model on the page. The model that needs the most data is the wrong choice until you have the data, and then it is the right one."
                    : "Which makes the argument about data against models a question with a location. Ten times the data is worth thirteen points at the left edge of this picture and a sixth of a point at the right."}
        </p>

        {stage >= 5 ? (
          <motion.div
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 mt-4 border-t pt-4"
          >
            <p className="label text-ink-faint mb-2">
              What each upgrade is worth, measured
            </p>
            <ul className="space-y-2">
              {data.rounds.map((round) => (
                <li
                  key={round.id}
                  className="flex flex-wrap items-baseline gap-x-3 text-[0.9375rem]"
                >
                  <span className="data w-24 shrink-0 font-bold">
                    {round.size} examples
                  </span>
                  <span className="text-ink-soft">
                    ten times the data{" "}
                    <span className="data text-teal-text font-bold">
                      +{(round.moreData.gain * 100).toFixed(2)}
                    </span>
                    , best other model{" "}
                    <span className="data text-blue-text font-bold">
                      +{(round.betterModel.gain * 100).toFixed(2)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.name}. {data.note} The horizontal axis is logarithmic, so
        each step along it is roughly a doubling.
      </figcaption>
    </figure>
  );
}
