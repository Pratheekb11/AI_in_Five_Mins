"use client";

import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  type BenchScene,
  buildBench,
  call,
  current,
  FAILURES,
  FUSE,
  multiplierFor,
  newScene,
  next,
  ROUND_SIZE,
  start as startRound,
  type Weighing,
} from "@/lib/game/bench";
import { useGameLoop } from "@/lib/game/useGameLoop";
import { claimArrowKeys } from "@/lib/arrowKeys";
import { type EmbeddingSpace, loadEmbeddings } from "@/lib/embeddings";
import { type LogitData, loadLogits } from "@/lib/logits";

/**
 * Failure bench, call it before it is weighed.
 */

const SCALE_W = 560;
const SCALE_H = 132;
/** Nimo perches top-right of the cabinet; the beam stops short of him. */
const NIMO_GUTTER = 92;
const PIVOT_X = SCALE_W / 2;
const BEAM_Y = 46;
const BEAM_HALF = (SCALE_W - NIMO_GUTTER) / 2 - 24;
const MAX_TILT = 11;

function tiltFor(weighing: Weighing | undefined, revealed: boolean): number {
  if (!weighing || !revealed) return 0;
  const { left, right } = weighing;
  const span = Math.max(Math.abs(left.value), Math.abs(right.value)) || 1;
  const lean = (right.value - left.value) / span;
  // Certainty runs backwards: fewer bits is the heavier pan.
  const signed = weighing.unit === "bits" ? -lean : lean;
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, signed * MAX_TILT * 2));
}

function format(value: number, unit: Weighing["unit"]): string {
  if (unit === "probability") return `${(value * 100).toFixed(2)}%`;
  if (unit === "bits") return `${value.toFixed(2)} bits`;
  return value.toFixed(3);
}

export function FailureBench({
  initialBench,
  initialScene,
}: {
  /** The two datasets already combined server-side — this component never
   *  needs the raw embeddings space itself, only what `buildBench` derives
   *  from it. */
  initialBench?: Weighing[];
  initialScene?: BenchScene;
} = {}) {
  const [bench, setBench] = useState<Weighing[] | null>(
    initialBench ?? null,
  );
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<BenchScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const b =
        initialBench ??
        (await Promise.all([loadLogits(), loadEmbeddings()])
          .then(([logits, space]: [LogitData, EmbeddingSpace]) =>
            buildBench(logits, space),
          )
          .catch(() => null));
      if (!alive) return;
      if (!b) {
        setFailed(true);
        return;
      }
      if (!initialBench) setBench(b);
      if (b.length === 0) return;
      setScene(
        startRound(
          b,
          b.map(() => Math.random()),
        ),
      );
      setPlaying(true);
    })();
    return () => {
      alive = false;
    };
  }, [initialBench, initialScene]);

  const begin = useCallback(() => {
    if (!bench || bench.length === 0) return;
    setScene(
      startRound(
        bench,
        bench.map(() => Math.random()),
      ),
    );
    setPlaying(true);
  }, [bench]);

  const weighing = current(scene);
  const revealed = scene.called !== null;
  const running = playing && !scene.done && !revealed;

  useGameLoop((delta) => setScene((s) => advance(s, delta)), running);

  const choose = useCallback((side: "left" | "right") => {
    setScene((s) => call(s, side));
  }, []);

  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") choose("left");
      else if (e.key === "ArrowRight") choose("right");
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    const release = claimArrowKeys();
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [playing, scene.done, choose, carryOn]);

  const correct = revealed && scene.called === weighing?.answer;
  const tilt = tiltFor(weighing, revealed);
  const heavier = weighing?.answer;

  return (
    <GameShell
      gameId="failure-bench"
      name="Failure bench"
      instruction="A specimen goes on the balance and you say which pan drops, before it is weighed. Every weight is a live measurement on data already on this site, so when your instinct loses, it loses to arithmetic. Arrow keys, or click a pan."
      howToPlay={{
        goal: "Call which pan of the balance drops, before the specimen is weighed.",
        steps: [
          "Read the question above the scale.",
          "Choose the left or the right pan.",
          "The real measurement lands and the beam tilts to wherever the data actually put it.",
        ],
        controls: "Tap or click a pan, or press ← and →. Enter moves on.",
        scoring:
          "60 plus a speed bonus, multiplied by your streak. The clock ends the specimen, not the round.",
      }}
      startLabel={bench ? "Load the bench" : "Loading the measurements…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : correct
            ? scene.streak >= 3
              ? "celebrate"
              : "cheer"
            : "wince"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${multiplierFor(scene.streak)}` },
        {
          label: "Specimen",
          value: `${Math.min(scene.at + 1, Math.max(scene.bench.length, 1))}/${
            scene.bench.length || ROUND_SIZE
          }`,
        },
        { label: "Clock", value: scene.fuse.toFixed(1) },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.bench.length} called right
          </p>
          <p className="text-ink-soft mb-3 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <ul className="space-y-2">
            {scene.seen.map((kind) => (
              <li key={kind} className="text-[0.9375rem]">
                <span className="label text-ink-faint mr-2">
                  {FAILURES[kind].name}
                </span>
                <span className="text-ink-soft">{FAILURES[kind].blurb}</span>
              </li>
            ))}
          </ul>
        </div>
      }
      footer={
        bench ? (
          <>
            Every weight is computed when you press the button, from the same
            two files the rest of this site uses: DistilGPT-2&rsquo;s recorded
            next-token probabilities and GloVe vectors from six billion words of
            2014 text. Which specimens are on the bench is our choice. Which way
            they tip is not.
          </>
        ) : failed ? (
          <>The measurements did not load.</>
        ) : (
          <>Loading the measurements…</>
        )
      }
    >
      <div className="min-h-[12rem] p-4 sm:min-h-[22rem] sm:p-5 md:p-6">
        {weighing ? (
          <>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="label text-ink-faint">
                {FAILURES[weighing.kind].name}
              </span>
              <span className="text-[0.9375rem] font-semibold">
                {weighing.ask}
              </span>
            </div>

            <p className="font-data bg-paper-sunk border-ink/25 mb-1 rounded-[2px] border px-4 py-3 text-[1.0625rem]">
              {weighing.subject}
            </p>
            {weighing.note ? (
              <p className="text-ink-faint mb-3 text-[0.8125rem]">
                {weighing.note}
              </p>
            ) : (
              <div className="mb-3" />
            )}

            <svg
              viewBox={`0 0 ${SCALE_W} ${SCALE_H}`}
              className="mb-4 w-full"
              role="img"
              aria-label={
                revealed
                  ? `The balance tips ${heavier}.`
                  : "A level balance, waiting for your call."
              }
            >
              {/* The clock, drawn as the beam's own fuse. */}
              <rect
                x={0}
                y={0}
                height={5}
                width={(SCALE_W - NIMO_GUTTER) * (scene.fuse / FUSE)}
                className={scene.fuse < 3 ? "fill-pink" : "fill-blue"}
              />
              <line
                x1={PIVOT_X}
                y1={BEAM_Y}
                x2={PIVOT_X}
                y2={SCALE_H - 12}
                className="stroke-ink"
                strokeWidth={3}
              />
              <polygon
                points={`${PIVOT_X - 26},${SCALE_H - 12} ${PIVOT_X + 26},${SCALE_H - 12} ${PIVOT_X},${SCALE_H - 34}`}
                className="fill-ink"
              />
              <g
                transform={`rotate(${tilt} ${PIVOT_X} ${BEAM_Y})`}
                style={{ transition: "transform 420ms ease-out" }}
              >
                <line
                  x1={PIVOT_X - BEAM_HALF}
                  y1={BEAM_Y}
                  x2={PIVOT_X + BEAM_HALF}
                  y2={BEAM_Y}
                  className="stroke-ink"
                  strokeWidth={5}
                />
                {(["left", "right"] as const).map((side) => {
                  const x =
                    side === "left" ? PIVOT_X - BEAM_HALF : PIVOT_X + BEAM_HALF;
                  const wins = revealed && heavier === side;
                  const picked = scene.called === side;
                  return (
                    <g key={side}>
                      <line
                        x1={x}
                        y1={BEAM_Y}
                        x2={x}
                        y2={BEAM_Y + 20}
                        className="stroke-ink"
                        strokeWidth={2}
                      />
                      <path
                        d={`M ${x - 34} ${BEAM_Y + 20} q 34 26 68 0 z`}
                        className={
                          wins
                            ? "fill-teal stroke-ink"
                            : picked
                              ? "fill-pink stroke-ink"
                              : "fill-paper-sunk stroke-ink"
                        }
                        strokeWidth={2}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="grid gap-3 sm:grid-cols-2">
              {(["left", "right"] as const).map((side) => {
                const pan = weighing[side];
                const wins = revealed && heavier === side;
                const picked = scene.called === side;
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(side)}
                    className={`plate px-4 py-3 text-left transition-colors ${
                      wins
                        ? "border-teal bg-teal-wash"
                        : picked
                          ? "border-pink bg-pink-wash"
                          : "hover:border-ink"
                    } ${revealed ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span className="label text-ink-faint mb-1 block">
                      {side === "left" ? "← left pan" : "right pan →"}
                    </span>
                    <span className="font-data block text-[0.9375rem] break-words">
                      {pan.label}
                    </span>
                    {revealed ? (
                      <span className="data text-ink-soft mt-1 block text-xs tabular-nums">
                        {format(pan.value, weighing.unit)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 min-h-[3.5rem] sm:min-h-[5.5rem]" aria-live="polite">
              {revealed ? (
                <>
                  <p
                    className={`mb-1 text-[0.9375rem] font-semibold ${
                      correct ? "text-teal-text" : "text-pink-text"
                    }`}
                  >
                    {scene.called === "timeout"
                      ? "Out of time. The bench weighed it without you."
                      : correct
                        ? "Called it."
                        : "Wrong pan."}
                  </p>
                  <p className="prose-measure text-ink-soft mb-3 text-[0.9375rem]">
                    {weighing.tell}
                  </p>
                  <button
                    type="button"
                    onClick={carryOn}
                    className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                  >
                    {scene.at + 1 >= scene.bench.length
                      ? "See the result"
                      : "Next specimen"}
                  </button>
                </>
              ) : (
                <p className="text-ink-soft text-[0.9375rem]">
                  Call it fast. The clock is worth points, and your first
                  instinct is the one worth testing.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The measurements did not load, so there is nothing on the bench."
              : "Loading the measurements…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
