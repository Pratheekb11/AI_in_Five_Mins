"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { Forest, ForestData } from "@/lib/game/forest";

/**
 * Sixty trees as sixty dots, and the line their vote draws through them.
 */

const W = 640;
const PAD = 34;

/**
 * The plot is only as tall as it needs to be.
 */
function heightFor(dots: number): number {
  return 52 + Math.min(7, Math.ceil(dots / 9)) * 12;
}

const STAGE_FOREST: Record<number, string> = {
  0: "shallow",
  1: "shallow",
  2: "shallow",
  3: "shallow",
  4: "identical",
  5: "shallow",
};

export function ForestFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<ForestData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<{ stage: number; id: string }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/forest.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ForestData>;
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
          The forests did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[10rem] p-3 sm:min-h-[18rem] sm:p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the forests…</p>
      </div>
    );
  }

  const wanted =
    picked && picked.stage === stage ? picked.id : STAGE_FOREST[stage];
  const forest: Forest =
    data.forests.find((f) => f.id === wanted) ?? data.forests[0];

  const shownTrees = stage <= 0 ? 1 : forest.trees;
  const showVote = stage >= 2;
  const showCurve = stage >= 3;

  // One axis for every forest, so switching does not silently rescale.
  const all = data.forests.flatMap((f) => [...f.alone, f.together]);
  const low = Math.min(...all) - 0.005;
  const high = Math.max(...all) + 0.005;
  const x = (v: number) => PAD + ((v - low) / (high - low)) * (W - PAD * 2);

  const example = data.examples[3] ?? data.examples[0];
  const H = heightFor(shownTrees);

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        {/* At the first step only one of them is drawn, and a heading that
            says sixty over a single dot reads as a bug. */}
        <p className="label text-ink-faint">
          {shownTrees === 1 ? `One of the ${forest.trees}` : forest.name}
        </p>
        <p className="label text-ink-faint">
          {shownTrees === 1 ? "one dot" : "each dot"} is one tree, scored on{" "}
          {data.corpus.testSize} held-out messages
        </p>
      </div>

      <div className="px-4 py-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden>
          <line
            x1={PAD}
            y1={H - 34}
            x2={W - PAD}
            y2={H - 34}
            className="stroke-ink/30"
          />

          {forest.alone.slice(0, shownTrees).map((accuracy, i) => (
            <motion.circle
              key={i}
              initial={still ? false : { opacity: 0, cy: 16 }}
              animate={{ opacity: 0.8, cy: H - 34 - 6 - (i % 7) * 9 }}
              transition={{
                duration: still ? 0 : 0.35,
                delay: still ? 0 : Math.min(0.5, i * 0.008),
              }}
              cx={x(accuracy)}
              r={3.6}
              className="fill-blue"
            />
          ))}

          {showCurve ? (
            <motion.g
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <line
                x1={x(forest.together)}
                y1={18}
                x2={x(forest.together)}
                y2={H - 26}
                className="stroke-teal"
                strokeWidth={2.5}
              />
              <text
                x={x(forest.together)}
                y={14}
                textAnchor="middle"
                className="fill-teal-text font-data"
                style={{ fontSize: 10 }}
              >
                the vote: {(forest.together * 100).toFixed(2)}%
              </text>
            </motion.g>
          ) : null}

          <text
            x={PAD}
            y={H - 12}
            className="fill-ink-faint font-data"
            style={{ fontSize: 10 }}
          >
            {(low * 100).toFixed(1)}%
          </text>
          <text
            x={W - PAD}
            y={H - 12}
            textAnchor="end"
            className="fill-ink-faint font-data"
            style={{ fontSize: 10 }}
          >
            {(high * 100).toFixed(1)}%
          </text>
        </svg>

        {showVote ? (
          <motion.div
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 mt-3 border-t pt-3"
          >
            <p className="label text-ink-faint mb-1">
              One held-out message, and how the {forest.trees} voted on it
            </p>
            <p className="font-data prose-measure mb-2 text-[0.875rem]">
              {example.text}
            </p>
            <div className="bg-paper-sunk border-ink/20 flex h-4 overflow-hidden rounded-[1px] border">
              <span
                className="bg-pink block h-full"
                style={{
                  width: `${(example.votesForSpam / data.treesPerForest) * 100}%`,
                }}
              />
              <span className="bg-blue block h-full flex-1 opacity-40" />
            </div>
            <p className="text-ink-faint mt-1 text-[0.8125rem]">
              {example.votesForSpam} of {data.treesPerForest} called it spam. It
              really was {example.spam ? "spam" : "an ordinary message"}, so the
              majority was{" "}
              {(example.votesForSpam * 2 >= data.treesPerForest ? 1 : 0) ===
              example.spam
                ? "right"
                : "wrong"}
              . A close vote is a model telling you it is not sure, in a way a
              single tree never can.
            </p>
          </motion.div>
        ) : null}

        {showCurve ? (
          <motion.div
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-ink/20 mt-3 border-t pt-3"
          >
            <p className="label text-ink-faint mb-2">
              The vote, as trees are added one at a time
            </p>
            <svg viewBox={`0 0 ${W} 110`} className="block w-full" aria-hidden>
              <path
                d={forest.running
                  .map((v, i) => {
                    const px =
                      PAD + (i / (forest.running.length - 1)) * (W - PAD * 2);
                    const py = 96 - ((v - low) / (high - low)) * 80;
                    return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
                  })
                  .join(" ")}
                className="stroke-teal fill-none"
                strokeWidth={2.5}
              />
              <line
                x1={PAD}
                y1={96 - ((forest.meanAlone - low) / (high - low)) * 80}
                x2={W - PAD}
                y2={96 - ((forest.meanAlone - low) / (high - low)) * 80}
                className="stroke-blue"
                strokeDasharray="5 4"
                strokeWidth={1.5}
              />
              <text
                x={W - PAD}
                y={104}
                textAnchor="end"
                className="fill-ink-faint font-data"
                style={{ fontSize: 9 }}
              >
                {forest.trees} trees
              </text>
              <text
                x={PAD}
                y={104}
                className="fill-ink-faint font-data"
                style={{ fontSize: 9 }}
              >
                1 tree
              </text>
            </svg>
            <p className="prose-measure text-ink-soft mt-1 text-[0.9375rem]">
              {forest.gain < 0.002
                ? "Flat, and it was always going to be flat. These sixty trees are the same tree, because nothing about how they were grown could make them differ. A vote among identical opinions returns that opinion."
                : `The dashed line is what an average single tree gets. The vote climbs past it within a handful of trees and settles ${(forest.gain * 100).toFixed(2)} points above, because two of these trees disagree on ${(forest.disagreement * 100).toFixed(1)}% of messages and their mistakes are not the same mistakes.`}
            </p>
          </motion.div>
        ) : null}

        {!showVote ? (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            {stage <= 0
              ? `One tree, four questions deep, grown on its own sample of the training messages. It gets ${(forest.alone[0] * 100).toFixed(2)}% on messages it has never seen, which is respectable and not remarkable.`
              : `Sixty of them, each grown on its own sample of the messages and allowed to choose from four questions at random at every split. They land all over: the best gets ${(forest.bestAlone * 100).toFixed(2)}% and the worst ${(forest.worstAlone * 100).toFixed(2)}%.`}
          </p>
        ) : null}
      </div>

      {stage >= 5 ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <p className="label text-ink-faint mb-2">
            Four forests, same messages, different amounts of disagreement
          </p>
          <div className="flex flex-wrap gap-2">
            {data.forests.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPicked({ stage, id: option.id })}
                className={`tap rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                  option.id === forest.id
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
        {data.source.name}. {data.note} Disagreement is measured as how often
        two trees in the same forest give different answers to the same held-out
        message.
      </figcaption>
    </figure>
  );
}
