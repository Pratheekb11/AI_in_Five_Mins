"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { levelOf, type TreeData, type TreeNode } from "@/lib/game/tree";

/**
 * The tree, growing one level per step.
 *
 * Every node is a pile of real messages drawn as a bar: pink is the share of it
 * that is spam. The root is nearly all blue with a pink corner, and each split
 * pushes the pink into one child and out of the other. Watching the colour
 * separate is the whole idea of a tree, and it is the same idea as the first
 * module of this track, applied again to each pile it creates.
 *
 * Nothing is redrawn between steps: the levels already on screen stay exactly
 * where they were while the next one arrives underneath.
 *
 * The last step leaves the tree for the accuracy curve, because the honest
 * finding here is a mild one. With twelve yes-or-no questions to draw on, this
 * tree cannot overfit dramatically: held-out accuracy climbs to depth five and
 * then flattens rather than collapsing. Capacity is limited by the features,
 * and the page says so instead of pretending to a textbook collapse.
 *
 * Stages:
 *   0  one pile, mixed
 *   1  the first question
 *   2  and again on both piles
 *   3  a third level
 *   4  four levels down
 *   5  what depth is worth, measured
 */

const W = 660;
const ROW_H = 62;

function Node({
  node,
  x,
  width,
  still,
}: {
  node: TreeNode;
  x: number;
  width: number;
  still: boolean | null;
}) {
  return (
    <motion.g
      initial={still ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <rect
        x={x}
        y={0}
        width={width}
        height={16}
        rx={2}
        className="fill-blue"
        opacity={0.35}
      />
      <rect
        x={x}
        y={0}
        width={Math.max(1, width * node.purity)}
        height={16}
        rx={2}
        className="fill-pink"
      />
      {/* A label only where there is room for one. Narrow piles would print
          their counts on top of their neighbour's, and four levels down the
          piles get very narrow indeed. */}
      {width >= 74 ? (
        <text
          x={x}
          y={30}
          className="fill-ink-faint font-data"
          style={{ fontSize: 9 }}
        >
          {node.size} · {(node.purity * 100).toFixed(0)}% spam
        </text>
      ) : null}
    </motion.g>
  );
}

export function TreeFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<TreeData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/data/tree.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<TreeData>;
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
          The tree did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the tree…</p>
      </div>
    );
  }

  const levels = Math.min(stage, 4);
  const showCurve = stage >= 5;

  const rows = Array.from({ length: levels + 1 }, (_, depth) =>
    levelOf(data.tree, depth),
  ).filter((row) => row.length > 0);

  const asked: string[] = [];
  let cursor: TreeNode | undefined = data.tree;
  for (let i = 0; i < levels && cursor?.label; i++) {
    asked.push(cursor.label);
    cursor = cursor.yes;
  }

  const height = rows.length * ROW_H;
  const worstTest = Math.max(...data.depths.map((d) => d.trainAccuracy));
  const bestShown = Math.min(...data.depths.map((d) => d.testAccuracy)) - 0.005;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {levels === 0
            ? "Every training message, in one pile"
            : `${levels} question${levels === 1 ? "" : "s"} deep`}
        </p>
        <p className="label text-ink-faint">
          <span className="text-pink-text">pink is spam</span> · bar width is
          how many messages
        </p>
      </div>

      <div className="px-4 py-4">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="block w-full"
          role="img"
          aria-label={`A decision tree grown ${levels} levels deep on the training messages`}
        >
          {rows.map((row, depth) => {
            const total = row.reduce((sum, node) => sum + node.size, 0);
            let at = 0;
            return (
              <g key={depth} transform={`translate(0 ${depth * ROW_H})`}>
                {row.map((node, i) => {
                  const width = Math.max(3, (node.size / total) * (W - 8) - 4);
                  const x = at;
                  at += width + 4;
                  return (
                    <Node
                      key={`${depth}-${i}`}
                      node={node}
                      x={x}
                      width={width}
                      still={still}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {asked.length ? (
          <ol className="mt-3 space-y-1">
            {asked.map((label, i) => (
              <li key={label} className="text-[0.9375rem]">
                <span className="label text-ink-faint mr-2">{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        ) : (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            {data.corpus.trainSize} training messages,{" "}
            {data.corpus.spamInTrain} of them spam. One pile, thoroughly mixed.
            A tree does exactly what the first module of this track did, and
            then does it again to each pile it produces.
          </p>
        )}

        {showCurve ? (
          <motion.div
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 mt-4 border-t pt-4"
          >
            <p className="label text-ink-faint mb-2">
              What each extra level is worth, measured
            </p>
            <svg viewBox={`0 0 ${W} 150`} className="block w-full" aria-hidden>
              {(["trainAccuracy", "testAccuracy"] as const).map((key) => (
                <path
                  key={key}
                  d={data.depths
                    .map((d, i) => {
                      const px =
                        20 + (i / (data.depths.length - 1)) * (W - 60);
                      const py =
                        130 -
                        ((d[key] - bestShown) / (worstTest - bestShown)) * 110;
                      return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
                    })
                    .join(" ")}
                  className={`fill-none ${
                    key === "trainAccuracy" ? "stroke-blue" : "stroke-pink"
                  }`}
                  strokeWidth={2}
                />
              ))}
              {data.depths.map((d, i) => (
                <text
                  key={d.depth}
                  x={20 + (i / (data.depths.length - 1)) * (W - 60)}
                  y={146}
                  textAnchor="middle"
                  className="fill-ink-faint font-data"
                  style={{ fontSize: 9 }}
                >
                  {d.depth}
                </text>
              ))}
            </svg>
            <p className="prose-measure text-ink-soft mt-2 text-[0.9375rem]">
              <span className="text-blue-text">Blue</span> is accuracy on the
              messages it grew from, <span className="text-pink-text">pink</span>{" "}
              on the ones it never saw. Held-out accuracy peaks at depth{" "}
              {data.best.depth} with {(data.best.testAccuracy * 100).toFixed(2)}%
              and then goes flat rather than falling off a cliff. This tree only
              has twelve questions to draw on, so there is a limit to how much
              of the training data it can memorise. Capacity is set by the
              features, not only by the depth.
            </p>
          </motion.div>
        ) : null}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.name}. {data.note} Grown on {data.corpus.trainSize} training
        messages and scored on the {data.corpus.testSize} held out, on the same
        seeded split the rest of the site uses.
      </figcaption>
    </figure>
  );
}
