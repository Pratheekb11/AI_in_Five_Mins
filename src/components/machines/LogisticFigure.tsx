"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { LogisticData, Snapshot } from "@/lib/game/logistic";

/**
 * Every message as a point, and one line swinging into place among them.
 */

const W = 620;
const H = 320;
const PAD = 38;

const STAGE_SNAPSHOT: Record<number, number> = {
  0: -1,
  1: 0,
  2: 6,
  3: -2,
  4: -2,
  5: -2,
};

export function LogisticFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<LogisticData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scrub, setScrub] = useState<{ stage: number; at: number }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/logistic.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<LogisticData>;
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
      <div className="plate-flush min-h-[10rem] p-3 sm:min-h-[18rem] sm:p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the measurements…
        </p>
      </div>
    );
  }

  const last = data.snapshots.length - 1;
  const wanted =
    scrub && scrub.stage === stage
      ? scrub.at
      : STAGE_SNAPSHOT[Math.min(stage, 5)] === -2
        ? last
        : STAGE_SNAPSHOT[Math.min(stage, 5)];

  const snapshot: Snapshot | undefined =
    wanted >= 0 ? data.snapshots[Math.min(wanted, last)] : undefined;

  const maxLength = Math.max(...data.points.map((p) => p[0]));
  const maxDigits = Math.max(...data.points.map((p) => p[1]));

  const x = (length: number) => PAD + (length / maxLength) * (W - PAD * 2);
  const y = (digits: number) => H - PAD - (digits / maxDigits) * (H - PAD * 2);

  /**
   * Where the boundary crosses the plot.
   *
   * The model works in standardised units, so the line is solved in those and
   * converted back: bias + wl·x + wd·y = 0, read as digits for a given length.
   */
  const digitsAt = (length: number, s: Snapshot) => {
    const xs = (length - data.scaling.length.mean) / data.scaling.length.sd;
    if (s.digits === 0) return Number.NaN;
    const ys = -(s.bias + s.length * xs) / s.digits;
    return ys * data.scaling.digits.sd + data.scaling.digits.mean;
  };

  const boundary = snapshot
    ? [0, maxLength].map((length) => ({
        x: x(length),
        y: y(digitsAt(length, snapshot)),
      }))
    : null;

  const showSigmoid = stage >= 4;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {data.corpus.testSize} held-out messages · length across, digits up
        </p>
        <p className="label text-ink-faint">
          <span className="text-pink-text">pink is spam</span> ·{" "}
          <span className="text-blue-text">blue is ordinary</span>
        </p>
      </div>

      <div className="px-4 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label="Held-out messages plotted by length and digit count, with the fitted decision boundary"
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

          {data.points.map(([length, digits, spam], i) => (
            <circle
              key={i}
              cx={x(length)}
              cy={y(digits)}
              r={2.6}
              className={spam ? "fill-pink" : "fill-blue"}
              opacity={0.55}
            />
          ))}

          {boundary ? (
            <motion.line
              initial={false}
              animate={{
                x1: boundary[0].x,
                y1: boundary[0].y,
                x2: boundary[1].x,
                y2: boundary[1].y,
              }}
              transition={{ duration: still ? 0 : 0.7, ease: "easeInOut" }}
              className="stroke-ink"
              strokeWidth={2.5}
            />
          ) : null}

          <text
            x={W - PAD}
            y={H - 10}
            textAnchor="end"
            className="fill-ink-faint font-data"
            style={{ fontSize: 10 }}
          >
            {maxLength} characters
          </text>
          <text
            x={PAD - 6}
            y={PAD}
            textAnchor="end"
            className="fill-ink-faint font-data"
            style={{ fontSize: 10 }}
          >
            {maxDigits}
          </text>
        </svg>

        {snapshot ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="label text-ink-faint">
              Step
              <span className="data text-ink ml-2 text-base font-bold tabular-nums">
                {snapshot.step}
              </span>
            </span>
            <span className="label text-ink-faint">
              Accuracy on held-out messages
              <motion.span
                key={snapshot.step}
                initial={still ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="data text-teal-text ml-2 text-base font-bold tabular-nums"
              >
                {(snapshot.testAccuracy * 100).toFixed(1)}%
              </motion.span>
            </span>
            <span className="label text-ink-faint">
              How wrong it is
              <span className="data text-ink-soft ml-2 text-base tabular-nums">
                {snapshot.trainLoss.toFixed(3)}
              </span>
            </span>
          </div>
        ) : (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            Every held-out message, placed by two numbers anybody can read off
            it: how long it is, and how many digits it contains. The spam is
            mostly up and to the right, and there is no line drawn yet because
            nothing has been trained.
          </p>
        )}

        {showSigmoid ? (
          <motion.div
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 mt-4 border-t pt-4"
          >
            <p className="label text-ink-faint mb-2">
              And distance from that line, turned into a probability
            </p>
            <svg viewBox="0 0 620 140" className="block w-full" aria-hidden>
              <line
                x1={20}
                y1={120}
                x2={600}
                y2={120}
                className="stroke-ink/30"
              />
              <line
                x1={310}
                y1={16}
                x2={310}
                y2={126}
                className="stroke-ink/25"
                strokeDasharray="4 4"
              />
              <path
                d={Array.from({ length: 120 }, (_, i) => {
                  const z = -6 + (i / 119) * 12;
                  const p = 1 / (1 + Math.exp(-z));
                  const px = 20 + ((z + 6) / 12) * 580;
                  const py = 120 - p * 100;
                  return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
                }).join(" ")}
                className="stroke-teal fill-none"
                strokeWidth={2.5}
              />
              <text
                x={20}
                y={136}
                className="fill-ink-faint font-data"
                style={{ fontSize: 10 }}
              >
                well below the line
              </text>
              <text
                x={310}
                y={136}
                textAnchor="middle"
                className="fill-ink-faint font-data"
                style={{ fontSize: 10 }}
              >
                on the line: 50%
              </text>
              <text
                x={600}
                y={136}
                textAnchor="end"
                className="fill-ink-faint font-data"
                style={{ fontSize: 10 }}
              >
                well above it
              </text>
            </svg>
            <p className="prose-measure text-ink-soft mt-2 text-[0.9375rem]">
              A message sitting exactly on the line gets fifty per cent. Move
              away from it and the curve flattens quickly towards nought or one,
              which is why so few messages come back with a middling score. The
              line answers yes or no. The curve is what turns that into how
              sure.
            </p>
          </motion.div>
        ) : null}
      </div>

      {stage >= 5 ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <label className="label text-ink-faint mb-2 block" htmlFor="step">
            Scrub through the training run
          </label>
          <input
            id="step"
            type="range"
            min={0}
            max={last}
            value={Math.max(0, Math.min(last, wanted))}
            onChange={(e) => setScrub({ stage, at: Number(e.target.value) })}
            className="accent-pink w-full"
          />
          <div className="label text-ink-faint flex justify-between">
            <span>step 0</span>
            <span>step {data.snapshots[last].step}</span>
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.name}. {data.model.name}, trained by gradient descent for{" "}
        {data.model.steps} steps on {data.corpus.trainSize} messages. Every line
        position is the real weights at that step, and the accuracy beside it is
        measured on the {data.corpus.testSize} messages it never saw.
      </figcaption>
    </figure>
  );
}
