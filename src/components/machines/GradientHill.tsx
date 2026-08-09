"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { REGRESSION } from "@/lib/datasets";
import { gradient, gradientStep, meanSquaredError } from "@/lib/ml";

/**
 * Learning, with the lid off.
 */

const { points, best, source, sampleSize } = REGRESSION;

const LEARNING_RATES = [
  { value: 0.00001, label: "Tiny" },
  { value: 0.00002, label: "Sensible" },
  { value: 0.0001, label: "Reckless" },
];

const MAX_STEPS = 60;
const STEP_MS = 180;

export function GradientHill() {
  const [slope, setSlope] = useState(0.12);
  const [rate, setRate] = useState(LEARNING_RATES[1].value);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState(0);
  const [diverged, setDiverged] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const mse = meanSquaredError(points, slope);
  const slopeAtBest = Math.abs(slope - best.slope) < 0.0005;

  // The error curve, sampled live so it always matches the points on screen.
  const curve = useMemo(() => {
    const out: { slope: number; mse: number }[] = [];
    for (let i = 0; i <= 80; i++) {
      const s = 0.05 + (i * 0.45) / 80;
      out.push({ slope: s, mse: meanSquaredError(points, s) });
    }
    return out;
  }, []);

  useEffect(() => {
    if (!running) return;

    timer.current = setInterval(() => {
      setSlope((current) => {
        const next = gradientStep(points, current, rate);

        if (!Number.isFinite(next) || Math.abs(next) > 5) {
          setDiverged(true);
          setRunning(false);
          return current;
        }

        // Settled: the ground is flat enough that further steps do nothing.
        if (Math.abs(gradient(points, next)) < 0.001) {
          setRunning(false);
        }
        return next;
      });
      setSteps((n) => {
        if (n + 1 >= MAX_STEPS) setRunning(false);
        return n + 1;
      });
    }, STEP_MS);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, rate]);

  function reset() {
    setRunning(false);
    setSlope(0.12);
    setSteps(0);
    setDiverged(false);
  }

  function stepOnce() {
    setDiverged(false);
    const next = gradientStep(points, slope, rate);
    if (!Number.isFinite(next) || Math.abs(next) > 5) {
      setDiverged(true);
      return;
    }
    setSlope(next);
    setSteps((n) => n + 1);
  }

  return (
    /* This is the playable on its page even though it is filed as a machine,
       so it carries the game marker for the engagement measure. */
    <div className="space-y-4" data-section="game">
      <div className="grid gap-4 lg:grid-cols-2">
        <figure className="plate p-5">
          <figcaption className="mb-4">
            <h3 className="font-display text-base font-bold">
              The guess, against the evidence
            </h3>
            <p className="text-ink-soft mt-1 text-sm">
              {sampleSize} real sentences. Each dot is one sentence: how long it
              is, against how many tokens it cost.
            </p>
          </figcaption>
          <Scatter slope={slope} />
        </figure>

        <figure className="plate p-5">
          <figcaption className="mb-4">
            <h3 className="font-display text-base font-bold">
              The hill it is rolling down
            </h3>
            <p className="text-ink-soft mt-1 text-sm">
              How wrong the line is, for every setting of the dial. The machine
              cannot see this shape. It only feels which way is down.
            </p>
          </figcaption>
          <ErrorCurve curve={curve} slope={slope} />
        </figure>
      </div>

      <div className="plate p-5 md:p-6">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label htmlFor="slope" className="label text-ink-faint">
              Tokens per character
            </label>
            <div className="mt-2.5 flex items-center gap-4">
              <input
                id="slope"
                type="range"
                min={0.05}
                max={0.5}
                step={0.001}
                value={Math.min(Math.max(slope, 0.05), 0.5)}
                onChange={(e) => {
                  setRunning(false);
                  setDiverged(false);
                  setSlope(Number(e.target.value));
                }}
                className="accent-pink h-2 w-full"
              />
              <output
                htmlFor="slope"
                className="data w-16 shrink-0 text-right text-xl font-bold"
              >
                {slope.toFixed(3)}
              </output>
            </div>
          </div>

          <dl className="flex gap-6">
            <div>
              <dt className="label text-ink-faint mb-1.5">How wrong</dt>
              <dd
                className={`data text-xl font-semibold ${
                  slopeAtBest ? "text-teal-text" : "text-ink"
                }`}
              >
                {mse.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="label text-ink-faint mb-1.5">Steps</dt>
              <dd className="data text-xl font-semibold">{steps}</dd>
            </div>
          </dl>
        </div>

        <div className="border-ink/20 mt-5 flex flex-wrap items-end gap-3 border-t pt-5">
          <div>
            <label htmlFor="rate" className="label text-ink-faint">
              Step size
            </label>
            <select
              id="rate"
              value={rate}
              onChange={(e) => {
                setRate(Number(e.target.value));
                setDiverged(false);
              }}
              className="border-ink/40 bg-paper-sunk mt-2 block rounded-[2px] border px-3 py-2.5 text-sm"
            >
              {LEARNING_RATES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={stepOnce}
            disabled={running}
            className="plate misreg font-display px-4 py-2.5 font-bold disabled:opacity-40"
          >
            Take one step
          </button>

          <button
            type="button"
            onClick={() => {
              setDiverged(false);
              setRunning((r) => !r);
            }}
            className="plate misreg btn-primary font-display px-4 py-2.5 font-bold"
          >
            {running ? "Stop" : "Let it learn"}
          </button>

          <button
            type="button"
            onClick={reset}
            className="plate misreg font-display px-4 py-2.5 font-bold"
          >
            Reset
          </button>
        </div>

        <p className="mt-5 text-[0.9375rem]" aria-live="polite">
          {diverged ? (
            <span className="text-pink-text">
              It overshot and threw itself off the hill. The step size was
              bigger than the slope could absorb, so each correction landed
              further from the bottom than the last. Switch to a smaller step
              and reset.
            </span>
          ) : slopeAtBest ? (
            <span className="text-teal-text">
              Settled. {best.charsPerToken} characters per token, and the number
              nobody wrote down, recovered from {sampleSize} sentences by
              nothing more than repeatedly stepping downhill.
            </span>
          ) : (
            <span className="text-ink-soft">
              Drag the dial, or let it find the bottom itself. The lowest the
              error goes is {best.mse.toFixed(2)}.
            </span>
          )}
        </p>
      </div>

      <p className="data text-ink-faint text-xs">
        {source.title} · {source.author} · {source.via} · public domain
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ charts ---

const W = 400;
const H = 240;
const PAD = { top: 8, right: 8, bottom: 28, left: 34 };

function Scatter({ slope }: { slope: number }) {
  const maxChars = Math.max(...points.map((p) => p.chars));
  const maxTokens = Math.max(...points.map((p) => p.tokens));

  const x = (c: number) =>
    PAD.left + (c / maxChars) * (W - PAD.left - PAD.right);
  const y = (t: number) =>
    H - PAD.bottom - (t / maxTokens) * (H - PAD.top - PAD.bottom);

  const lineEndTokens = slope * maxChars;
  const clamped = Math.min(lineEndTokens, maxTokens);
  const clampedChars = clamped / slope;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Scatter plot of ${points.length} sentences: characters against token count, with a fitted line at ${slope.toFixed(3)} tokens per character.`}
    >
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="var(--rule)"
        strokeWidth={1}
      />
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={H - PAD.bottom}
        stroke="var(--rule)"
        strokeWidth={1}
      />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(p.chars)}
          cy={y(p.tokens)}
          r={3}
          fill="var(--blue)"
          fillOpacity={0.55}
        />
      ))}

      <line
        x1={x(0)}
        y1={y(0)}
        x2={x(clampedChars)}
        y2={y(clamped)}
        stroke="var(--pink)"
        strokeWidth={2.5}
      />

      <text
        x={PAD.left}
        y={H - 8}
        className="data"
        fontSize={9}
        fill="var(--ink-faint)"
      >
        characters
      </text>
      <text
        x={4}
        y={PAD.top + 8}
        className="data"
        fontSize={9}
        fill="var(--ink-faint)"
      >
        tokens
      </text>
    </svg>
  );
}

function ErrorCurve({
  curve,
  slope,
}: {
  curve: { slope: number; mse: number }[];
  slope: number;
}) {
  const maxMse = Math.max(...curve.map((c) => c.mse));
  const minSlope = curve[0].slope;
  const maxSlope = curve[curve.length - 1].slope;

  const x = (s: number) =>
    PAD.left +
    ((s - minSlope) / (maxSlope - minSlope)) * (W - PAD.left - PAD.right);
  const y = (m: number) =>
    H - PAD.bottom - (m / maxMse) * (H - PAD.top - PAD.bottom);

  const path = curve
    .map((c, i) => `${i === 0 ? "M" : "L"} ${x(c.slope)} ${y(c.mse)}`)
    .join(" ");

  const here = Math.min(Math.max(slope, minSlope), maxSlope);
  const hereMse = meanSquaredError(points, here);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Error curve. The lowest point is at ${best.slope} tokens per character; the current setting is ${slope.toFixed(3)}.`}
    >
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="var(--rule)"
        strokeWidth={1}
      />

      <path d={path} fill="none" stroke="var(--ink-faint)" strokeWidth={2} />

      <line
        x1={x(best.slope)}
        y1={PAD.top}
        x2={x(best.slope)}
        y2={H - PAD.bottom}
        stroke="var(--teal)"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />

      <circle cx={x(here)} cy={y(hereMse)} r={7} fill="var(--pink)" />
      <circle
        cx={x(here)}
        cy={y(hereMse)}
        r={7}
        fill="none"
        stroke="var(--paper-raised)"
        strokeWidth={2}
      />

      <text
        x={PAD.left}
        y={H - 8}
        className="data"
        fontSize={9}
        fill="var(--ink-faint)"
      >
        tokens per character
      </text>
    </svg>
  );
}
