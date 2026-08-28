"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  call,
  current,
  type Feature,
  type FeatureData,
  type FeatureScene,
  isClose,
  newScene,
  next,
  ROUNDS,
  start as startRound,
  winnerOf,
} from "@/lib/game/features";

/**
 * The Feature Bench. Two yes-or-no questions, and which one is worth more.
 */

let cached: Promise<FeatureData> | null = null;

function loadFeatures(): Promise<FeatureData> {
  if (!cached) {
    cached = fetch("/data/features.json").then((r) => {
      if (!r.ok) throw new Error(`features: ${r.status}`);
      return r.json() as Promise<FeatureData>;
    });
  }
  return cached;
}

function Pile({
  feature,
  revealed,
  chosen,
  won,
}: {
  feature: Feature;
  revealed: boolean;
  chosen: boolean;
  won: boolean;
}) {
  const { fires, firesSpam } = feature.train;
  const purity = feature.train.purity;

  return (
    <div
      className={`plate p-4 transition-colors ${
        !revealed
          ? ""
          : won
            ? "border-teal bg-teal-wash"
            : chosen
              ? "border-pink bg-pink-wash"
              : ""
      }`}
    >
      <p className="text-[1.0625rem] font-semibold">{feature.label}</p>
      <p className="text-ink-soft mt-1 text-[0.875rem]">{feature.plain}</p>

      {revealed ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border-ink/20 mt-3 border-t pt-3"
        >
          <p className="text-[0.9375rem]">
            Catches <span className="data font-bold">{fires}</span> messages.{" "}
            <span className="data text-pink-text font-bold">{firesSpam}</span>{" "}
            of them are spam.
          </p>
          <span className="bg-paper-sunk border-ink/20 mt-2 flex h-4 overflow-hidden rounded-[1px] border">
            <span
              className="bg-pink block h-full"
              style={{ width: `${purity * 100}%` }}
            />
            <span
              className="bg-ink/25 block h-full"
              style={{ width: `${(1 - purity) * 100}%` }}
            />
          </span>
          <p className="label text-ink-faint mt-1">
            {(purity * 100).toFixed(1)}% of that pile is spam
          </p>
          <p className="data mt-2 text-[1.0625rem] font-bold">
            {feature.train.gain.toFixed(3)} bits
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

export function FeatureBench({
  initialData,
  initialScene,
}: {
  initialData?: FeatureData;
  initialScene?: FeatureScene;
} = {}) {
  const [data, setData] = useState<FeatureData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<FeatureScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadFeatures().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 40 }, () => Math.random()),
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
        Array.from({ length: 40 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback(
    (side: "left" | "right") => setScene((s) => call(s, side)),
    [],
  );
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const pair = current(scene);
  const revealed = scene.called !== null;
  const winner = pair ? winnerOf(pair) : null;
  const correct = revealed && scene.called === winner;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") choose("left");
      else if (e.key === "2") choose("right");
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  return (
    <GameShell
      gameId="feature-bench"
      name="The Feature Bench"
      instruction="Two yes-or-no questions you could ask about a text message. Which one tells you more about whether it is spam? Say so before the corpus does."
      howToPlay={{
        goal: "Pick the question that removes more uncertainty about the label.",
        steps: [
          "Read the two features.",
          "Choose the one you think separates spam from ordinary messages better.",
          "The corpus pours out both piles, and the winner is the one that removed more bits.",
        ],
        controls: "Tap or click a feature, or press 1 or 2. Enter moves on.",
        scoring:
          "100 a call, plus 60 when the two were within a hair of each other.",
      }}
      startLabel={data ? "Take the bench" : "Loading the corpus…"}
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
        { label: "Right", value: scene.right },
        { label: "Streak", value: `×${scene.streak}` },
        {
          label: "Pair",
          value: `${Math.min(scene.at + 1, Math.max(scene.pairs.length, 1))}/${
            scene.pairs.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.pairs.length} called right
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Notice which instincts let you down. The word free is the one
            everybody picks, and it is beaten by the sheer length of the
            message, which has nothing to do with what the message says. That
            gap between what feels informative and what is measurably
            informative is the whole job of the person choosing features.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.name}, {data.corpus.total} real messages,{" "}
            {data.corpus.spam} of them spam. Every feature is measured on the{" "}
            {data.corpus.trainSize} training messages, on the same seeded split
            the rest of this site uses.
          </>
        ) : failed ? (
          <>The corpus did not load.</>
        ) : (
          <>Loading the corpus…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {pair ? (
          <>
            <p className="label text-ink-faint mb-4">
              Which of these tells you more about whether a message is spam?
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {(["left", "right"] as const).map((side) => {
                const feature = pair[side];
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(side)}
                    className={`block text-left ${
                      revealed ? "" : "cursor-pointer"
                    }`}
                  >
                    <Pile
                      feature={feature}
                      revealed={revealed}
                      chosen={scene.called === side}
                      won={winner === side}
                    />
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5"
              >
                <p
                  className={`text-[1.0625rem] font-semibold ${
                    correct ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {correct ? "Right." : "Not this time."}{" "}
                  {pair[winner ?? "left"].label} removes more.
                  {isClose(pair)
                    ? " And it was close, which is worth a bonus."
                    : ""}
                </p>
                <p className="prose-measure text-ink-soft mt-1 text-[0.9375rem]">
                  A feature is worth what it removes, not what it sounds like. A
                  question everything answers yes to removes nothing, and so
                  does one nothing answers yes to.
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.pairs.length ? "Finish" : "Next pair"}
                </button>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the corpus…</p>
        )}
      </div>
    </GameShell>
  );
}
