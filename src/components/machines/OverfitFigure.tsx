"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { type Candidate, type OverfitData, predict } from "@/lib/game/overfit";

/**
 * One curve, bending further and further, over the same thirty sentences.
 */

const STAGE_DEGREE: Record<number, number> = {
  0: -1,
  1: 1,
  2: 5,
  3: 11,
  4: 11,
  5: 11,
};

const W = 640;
const H = 300;
const PAD = 30;

export function OverfitFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<OverfitData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<{ stage: number; degree: number }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/overfit.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<OverfitData>;
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
          The sentences did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the sentences…</p>
      </div>
    );
  }

  const wanted =
    picked && picked.stage === stage
      ? picked.degree
      : (STAGE_DEGREE[stage] ?? 11);
  const fit: Candidate | undefined = data.degrees.find(
    (d) => d.degree === wanted,
  );
  const showHeldOut = stage >= 4;
  const showU = stage >= 5;

  const maxChars = Math.max(
    ...data.test.concat(data.train).map((p) => p.chars),
  );
  const maxTokens =
    Math.max(...data.test.concat(data.train).map((p) => p.tokens)) * 1.25;

  const x = (chars: number) => PAD + (chars / maxChars) * (W - PAD * 2);
  /**
   * Deliberately not clamped.
   */
  const y = (tokens: number) => H - PAD - (tokens / maxTokens) * (H - PAD * 2);

  const path: string[] = [];
  if (fit) {
    for (let i = 0; i <= 220; i++) {
      const chars = (i / 220) * maxChars;
      const value = predict(fit, chars, data.maxChars);
      path.push(
        `${i === 0 ? "M" : "L"}${x(chars).toFixed(1)} ${y(value).toFixed(1)}`,
      );
    }
  }

  const worstTest = Math.max(...data.degrees.map((d) => d.testError));

  /** Whether the fitted curve runs off the plot inside the range of the data. */
  const leavesThePlot = fit
    ? Array.from({ length: 60 }, (_, i) => (i / 59) * maxChars).some(
        (chars) => {
          const value = predict(fit, chars, data.maxChars);
          return value > maxTokens || value < 0;
        },
      )
    : false;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {data.trainSize} sentences · characters across, tokens up
        </p>
        <p className="label text-ink-faint">
          {fit
            ? fit.degree === 1
              ? "a straight line"
              : `a curve with ${fit.degree} bends allowed`
            : "no model yet"}
        </p>
      </div>

      <div className="px-4 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`Thirty sentences with a polynomial of degree ${wanted} fitted through them`}
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

          {showHeldOut
            ? data.test.map((p, i) => (
                <motion.circle
                  key={`held-${i}`}
                  cx={x(p.chars)}
                  cy={y(p.tokens)}
                  r={2.6}
                  className="fill-teal"
                  initial={still ? false : { opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: still ? 0 : (i % 30) * 0.01 }}
                />
              ))
            : null}

          {data.train.map((p, i) => (
            <circle
              key={`train-${i}`}
              cx={x(p.chars)}
              cy={y(p.tokens)}
              r={3.4}
              className="fill-blue"
            />
          ))}

          {fit ? (
            <motion.path
              d={path.join(" ")}
              className="stroke-pink fill-none"
              strokeWidth={2.5}
              initial={false}
              animate={{ d: path.join(" ") }}
              transition={{ duration: still ? 0 : 0.7, ease: "easeInOut" }}
            />
          ) : null}
        </svg>

        {fit && leavesThePlot ? (
          <p className="label text-pink-text mt-2">
            The curve leaves the top of the chart. At 250 characters it predicts{" "}
            {Math.round(predict(fit, 250, data.maxChars))} tokens.
          </p>
        ) : null}

        {fit ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="label text-ink-faint">
              Error on the sentences it fitted
              <span className="data text-ink ml-2 text-base font-bold tabular-nums">
                {fit.trainError.toFixed(2)}
              </span>
            </span>
            <span className="label text-ink-faint">
              Error on the {data.testSize} it never saw
              <motion.span
                key={fit.degree}
                initial={still ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`data ml-2 text-base font-bold tabular-nums ${
                  fit.testError > data.best.testError * 1.4
                    ? "text-pink-text"
                    : "text-teal-text"
                }`}
              >
                {showHeldOut || stage >= 1 ? fit.testError.toFixed(2) : "—"}
              </motion.span>
            </span>
          </div>
        ) : (
          <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
            Thirty real sentences, each one a dot: how many characters it has,
            and how many tokens it came to. There is a relationship here and it
            is close to a straight line. Everything past a straight line is a
            model claiming to have found something more.
          </p>
        )}

        {showU ? (
          <motion.div
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 mt-4 border-t pt-4"
          >
            <p className="label text-ink-faint mb-2">
              Both errors, at every degree. Click one.
            </p>
            <svg viewBox={`0 0 ${W} 150`} className="block w-full" aria-hidden>
              {(["trainError", "testError"] as const).map((key) => {
                const line = data.degrees.map((d, i) => {
                  const px =
                    PAD + (i / (data.degrees.length - 1)) * (W - PAD * 2);
                  const py =
                    140 - (Math.min(d[key], worstTest) / worstTest) * 120;
                  return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
                });
                return (
                  <path
                    key={key}
                    d={line.join(" ")}
                    className={`fill-none ${
                      key === "trainError" ? "stroke-blue" : "stroke-pink"
                    }`}
                    strokeWidth={2}
                  />
                );
              })}
              {data.degrees.map((d, i) => {
                const px =
                  PAD + (i / (data.degrees.length - 1)) * (W - PAD * 2);
                return (
                  <text
                    key={d.degree}
                    x={px}
                    y={148}
                    textAnchor="middle"
                    className="fill-ink-faint font-data"
                    style={{ fontSize: 9 }}
                  >
                    {d.degree}
                  </text>
                );
              })}
            </svg>
            <p className="text-ink-faint mt-1 text-[0.8125rem]">
              <span className="text-blue-text">Blue</span> is error on the
              sentences it fitted, and it only ever falls.{" "}
              <span className="text-pink-text">Pink</span> is error on the ones
              it never saw, and it turns upward after degree {data.best.degree}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.degrees.map((option) => (
                <button
                  key={option.degree}
                  type="button"
                  onClick={() => setPicked({ stage, degree: option.degree })}
                  className={`tap rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    option.degree === fit?.degree
                      ? "border-ink bg-paper-sunk font-semibold"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {option.degree}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.title} by {data.source.author}, {data.source.via}.{" "}
        {data.note} Curves are least-squares fits computed offline and drawn
        from their own coefficients. Degree twelve is missing because the fit is
        singular at thirty points, which is its own kind of answer.
      </figcaption>
    </figure>
  );
}
