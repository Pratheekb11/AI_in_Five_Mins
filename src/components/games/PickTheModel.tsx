"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  call,
  type Candidate,
  current,
  newScene,
  next,
  type OverfitData,
  type OverfitRound,
  type OverfitScene,
  pointsFor,
  predict,
  ROUNDS,
  type Sentence,
  start as startRound,
} from "@/lib/game/overfit";

/**
 * Pick the Model. Four curves, real fits, and no test scores until you commit.
 */

let cached: Promise<OverfitData> | null = null;

function loadOverfit(): Promise<OverfitData> {
  if (!cached) {
    cached = fetch("/data/overfit.json").then((r) => {
      if (!r.ok) throw new Error(`overfit: ${r.status}`);
      return r.json() as Promise<OverfitData>;
    });
  }
  return cached;
}

const W = 220;
const H = 130;
const PAD = 10;

function Sparkline({
  candidate,
  train,
  maxChars,
  maxTokens,
}: {
  candidate: Candidate;
  train: Sentence[];
  maxChars: number;
  maxTokens: number;
}) {
  const x = (chars: number) => PAD + (chars / maxChars) * (W - PAD * 2);
  const y = (tokens: number) =>
    H -
    PAD -
    (Math.min(maxTokens, Math.max(0, tokens)) / maxTokens) * (H - PAD * 2);

  const path: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const chars = (i / 60) * maxChars;
    const value = predict(candidate, chars, maxChars);
    path.push(
      `${i === 0 ? "M" : "L"}${x(chars).toFixed(1)} ${y(value).toFixed(1)}`,
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden="true">
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        className="fill-paper-sunk"
        rx={2}
      />
      {train.map((point, i) => (
        <circle
          key={i}
          cx={x(point.chars)}
          cy={y(point.tokens)}
          r={2}
          className="fill-blue"
          opacity={0.7}
        />
      ))}
      <path
        d={path.join(" ")}
        className="stroke-pink fill-none"
        strokeWidth={2}
      />
    </svg>
  );
}

function bounds(round: OverfitRound) {
  return {
    maxChars: Math.max(...round.train.map((p) => p.chars)) * 1.05,
    maxTokens: Math.max(...round.train.map((p) => p.tokens)) * 1.35,
  };
}

export function PickTheModel({
  initialData,
  initialScene,
}: {
  initialData?: OverfitData;
  initialScene?: OverfitScene;
} = {}) {
  const [data, setData] = useState<OverfitData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<OverfitScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadOverfit().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 20 }, () => Math.random()),
        ),
      );
      setPlaying(true);
    })();
    return () => {
      alive = false;
    };
  }, [initialData, initialScene]);

  const begin = useCallback(() => {
    if (!data) return;
    setScene(
      startRound(
        data,
        Array.from({ length: 20 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback(
    (degree: number) => setScene((s) => call(s, degree)),
    [],
  );
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const earned =
    round && scene.called !== null ? pointsFor(round, scene.called) : 0;

  useEffect(() => {
    if (!playing || scene.done || !round) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= round.candidates.length) {
        choose(round.candidates[n - 1].degree);
      } else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, round, choose, carryOn]);

  return (
    <GameShell
      gameId="pick-the-model"
      name="Pick the Model"
      instruction="Real sentences, real fits. Every curve was fitted to the dots beside it, and the only score you are given is how well it did on those dots. Choose the one you would ship."
      howToPlay={{
        goal: "Choose the curve that will do best on sentences it has not seen.",
        steps: [
          "Look at how many examples the fits were given. It matters more than anything else here.",
          "Pick a curve. The training error is shown, and it always favours the wiggliest one.",
          "The held-out error arrives for all of them.",
        ],
        controls: "Tap or click a curve, or press its number. Enter moves on.",
        scoring:
          "Up to 120 a round, full marks within 5% of the best available.",
      }}
      startLabel={data ? "Choose a curve" : "Loading the sentences…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : earned >= 120
            ? scene.streak >= 3
              ? "celebrate"
              : "cheer"
            : "wince"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Nailed", value: scene.perfect },
        { label: "Streak", value: `×${scene.streak}` },
        {
          label: "Round",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.perfect} of {scene.rounds.length} shipped well
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            The wiggliest curve had the lowest training error in every single
            round, and it was never the one to ship. What decided the answer was
            how many sentences the fit was given: with eight, anything but a
            straight line is fantasy, and with a hundred and ten a cubic costs
            nothing. More capacity is not better or worse. It is something you
            have to be able to afford.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.title} by {data.source.author}, {data.source.via}.{" "}
            {data.note} Every curve is a least-squares fit computed offline and
            drawn from its own coefficients.
          </>
        ) : failed ? (
          <>The sentences did not load.</>
        ) : (
          <>Loading the sentences…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round ? (
          <>
            {/* The premise. A board that opens on a bare task reads as a
                quiz somebody forgot to write the question for. */}
            <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-4">
              Every curve below was fitted to the same sentences and every
              one of them can draw those dots. Choose the one you would
              actually ship, then watch each get judged on sentences it was
              never shown.
            </p>
            <p className="label text-ink-faint mb-1">
              Fitted to {round.trainSize} sentences · judged on the{" "}
              {round.testSize} held back
            </p>
            <p className="prose-measure mb-4 text-[1.0625rem]">
              Characters across, tokens up. Which of these would you ship?
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {round.candidates.map((candidate, i) => {
                const { maxChars, maxTokens } = bounds(round);
                const yours = scene.called === candidate.degree;
                const won = candidate.degree === round.bestDegree;
                return (
                  <button
                    key={candidate.degree}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(candidate.degree)}
                    className={`plate p-3 text-left transition-colors ${
                      !revealed
                        ? "hover:border-ink cursor-pointer"
                        : won
                          ? "border-teal bg-teal-wash"
                          : yours
                            ? "border-pink bg-pink-wash"
                            : ""
                    }`}
                  >
                    <span className="label text-ink-faint mb-1 block">
                      {i + 1} ·{" "}
                      {candidate.degree === 1
                        ? "a straight line"
                        : `degree ${candidate.degree}`}
                    </span>
                    <Sparkline
                      candidate={candidate}
                      train={round.train}
                      maxChars={maxChars}
                      maxTokens={maxTokens}
                    />
                    <span className="data text-ink-soft mt-2 block text-[0.8125rem]">
                      error on these dots {candidate.trainError.toFixed(2)}
                    </span>
                    {revealed ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`data mt-1 block text-[0.9375rem] font-bold ${
                          won ? "text-teal-text" : "text-pink-text"
                        }`}
                      >
                        on held-out {candidate.testError.toFixed(2)}
                      </motion.span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <p
                  className={`text-[1.0625rem] font-semibold ${
                    earned >= 120 ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {earned >= 120 ? "Good ship." : "That one travelled badly."}{" "}
                  With {round.trainSize} examples, the best of these was{" "}
                  {round.bestDegree === 1
                    ? "the straight line"
                    : `degree ${round.bestDegree}`}
                  , at {round.bestError.toFixed(2)}.
                </p>
                <p className="prose-measure text-ink-soft mt-1 text-[0.9375rem]">
                  Every curve here fits its own dots better than the straight
                  line does. That is what more capacity buys, and it is worth
                  nothing unless there were enough dots to tell a real bend from
                  an accident.
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.rounds.length
                    ? "Finish"
                    : "Next round"}
                </button>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the sentences…</p>
        )}
      </div>
    </GameShell>
  );
}
