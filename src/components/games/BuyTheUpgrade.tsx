"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  type Buy,
  call,
  curveOf,
  type CurveData,
  type CurveScene,
  current,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start as startRound,
  truthOf,
} from "@/lib/game/curve";

/**
 * Buy the Upgrade. Ten times the data, or the best other model?
 */

let cached: Promise<CurveData> | null = null;

function loadCurve(): Promise<CurveData> {
  if (!cached) {
    cached = fetch("/data/curve.json").then((r) => {
      if (!r.ok) throw new Error(`curve: ${r.status}`);
      return r.json() as Promise<CurveData>;
    });
  }
  return cached;
}

export function BuyTheUpgrade() {
  const [data, setData] = useState<CurveData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<CurveScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCurve()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

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

  const choose = useCallback((buy: Buy) => setScene((s) => call(s, buy)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const earned = round && scene.called ? pointsFor(round, scene.called) : 0;
  const truth = round ? truthOf(round) : null;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") choose("data");
      else if (e.key === "2") choose("model");
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  return (
    <GameShell
      gameId="buy-the-upgrade"
      name="Buy the Upgrade"
      instruction="You have a small decision tree and a certain number of examples. You can have a great deal more data, or the best other model on the data you already have. One of them is worth more."
      howToPlay={{
        goal: "Spend the budget on whichever actually moves the number.",
        steps: [
          "Read how many examples you have, and what your model scores.",
          "Choose the extra data, or the best other model.",
          "Both were measured. The real gains arrive.",
        ],
        controls: "Tap or click a choice, or press 1 or 2. Enter moves on.",
        scoring:
          "100 a round, and both count where the two are within a fifth of a point.",
      }}
      startLabel={data ? "Take the first budget" : "Loading the curves…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : earned > 0
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
          label: "Budget",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} spent well
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            There is no general answer, which is the finding. With twenty
            examples, data is worth thirteen points and no model can rescue you.
            With two thousand, everything left in the corpus buys a sixth of a
            point and the model choice is worth six times that. Both facts came
            out of the same corpus, and either one on its own would be a slogan.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.name}. {data.note}
          </>
        ) : failed ? (
          <>The curves did not load.</>
        ) : (
          <>Loading the curves…</>
        )
      }
    >
      <div className="min-h-[24rem] p-5 md:p-6">
        {round && data ? (
          <>
            <p className="label text-ink-faint mb-2">Your situation</p>
            <p className="prose-measure mb-5 text-[1.0625rem]">
              You have <span className="data font-bold">{round.size}</span>{" "}
              labelled messages and{" "}
              {curveOf(data, round.startModel).name.toLowerCase()}. It scores{" "}
              <span className="data font-bold">
                {(round.startAccuracy * 100).toFixed(1)}%
              </span>{" "}
              on messages it has never seen. You can afford one upgrade.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "data" as const,
                    label: `${round.moreData.times} times the data`,
                    detail: `${round.moreData.size} labelled messages instead of ${round.size}, same model.`,
                  },
                  {
                    id: "model" as const,
                    label: "The best other model",
                    detail: `${round.betterModel.name}, on the ${round.size} you already have.`,
                  },
                ] as const
              ).map((option, i) => {
                const yours = scene.called === option.id;
                const won = truth === option.id || truth === "either";
                const outcome =
                  option.id === "data" ? round.moreData : round.betterModel;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(option.id)}
                    className={`plate p-4 text-left transition-colors ${
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
                      {i + 1}
                    </span>
                    <span className="block text-[1.0625rem] font-semibold">
                      {option.label}
                    </span>
                    <span className="text-ink-soft mt-1 block text-[0.875rem]">
                      {option.detail}
                    </span>

                    {revealed ? (
                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-ink/20 mt-3 block border-t pt-3"
                      >
                        <span className="data block text-[1.5rem] font-bold">
                          {(outcome.accuracy * 100).toFixed(1)}%
                        </span>
                        <span
                          className={`label block ${
                            outcome.gain > 0
                              ? "text-teal-text"
                              : "text-pink-text"
                          }`}
                        >
                          {outcome.gain >= 0 ? "+" : ""}
                          {(outcome.gain * 100).toFixed(2)} points
                        </span>
                      </motion.span>
                    ) : null}
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
                    earned > 0 ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {truth === "either"
                    ? "Either. The two are within a fifth of a point of each other here."
                    : truth === "data"
                      ? "The data was worth more here."
                      : "The model was worth more here."}
                </p>
                <p className="prose-measure text-ink-soft mt-1 text-[0.9375rem]">
                  {round.size <= 50
                    ? "With this little data nothing else matters much. Every model is mostly guessing, and the fastest way out is more examples."
                    : "Past the first few hundred examples the curve flattens, and the same ten times more data buys a fraction of what it used to. That is when the model starts to matter."}
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.rounds.length
                    ? "Finish"
                    : "Next budget"}
                </button>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the curves…</p>
        )}
      </div>
    </GameShell>
  );
}
