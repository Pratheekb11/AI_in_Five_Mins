"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { ClusterData } from "@/lib/game/clusters";

/**
 * Eighteen hundred words, recolouring as the algorithm makes up its mind.
 *
 * The dots never move. What changes is their colour, one pass at a time, from
 * the real assignment history: every word starts wherever the first pass put
 * it, and the borders between groups walk across the picture as the centres
 * shift. By the last pass nothing changes any more, which is what convergence
 * looks like and is otherwise a word in a textbook.
 *
 * The caveat is the same one the embeddings module makes and it is repeated
 * here because the picture invites the mistake: the grouping was done in all
 * fifty dimensions, and the two coordinates are a shadow. Two dots touching on
 * screen may be nowhere near each other, which is why some of the colours look
 * interleaved.
 *
 * Stages:
 *   0  the words, ungrouped
 *   1  the first pass
 *   2  a few passes in
 *   3  settled
 *   4  what the groups turned out to be
 *   5  and how much k matters
 */

const W = 640;
const H = 320;
const PAD = 16;

/** Which pass each step shows. -1 is before anything has been decided. */
const STAGE_PASS: Record<number, number> = {
  0: -1,
  1: 0,
  2: 3,
  3: -2,
  4: -2,
  5: -2,
};

const INK = [
  "fill-pink",
  "fill-blue",
  "fill-teal",
  "fill-yellow",
  "fill-pink",
  "fill-blue",
  "fill-teal",
  "fill-yellow",
];

const OPACITY = [0.95, 0.95, 0.95, 0.95, 0.45, 0.45, 0.45, 0.45];

export function ClusterFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<ClusterData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scrub, setScrub] = useState<{ stage: number; at: number }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/clusters.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ClusterData>;
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
          The groups did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the groups…</p>
      </div>
    );
  }

  const last = data.history.length - 1;
  const wanted =
    scrub && scrub.stage === stage
      ? scrub.at
      : STAGE_PASS[Math.min(stage, 5)] === -2
        ? last
        : STAGE_PASS[Math.min(stage, 5)];

  const assignment =
    wanted >= 0 ? data.history[Math.min(wanted, last)] : undefined;

  const xs = data.points.map((p) => p[0]);
  const ys = data.points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const px = (v: number) => PAD + ((v - minX) / (maxX - minX)) * (W - PAD * 2);
  const py = (v: number) => H - PAD - ((v - minY) / (maxY - minY)) * (H - PAD * 2);

  const moved =
    assignment && wanted > 0
      ? assignment.filter((c, i) => c !== data.history[wanted - 1][i]).length
      : null;

  const worst = Math.max(...data.sweep.map((s) => s.inertia));
  const bestInertia = Math.min(...data.sweep.map((s) => s.inertia));

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {data.words.length} words · no labels anywhere
        </p>
        <p className="label text-ink-faint">
          {assignment
            ? `pass ${wanted + 1} of ${data.history.length}`
            : "before it has decided anything"}
        </p>
      </div>

      <div className="px-4 py-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden>
          {data.points.map((point, i) => (
            <motion.circle
              key={i}
              cx={px(point[0])}
              cy={py(point[1])}
              r={2.4}
              className={
                assignment ? INK[assignment[i] % INK.length] : "fill-ink"
              }
              initial={false}
              animate={{
                opacity: assignment ? OPACITY[assignment[i] % OPACITY.length] : 0.3,
              }}
              transition={{ duration: still ? 0 : 0.35 }}
            />
          ))}
        </svg>

        {assignment ? (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            {wanted === 0
              ? `First pass. Every word has been handed to whichever of the ${data.k} centres it is nearest, and the centres were placed before anything was known about the words.`
              : moved === 0
                ? `Nothing moved on this pass, so the algorithm has stopped. That is the whole of what settled means: ${data.iterations} passes, and on the last one no word changed its mind.`
                : `${moved} words changed group on this pass. Every centre has shifted to the middle of whatever it collected, and some words are now nearer a different one.`}
          </p>
        ) : (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            Every word in the vocabulary, drawn at its own two coordinates.
            There are no labels here and nobody has told the algorithm what any
            of these words mean. It will be given one number, {data.k}, and asked
            to find that many groups.
          </p>
        )}

        {stage >= 4 ? (
          <motion.div
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 mt-4 border-t pt-4"
          >
            <p className="label text-ink-faint mb-2">
              What each group turned out to hold, nearest its centre first
            </p>
            <ul className="space-y-1.5">
              {data.clusters.map((cluster) => (
                <li key={cluster.id} className="text-[0.875rem]">
                  <span className="label text-ink-faint mr-2">
                    {cluster.size} words
                  </span>
                  <span className="font-data">
                    {cluster.nearest.slice(0, 8).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
              Some of those are obviously something. Some are a shrug. Both came
              out of the same procedure, and no measure of cluster quality can
              tell you which is which.
            </p>
          </motion.div>
        ) : null}

        {stage >= 5 ? (
          <motion.div
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-ink/20 mt-4 border-t pt-4"
          >
            <p className="label text-ink-faint mb-2">
              How tight the groups get as you ask for more of them
            </p>
            <svg viewBox={`0 0 ${W} 130`} className="block w-full" aria-hidden>
              <path
                d={data.sweep
                  .map((s, i) => {
                    const x = 24 + (i / (data.sweep.length - 1)) * (W - 60);
                    const yv =
                      110 - ((s.inertia - bestInertia) / (worst - bestInertia)) * 90;
                    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yv.toFixed(1)}`;
                  })
                  .join(" ")}
                className="stroke-pink fill-none"
                strokeWidth={2.5}
              />
              {data.sweep.map((s, i) => (
                <text
                  key={s.k}
                  x={24 + (i / (data.sweep.length - 1)) * (W - 60)}
                  y={126}
                  textAnchor="middle"
                  className="fill-ink-faint font-data"
                  style={{ fontSize: 9 }}
                >
                  {s.k}
                </text>
              ))}
            </svg>
            <p className="prose-measure text-ink-soft mt-2 text-[0.9375rem]">
              It always improves. Twenty groups fit the words more tightly than
              eight, and a thousand groups would fit them perfectly, one word
              each. There is no k the data can tell you to use, which is the
              honest difference between this and everything else in the track:
              with no labels there is nothing to be right about.
            </p>
          </motion.div>
        ) : null}
      </div>

      {stage >= 3 ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <label className="label text-ink-faint mb-2 block" htmlFor="pass">
            Scrub through the passes
          </label>
          <input
            id="pass"
            type="range"
            min={0}
            max={last}
            value={Math.max(0, Math.min(last, wanted))}
            onChange={(e) => setScrub({ stage, at: Number(e.target.value) })}
            className="accent-pink w-full"
          />
          <div className="label text-ink-faint flex justify-between">
            <span>first pass</span>
            <span>settled</span>
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.name}, trained on {data.source.trainedOn}. {data.note}
      </figcaption>
    </figure>
  );
}
