"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ANALOGY, type Analogy } from "@/lib/analogy";
import { ordinal } from "@/lib/ordinal";

/**
 * Word arithmetic, drawn.
 *
 * The claim "you can subtract man from king and add woman" is easy to state and
 * almost impossible to believe from a list of numbers. It is obvious the moment
 * you see it: one arrow, copied, moved somewhere else, landing near a word that
 * nobody put there.
 *
 * The plane is not a flattening of the whole space, it is the plane spanned by
 * this analogy's own two difference vectors. That matters, and the figure says
 * so: the three input words and the arithmetic result lie in it exactly, so the
 * parallelogram is real rather than an artist's impression. The answer word does
 * not, and the amount by which it misses is printed rather than hidden.
 *
 * Which is the honest version of this demonstration. The arrow does not land ON
 * queen. It lands near enough that queen is the closest word in fifty thousand,
 * and the cosine underneath is what actually carries the claim.
 */

/** How long each beat holds before the next one starts. */
const BEAT_MS = 2200;

type Beat = 0 | 1 | 2 | 3;
const BEATS: Beat[] = [0, 1, 2, 3];

function useAutoBeat(count: number) {
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      setAt((n) => (n + 1 < count ? n + 1 : n));
    }, BEAT_MS);
    return () => clearTimeout(id);
  }, [playing, at, count]);

  return { at, setAt, playing, setPlaying };
}

/** Screen geometry for one analogy: where each word sits, in SVG units. */
function useLayout(row: Analogy, width: number, height: number) {
  return useMemo(() => {
    const pad = 46;
    const all = [...row.points, row.result];
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    // One scale for both axes, or the parallelogram stops being a
    // parallelogram and the whole point of the picture is lost.
    const span = Math.max(x1 - x0, y1 - y0) || 1;
    const k = (Math.min(width, height) - pad * 2) / span;

    // Centre the drawing in both axes. Anchoring it to the bottom-left left a
    // third of the frame empty above the words, which read as a bug.
    const offX = (width - (x1 - x0) * k) / 2;
    const offY = (height - (y1 - y0) * k) / 2;

    const place = (p: { x: number; y: number }) => ({
      cx: offX + (p.x - x0) * k,
      // SVG y grows downward; the maths does not.
      cy: height - offY - (p.y - y0) * k,
    });

    return { place, k };
  }, [row, width, height]);
}

const W = 620;
const H = 380;

export function AnalogyPlane() {
  const still = useReducedMotion();
  const [pick, setPick] = useState(0);
  const row = ANALOGY.analogies[pick];
  const { at, setAt, playing, setPlaying } = useAutoBeat(BEATS.length);
  const { place } = useLayout(row, W, H);

  const choose = useCallback(
    (n: number) => {
      setPick(n);
      setAt(0);
      setPlaying(true);
    },
    [setAt, setPlaying],
  );

  const point = (word: string) => row.points.find((p) => p.word === word)!;
  const A = place(point(row.a));
  const B = place(point(row.b));
  const C = place(point(row.c));
  const R = place(row.result);
  const answer = point(row.answer.word);
  const ANS = place(answer);

  /** The words drawn as dots, and when each one is allowed to appear. */
  const dots = [
    { word: row.a, at: A, from: 0, ink: "ink" as const },
    { word: row.b, at: B, from: 0, ink: "ink" as const },
    { word: row.c, at: C, from: 0, ink: "ink" as const },
    { word: row.answer.word, at: ANS, from: 3, ink: "teal" as const },
  ];

  const caption = [
    `Three words, each fifty numbers, shown on the plane their own differences span.`,
    `One arrow: whatever separates ${row.a} from ${row.b}.`,
    `The same arrow, moved to start at ${row.c}. Nothing about it changed.`,
    `It lands here. The nearest of ${ANALOGY.vocabulary.toLocaleString("en-US")} words to that point is ${row.answer.word}.`,
  ][at];

  return (
    <figure className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">
          {row.b} &minus; {row.a} + {row.c}
        </span>
        <span className="label text-ink-faint">
          beat {at + 1} of {BEATS.length}
        </span>
      </div>

      <div className="border-ink/20 flex flex-wrap gap-1.5 border-b px-4 py-3">
        {ANALOGY.analogies.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => choose(i)}
            className={`font-data rounded-[2px] border px-2.5 py-1 text-[0.8125rem] ${
              i === pick
                ? "border-ink bg-paper-raised font-bold"
                : "border-ink/25 text-ink-soft hover:border-ink"
            }`}
          >
            {a.b}&minus;{a.a}+{a.c}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto block w-full max-w-[40rem]"
          role="img"
          aria-label={`${row.b} minus ${row.a} plus ${row.c} lands nearest to ${row.answer.word}`}
        >
          <defs>
            <marker
              id="ap-head-pink"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="4.5"
              orient="auto"
            >
              <path d="M0,0 L9,4.5 L0,9 z" className="fill-pink" />
            </marker>
            <marker
              id="ap-head-blue"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="4.5"
              orient="auto"
            >
              <path d="M0,0 L9,4.5 L0,9 z" className="fill-blue" />
            </marker>
          </defs>

          {/* The parallelogram, once both arrows are down. It is exact: these
              four points really are coplanar, by construction. */}
          <motion.path
            d={`M ${A.cx} ${A.cy} L ${B.cx} ${B.cy} L ${R.cx} ${R.cy} L ${C.cx} ${C.cy} Z`}
            className="fill-blue/8 stroke-ink/20"
            strokeDasharray="4 4"
            initial={false}
            animate={{ opacity: at >= 2 ? 1 : 0 }}
            transition={{ duration: still ? 0 : 0.5 }}
          />

          {/* Arrow one: a to b. */}
          <motion.line
            x1={A.cx}
            y1={A.cy}
            x2={B.cx}
            y2={B.cy}
            className="stroke-pink"
            strokeWidth={2.5}
            markerEnd="url(#ap-head-pink)"
            initial={false}
            animate={{ pathLength: at >= 1 ? 1 : 0, opacity: at >= 1 ? 1 : 0 }}
            transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
          />

          {/* Arrow two: the same displacement, translated to c. This is the
              whole idea, so it is animated as a move rather than drawn afresh,
              it slides from the first arrow's position to the second. */}
          <motion.line
            x1={A.cx}
            y1={A.cy}
            x2={B.cx}
            y2={B.cy}
            className="stroke-blue"
            strokeWidth={2.5}
            markerEnd="url(#ap-head-blue)"
            initial={false}
            animate={{
              opacity: at >= 2 ? 1 : 0,
              x: at >= 2 ? C.cx - A.cx : 0,
              y: at >= 2 ? C.cy - A.cy : 0,
            }}
            transition={{
              duration: still ? 0 : 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
          />

          {/* Where the arithmetic actually lands. */}
          <motion.circle
            cx={R.cx}
            cy={R.cy}
            r={7}
            className="fill-blue"
            initial={false}
            animate={{ opacity: at >= 2 ? 1 : 0, scale: at >= 2 ? 1 : 0.2 }}
            style={{ transformOrigin: `${R.cx}px ${R.cy}px` }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />

          {/* The gap between the answer and the arithmetic, drawn, not hidden,
              because the arrow does not land on the word. */}
          <motion.line
            x1={R.cx}
            y1={R.cy}
            x2={ANS.cx}
            y2={ANS.cy}
            className="stroke-teal"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            initial={false}
            animate={{ opacity: at >= 3 ? 1 : 0 }}
            transition={{ duration: still ? 0 : 0.4 }}
          />

          {dots.map((d) => (
            <motion.g
              key={d.word}
              initial={false}
              animate={{ opacity: at >= d.from ? 1 : 0 }}
              transition={{ duration: still ? 0 : 0.4 }}
            >
              <circle
                cx={d.at.cx}
                cy={d.at.cy}
                r={5.5}
                className={d.ink === "teal" ? "fill-teal" : "fill-ink"}
              />
              <text
                x={d.at.cx + 10}
                /* The answer sits right beside the arrowhead, so its label goes
                   below the dot instead of above it, where the two collided. */
                y={d.at.cy + (d.ink === "teal" ? 20 : -9)}
                className={`font-data text-[15px] ${
                  d.ink === "teal" ? "fill-teal-text" : "fill-ink"
                }`}
              >
                {d.word}
              </text>
            </motion.g>
          ))}
        </svg>

        <p
          className="border-ink/20 mt-2 min-h-[3.25rem] border-t pt-3 text-[1.0625rem]"
          aria-live="polite"
        >
          {caption}
        </p>

        {/* The numbers, which are what the claim actually rests on. */}
        <div className="border-ink/20 bg-paper-sunk mt-3 rounded-[2px] border p-4">
          {at >= 3 ? (
            <>
              <p className="mb-2 text-[0.9375rem]">
                <span className="font-data bg-teal-wash text-teal-text rounded-[2px] px-1.5 py-0.5 font-bold">
                  {row.answer.word}
                </span>{" "}
                &middot; cosine{" "}
                <span className="data tabular-nums">
                  {row.answer.similarity.toFixed(3)}
                </span>
                {row.expect && row.expect !== row.answer.word ? (
                  <>
                    {" "}
                    . And note that it is not{" "}
                    <span className="font-data">{row.expect}</span>, which comes{" "}
                    {ordinal(row.expectedRank ?? 0)} at{" "}
                    {row.expectedSimilarity?.toFixed(3)}.
                  </>
                ) : null}
              </p>
              <p className="text-ink-soft text-[0.875rem]">
                The dashed teal line is the gap: {row.answer.word} sits{" "}
                {answer.offPlane.toFixed(2)} away from this plane entirely. The
                arrow does not land on the word. It lands close enough that the
                word is the nearest of{" "}
                {ANALOGY.vocabulary.toLocaleString("en-US")}. Without the usual
                convention of excluding the three input words, the nearest is{" "}
                <span className="font-data">{row.unfiltered.word}</span>.
              </p>
            </>
          ) : (
            <p className="text-ink-soft text-[0.9375rem]">{row.teaches}</p>
          )}
        </div>

        <div className="border-ink/20 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-ink-faint text-[0.8125rem]">
            {ANALOGY.source.name}, measured. Not an illustration.
          </p>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={at >= BEATS.length - 1}
              className="plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setAt((n) => Math.min(BEATS.length - 1, n + 1));
              }}
              disabled={at >= BEATS.length - 1}
              className="plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              Next beat
            </button>
            <button
              type="button"
              onClick={() => {
                setAt(0);
                setPlaying(true);
              }}
              className="plate hover:border-ink px-3 py-1.5 text-[0.875rem]"
            >
              Replay
            </button>
          </span>
        </div>
      </div>
    </figure>
  );
}
