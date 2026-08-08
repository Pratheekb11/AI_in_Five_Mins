"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { CrossvalData, CvModel } from "@/lib/game/crossval";

/**
 * Ten blocks, and the held-out one walking along them.
 *
 * The corpus is drawn once as ten blocks and never redrawn. What moves is which
 * block is the held-out one, and it moves one place per step, which is the
 * whole procedure done in front of the reader rather than described. Each time
 * it moves, that fold's accuracy drops onto the axis underneath and stays
 * there, so the spread accumulates in view.
 *
 * The point of the figure is the last thing that happens: ten dots that do not
 * sit on top of each other. A single 80/20 split gives you one of those dots,
 * chosen by which slice you happened to hold out, and reports it as though it
 * were the model.
 *
 * Every accuracy is measured, ten separate trainings per model.
 *
 * Stages:
 *   0  one split, one number
 *   1  a different split, a different number
 *   2  every block takes its turn
 *   3  the spread, and what the average is worth
 *   4  a model with much more of it
 *   5  any of the seven
 */

const W = 640;
const AXIS_H = 150;
const PAD = 34;

const STAGE_MODEL: Record<number, string> = {
  0: "learned",
  1: "learned",
  2: "learned",
  3: "learned",
  4: "nb-80",
  5: "learned",
};

/** How many folds have been run by this step. */
function foldsShown(stage: number, total: number): number {
  if (stage <= 0) return 1;
  if (stage === 1) return 2;
  return total;
}

export function FoldsFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<CrossvalData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<{ stage: number; id: string }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/crossval.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<CrossvalData>;
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
          The folds did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the folds…</p>
      </div>
    );
  }

  const wanted = picked && picked.stage === stage ? picked.id : STAGE_MODEL[stage];
  const model: CvModel =
    data.models.find((m) => m.id === wanted) ?? data.models[0];

  const total = data.corpus.folds;
  const shown = foldsShown(stage, total);
  const held = Math.min(shown, total) - 1;
  const done = model.folds.slice(0, shown);

  // The axis spans every fold of every model, so switching models does not
  // silently rescale and make one model's spread look like another's.
  const all = data.models.flatMap((m) => m.folds.map((f) => f.accuracy));
  const low = Math.min(...all) - 0.01;
  const high = Math.max(...all) + 0.01;

  const x = (accuracy: number) =>
    PAD + ((accuracy - low) / (high - low)) * (W - PAD * 2);

  const blockW = (W - PAD * 2) / total;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">{model.name}</p>
        <p className="label text-ink-faint">
          {data.corpus.total} messages · {total} blocks of about{" "}
          {data.corpus.blockSize}
        </p>
      </div>

      <div className="px-4 py-4">
        {/* The blocks. One of them is held out, and it walks. */}
        <svg viewBox={`0 0 ${W} 54`} className="block w-full" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <rect
              key={i}
              x={PAD + i * blockW + 1.5}
              y={10}
              width={blockW - 3}
              height={30}
              rx={2}
              className={i === held ? "fill-pink" : "fill-blue"}
              opacity={i === held ? 1 : 0.35}
            />
          ))}
          <motion.rect
            initial={false}
            animate={{ x: PAD + held * blockW }}
            transition={{ duration: still ? 0 : 0.5, ease: "easeInOut" }}
            y={6}
            width={blockW}
            height={38}
            rx={3}
            className="fill-none stroke-ink"
            strokeWidth={2}
          />
        </svg>
        <p className="label text-ink-faint mb-4">
          <span className="text-pink-text">pink block is held out</span> · the
          other nine train the model
        </p>

        {/* The results. Each fold's dot lands and stays. */}
        <svg viewBox={`0 0 ${W} ${AXIS_H}`} className="block w-full" aria-hidden>
          <line
            x1={PAD}
            y1={AXIS_H - 30}
            x2={W - PAD}
            y2={AXIS_H - 30}
            className="stroke-ink/30"
          />

          {stage >= 3 ? (
            <motion.rect
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              x={x(model.mean - model.sd)}
              y={30}
              width={Math.max(2, x(model.mean + model.sd) - x(model.mean - model.sd))}
              height={AXIS_H - 60}
              className="fill-teal"
              opacity={0.18}
            />
          ) : null}

          {done.map((fold, i) => (
            <motion.circle
              key={fold.fold}
              initial={still ? false : { opacity: 0, cy: 20 }}
              animate={{ opacity: 1, cy: AXIS_H - 30 - 6 - (i % 5) * 11 }}
              transition={{ duration: still ? 0 : 0.4, delay: still ? 0 : i * 0.05 }}
              cx={x(fold.accuracy)}
              r={4}
              className="fill-pink"
            />
          ))}

          {stage >= 3 ? (
            <motion.line
              initial={false}
              animate={{ x1: x(model.mean), x2: x(model.mean) }}
              y1={26}
              y2={AXIS_H - 26}
              className="stroke-teal"
              strokeWidth={2}
            />
          ) : null}

          {/* Two ticks only. A third at the mean collides with the right-hand
              one whenever the model is a good one, which is most of them. */}
          {[low + (high - low) * 0.08, high - (high - low) * 0.08].map(
            (at, i) => (
              <text
                key={i}
                x={x(at)}
                y={AXIS_H - 12}
                textAnchor="middle"
                className="fill-ink-faint font-data"
                style={{ fontSize: 10 }}
              >
                {(at * 100).toFixed(1)}%
              </text>
            ),
          )}

          {stage >= 3 ? (
            <text
              x={x(model.mean)}
              y={20}
              textAnchor="middle"
              className="fill-teal-text font-data"
              style={{ fontSize: 10 }}
            >
              average {(model.mean * 100).toFixed(2)}%
            </text>
          ) : null}
        </svg>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="label text-ink-faint">
            {shown === 1
              ? "This one split says"
              : shown === 2
                ? "The second split says"
                : `Average of all ${total}`}
            <span className="data text-ink ml-2 text-base font-bold tabular-nums">
              {shown <= 2
                ? `${(done[done.length - 1].accuracy * 100).toFixed(1)}%`
                : `${(model.mean * 100).toFixed(2)}%`}
            </span>
          </span>
          {stage >= 3 ? (
            <span className="label text-ink-faint">
              Spread between slices
              <span className="data text-teal-text ml-2 text-base font-bold tabular-nums">
                ± {(model.sd * 100).toFixed(2)}
              </span>
            </span>
          ) : null}
        </div>

        <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
          {stage <= 0
            ? "Hold out one block, train on the other nine, and score. One number, and the number everybody reports."
            : stage === 1
              ? "Now hold out a different block instead. Same model, same procedure, same corpus, and the number has moved. Neither of these two is wrong."
              : stage === 2
                ? "So let every block take its turn. Ten trainings, ten scores, and none of them is the model's accuracy. Together they are something better: a sense of how much this number wobbles."
                : stage === 3
                  ? `The average is ${(model.mean * 100).toFixed(2)}% and the slices sit about ${(model.sd * 100).toFixed(2)} points either side of it. Any comparison between two models closer than that cannot be settled by one split.`
                  : stage === 4
                    ? "And a model trained on far too little wobbles far more. Small training sets do not only make a model worse, they make its measured score less trustworthy at the same time."
                    : "Try the others. The spread is a property of the model and the data together, not a fixed feature of the corpus."}
        </p>
      </div>

      {stage >= 5 ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <p className="label text-ink-faint mb-2">
            Seven models, same ten blocks
          </p>
          <div className="flex flex-wrap gap-2">
            {data.models.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPicked({ stage, id: option.id })}
                className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                  option.id === model.id
                    ? "border-ink bg-paper-sunk font-semibold"
                    : "border-ink/25 hover:border-ink"
                }`}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.name}. {data.corpus.note} Every dot is a separate training
        run scored on messages that training never saw.
      </figcaption>
    </figure>
  );
}
