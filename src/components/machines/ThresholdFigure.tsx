"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { ThresholdData } from "@/lib/game/threshold";

/**
 * Every held-out message as a dot, placed where the model actually put it, and
 * one line moving through them.
 */

/** Everything below this is drawn at the left edge. */
const FLOOR = 1e-12;

const STAGE_THRESHOLD: Record<number, number> = {
  0: 0,
  1: 0.5,
  2: FLOOR,
  3: 0.999999,
  4: 0.5,
  5: 0.5,
};

const W = 680;
const H = 220;
const PAD = 26;

function xOf(p: number): number {
  const clamped = Math.min(1, Math.max(FLOOR, p));
  const t = (Math.log10(clamped) + 12) / 12;
  return PAD + t * (W - PAD * 2);
}

type Counted = {
  caught: number;
  missed: number;
  falseAlarms: number;
  leftAlone: number;
  accuracy: number;
  precision: number;
  recall: number;
};

function countAt(points: [number, number][], threshold: number): Counted {
  let caught = 0;
  let missed = 0;
  let falseAlarms = 0;
  let leftAlone = 0;
  for (const [p, spam] of points) {
    const flagged = p >= threshold;
    if (flagged && spam) caught++;
    else if (flagged) falseAlarms++;
    else if (spam) missed++;
    else leftAlone++;
  }
  const flagged = caught + falseAlarms;
  const spam = caught + missed;
  return {
    caught,
    missed,
    falseAlarms,
    leftAlone,
    accuracy: (caught + leftAlone) / points.length,
    precision: flagged === 0 ? 1 : caught / flagged,
    recall: spam === 0 ? 0 : caught / spam,
  };
}

export function ThresholdFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<ThresholdData | null>(null);
  const [failed, setFailed] = useState(false);
  const [slid, setSlid] = useState<{ stage: number; value: number }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/threshold.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ThresholdData>;
      })
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Vertical offsets, drawn once.
   */
  const rows = useMemo(() => {
    if (!data) return [];
    const seen = new Map<number, number>();
    return data.points.map(([p, spam]) => {
      const key = Math.round(xOf(p));
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      const depth = (n % 14) * 4.2;
      return {
        x: xOf(p),
        y: spam ? H / 2 - 14 - depth : H / 2 + 14 + depth,
        spam: spam === 1,
        p,
      };
    });
  }, [data]);

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

  const here =
    slid && slid.stage === stage
      ? slid.value
      : STAGE_THRESHOLD[Math.min(stage, 5)];
  const drawn = stage >= 1;
  const counts = countAt(data.points, here);
  const lineX = xOf(here === 0 ? FLOOR : here);

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {data.corpus.testSize} held-out messages, by the score the model gave
          them
        </p>
        <p className="label text-ink-faint">
          <span className="text-pink-text">above is spam</span> ·{" "}
          <span className="text-blue-text">below is ordinary</span>
        </p>
      </div>

      <div className="px-4 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`Every held-out message plotted by its spam score, with the decision line at ${here}`}
        >
          <line
            x1={PAD}
            y1={H / 2}
            x2={W - PAD}
            y2={H / 2}
            className="stroke-ink/30"
          />

          {rows.map((row, i) => (
            <circle
              key={i}
              cx={row.x}
              cy={row.y}
              r={2.4}
              // Colour is what the message is; opacity is what the line did
              // with it. Keeping those separate is what lets a reader see both
              // the mistake and the kind of mistake at once.
              className={row.spam ? "fill-pink" : "fill-blue"}
              opacity={!drawn ? 0.75 : row.p >= here ? 0.95 : 0.3}
            />
          ))}

          {/* The line. One object, and the only thing that moves. */}
          {drawn ? (
            <motion.g
              initial={false}
              animate={{ x: lineX }}
              transition={{ duration: still ? 0 : 0.7, ease: "easeInOut" }}
            >
              <line
                y1={10}
                y2={H - 10}
                className="stroke-ink"
                strokeWidth={2}
              />
              <text
                x={6}
                y={20}
                className="fill-ink font-data"
                style={{ fontSize: 11 }}
              >
                flag
              </text>
              <text
                x={-30}
                y={20}
                className="fill-ink-faint font-data"
                style={{ fontSize: 11 }}
              >
                leave
              </text>
            </motion.g>
          ) : null}

          {/* Three labels, not four. A fourth at "certain" collides with the
              one at even odds, because the last decade of the log scale is
              only a few pixels wide. */}
          {[
            { label: "one in a billion", at: 1e-9 },
            { label: "one in a thousand", at: 1e-3 },
            { label: "even odds", at: 0.5 },
          ].map((tick) => (
            <text
              key={tick.label}
              x={xOf(tick.at)}
              y={H - 2}
              textAnchor="middle"
              className="fill-ink-faint font-data"
              style={{ fontSize: 9 }}
            >
              {tick.label}
            </text>
          ))}
        </svg>

        {drawn ? (
          <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-3">
            {[
              {
                label: "Accuracy",
                value: counts.accuracy,
                note: "of everything, how much it got right",
              },
              {
                label: "Precision",
                value: counts.precision,
                note: "of what it flagged, how much was spam",
              },
              {
                label: "Recall",
                value: counts.recall,
                note: "of the spam there was, how much it caught",
              },
            ].map((readout) => (
              <div key={readout.label}>
                <p className="label text-ink-faint">{readout.label}</p>
                <motion.p
                  key={`${readout.label}-${readout.value}`}
                  initial={still ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="data text-[1.25rem] font-bold tabular-nums"
                >
                  {(readout.value * 100).toFixed(1)}%
                </motion.p>
                <p className="text-ink-faint text-[0.8125rem]">
                  {readout.note}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            Every dot is one message the model has never seen, placed at the
            score it gave. It did not say spam or not spam. It said a number,
            and almost every number is at one end or the other, because this
            model is rarely in two minds. Somebody still has to decide where
            along here a number becomes an action.
          </p>
        )}

        {drawn ? (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            It caught{" "}
            <span className="data text-teal-text font-bold">
              {counts.caught}
            </span>{" "}
            of {data.corpus.spamInTest} spam, missed{" "}
            <span className="data text-pink-text font-bold">
              {counts.missed}
            </span>
            , and wrongly blocked{" "}
            <span className="data text-pink-text font-bold">
              {counts.falseAlarms}
            </span>{" "}
            real messages.
            {stage === 4
              ? " And a filter that simply flagged nothing at all would score 86.0% accuracy on these same messages, because most messages are not spam. Accuracy on its own is not evidence of anything."
              : ""}
          </p>
        ) : null}
      </div>

      {stage >= 5 ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <label className="label text-ink-faint mb-2 block" htmlFor="line">
            Put the line where you like
          </label>
          <input
            id="line"
            type="range"
            min={0}
            max={120}
            value={
              slid && slid.stage === stage
                ? Math.round(
                    ((Math.log10(Math.max(FLOOR, here)) + 12) / 12) * 120,
                  )
                : Math.round(((Math.log10(0.5) + 12) / 12) * 120)
            }
            onChange={(e) =>
              setSlid({
                stage,
                value: 10 ** (-12 + (Number(e.target.value) / 120) * 12),
              })
            }
            className="accent-pink w-full"
          />
          <div className="label text-ink-faint flex justify-between">
            <span>flag anything</span>
            <span>flag only what is certain</span>
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.model.name}. {data.model.note} Every dot is one real message and
        every count on this figure is taken from the dots drawn, not from a
        stored summary. The axis is logarithmic.
      </figcaption>
    </figure>
  );
}
