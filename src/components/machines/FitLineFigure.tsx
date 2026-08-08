"use client";

import { motion, useReducedMotion } from "motion/react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { REGRESSION } from "@/lib/datasets";
import { gradientStep, meanSquaredError } from "@/lib/ml";

/**
 * The same training run as the hill above, seen from the data instead.
 *
 * The machine at the top of this chapter draws the error curve, which is the
 * view from inside the maths: one dial along the bottom, how wrong you are up
 * the side, and a ball rolling into the dip. This figure draws the other view,
 * the one the dial is actually about. A hundred and forty real sentences as
 * dots, characters across and tokens up, and one line swinging through them.
 *
 * They are the same event twice and the pairing is the point. The ball moving
 * a few pixels down a curve is the line swinging into the dots. Neither view
 * makes sense of the other on its own, and the walkthrough can hold one while
 * the reader has just played with the other.
 *
 * Every position is computed here from the real sentences with the same
 * `gradientStep` the game runs. Nothing is scripted: the line stops where the
 * arithmetic stops it, and where it stops is 4.083 characters per token,
 * because that is what Lewis Carroll's prose happens to be.
 *
 * Stages:
 *   0  a hundred and forty real sentences
 *   1  a first guess, and how wrong it is
 *   2  a few steps downhill
 *   3  where it settles, and what that number is
 *   4  the same procedure on half the sentences, settling somewhere else
 *
 * Stage four used to be stage three again, with a paragraph under it: the one
 * beat that says "a model's answers are downstream of the examples it was
 * shown" was the one beat where nothing moved. So it now shows exactly that.
 * The long sentences go out, the same downhill step runs on what is left, and
 * the line swings to 3.829 characters per token. Nothing is scripted there
 * either — it is the same arithmetic on a smaller pile.
 */

const { points, best, sampleSize, source } = REGRESSION;

/** Where the walkthrough starts the dial. Deliberately a poor guess. */
const START = 0.12;
/** The game's own sensible rate, so both tell the same story. */
const RATE = 0.00002;

const STEPS_BY_STAGE: Record<number, number> = { 1: 0, 2: 6 };

function slopeAfter(steps: number): number {
  let slope = START;
  for (let i = 0; i < steps; i++) slope = gradientStep(points, slope, RATE);
  return slope;
}

/**
 * The last stage refits on the shorter half of the same sentences.
 *
 * Run once, here, rather than in render: it is the same pure step the game
 * runs, two thousand times, and the answer never changes. The cut is the
 * median sentence length, so it is a property of the corpus rather than a
 * number somebody chose to make the point land.
 */
const MEDIAN_CHARS = [...points.map((p) => p.chars)].sort((a, b) => a - b)[
  Math.floor(points.length / 2)
];

const SHORT_POINTS = points.filter((p) => p.chars <= MEDIAN_CHARS);

const SHORT_SLOPE = (() => {
  let slope = START;
  for (let i = 0; i < 2000; i++) {
    slope = gradientStep(SHORT_POINTS, slope, RATE);
  }
  return slope;
})();

/** Plot box, in the SVG's own units. */
const W = 640;
const H = 300;
const PAD = 28;

const maxChars = Math.max(...points.map((p) => p.chars));
const maxTokens = Math.max(...points.map((p) => p.tokens));

const x = (chars: number) => PAD + (chars / maxChars) * (W - PAD * 2);
const y = (tokens: number) => H - PAD - (tokens / maxTokens) * (H - PAD * 2);

export function FitLineFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();

  const settled = stage >= 3;
  /* Stage four is a different pile of examples, not a different procedure. */
  const refit = stage >= 4;
  const slope = refit
    ? SHORT_SLOPE
    : settled
      ? best.slope
      : slopeAfter(STEPS_BY_STAGE[stage] ?? 0);
  const error = meanSquaredError(points, slope);
  const showLine = stage >= 1;

  // Where the line leaves the right-hand edge of the plot.
  const endTokens = slope * maxChars;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {sampleSize} real sentences · {source.title}
        </p>
        <p className="label text-ink-faint">
          characters across · tokens up the side
        </p>
      </div>

      <div className="px-4 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`A scatter plot of ${sampleSize} sentences with a fitted line at ${(1 / slope).toFixed(3)} characters per token`}
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
            y1={PAD}
            x2={PAD}
            y2={H - PAD}
            className="stroke-ink/30"
          />

          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={x(p.chars)}
              cy={y(p.tokens)}
              r={3}
              className="fill-blue"
              initial={false}
              animate={{
                opacity: refit && p.chars > MEDIAN_CHARS ? 0.1 : 0.55,
              }}
              transition={{ duration: still ? 0 : 0.5 }}
            />
          ))}

          {/* Where it had settled on all of them, kept as a ghost so the
              swing is a movement rather than a new picture. */}
          {refit ? (
            <motion.line
              x1={x(0)}
              y1={y(0)}
              x2={x(maxChars)}
              y2={y(best.slope * maxChars)}
              className="stroke-ink/30"
              strokeWidth={2}
              strokeDasharray="5 5"
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
          ) : null}

          {/* One line, never replaced. It only ever swings. */}
          {showLine ? (
            <motion.line
              x1={x(0)}
              y1={y(0)}
              initial={false}
              animate={{ x2: x(maxChars), y2: y(endTokens) }}
              transition={{ duration: still ? 0 : 0.9, ease: "easeInOut" }}
              className={settled ? "stroke-teal" : "stroke-pink"}
              strokeWidth={3}
            />
          ) : null}
        </svg>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="label text-ink-faint">
            The one dial
            <span
              className={`data ml-2 text-base font-bold ${
                settled ? "text-teal-text" : "text-pink-text"
              }`}
            >
              {showLine ? (1 / slope).toFixed(3) : "not set yet"}
            </span>
            {showLine ? " characters per token" : ""}
          </span>
          <span className="label text-ink-faint">
            How wrong it is
            <span className="data text-ink-soft ml-2 text-base tabular-nums">
              {showLine ? error.toFixed(2) : "—"}
            </span>
          </span>
        </div>

        {settled && !refit ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-3 text-[0.9375rem]"
          >
            Nobody wrote {best.charsPerToken} down. It fell out of {sampleSize}
            &nbsp;sentences of Victorian children&rsquo;s fiction, and feeding
            the same procedure different text settles it somewhere else. That is
            the whole of what training is, at every scale.
          </motion.p>
        ) : null}

        {refit ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-3 text-[0.9375rem]"
          >
            Same procedure, same starting guess, {SHORT_POINTS.length} sentences
            instead of {sampleSize}: only the ones at or under{" "}
            {MEDIAN_CHARS} characters. It settles at{" "}
            <span className="data text-teal-text font-bold">
              {(1 / SHORT_SLOPE).toFixed(3)}
            </span>{" "}
            instead of {best.charsPerToken}. The dashed line is where it had
            stopped a moment ago. Nothing about the method changed. Only what it
            was shown.
          </motion.p>
        ) : null}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {source.title} by {source.author}, {source.via}, public domain. The line
        is moved by the same downhill step the machine above runs, from the same
        starting guess, on these exact sentences.
      </figcaption>
    </figure>
  );
}
