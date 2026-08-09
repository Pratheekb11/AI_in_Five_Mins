"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  call,
  current,
  isTrap,
  newScene,
  next,
  ROUNDS,
  type SplitData,
  type SplitModel,
  type SplitScene,
  start as startRound,
  winnerOf,
} from "@/lib/game/split";

/**
 * The Holdout. Two models, two training scores, one question.
 */

let cached: Promise<SplitData> | null = null;

function loadSplit(): Promise<SplitData> {
  if (!cached) {
    cached = fetch("/data/split.json").then((r) => {
      if (!r.ok) throw new Error(`split: ${r.status}`);
      return r.json() as Promise<SplitData>;
    });
  }
  return cached;
}

function Card({
  model,
  revealed,
  chosen,
  won,
}: {
  model: SplitModel;
  revealed: boolean;
  chosen: boolean;
  won: boolean;
}) {
  return (
    <div
      className={`plate h-full p-4 transition-colors ${
        !revealed
          ? ""
          : won
            ? "border-teal bg-teal-wash"
            : chosen
              ? "border-pink bg-pink-wash"
              : ""
      }`}
    >
      <p className="text-[1.0625rem] font-semibold">{model.name}</p>
      <p className="text-ink-soft mt-1 text-[0.875rem]">{model.how}</p>

      <p className="label text-ink-faint mt-3">
        Scored on its own training data
      </p>
      <p className="data text-[1.5rem] font-bold">
        {(model.train.accuracy * 100).toFixed(1)}%
      </p>

      {revealed ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border-ink/20 mt-3 border-t pt-3"
        >
          <p className="label text-ink-faint">On messages it has never seen</p>
          <p
            className={`data text-[1.5rem] font-bold ${
              model.gap > 0.05 ? "text-pink-text" : "text-teal-text"
            }`}
          >
            {(model.test.accuracy * 100).toFixed(1)}%
          </p>
          <p className="text-ink-soft mt-1 text-[0.875rem]">{model.why}</p>
        </motion.div>
      ) : null}
    </div>
  );
}

export function Holdout() {
  const [data, setData] = useState<SplitData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<SplitScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSplit()
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
      gameId="holdout"
      name="The Holdout"
      instruction="Two models, and the only number anybody ever puts in a report: what each one scored on the data it was built from. Which will do better on messages neither has seen?"
      howToPlay={{
        goal: "Pick the model that holds up on unseen messages, given only its training score.",
        steps: [
          "Read what each model does, and what it scored on its own training data.",
          "Choose the one you think does better on the held-out messages.",
          "Both held-out scores appear, along with why each one behaves as it does.",
        ],
        controls: "Tap or click a model, or press 1 or 2. Enter moves on.",
        scoring:
          "100 a call, plus 80 when the winner is the one whose training score looked worse.",
      }}
      startLabel={data ? "Open the envelope" : "Loading the results…"}
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
            The two models that scored a perfect hundred are the two that
            memorised. That is not a coincidence and it is not a trick: a
            perfect score on your own training data is the signature of a model
            that has filed the answers rather than learned anything. Whenever
            somebody quotes you an accuracy, the only useful question is which
            data it was measured on.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.name}. Every model here is trained on the same{" "}
            {data.corpus.trainSize} messages and scored twice: on those, and on
            the {data.corpus.testSize} it never saw. Same seeded split as the
            rest of the site.
          </>
        ) : failed ? (
          <>The results did not load.</>
        ) : (
          <>Loading the results…</>
        )
      }
    >
      <div className="min-h-[24rem] p-5 md:p-6">
        {pair ? (
          <>
            <p className="label text-ink-faint mb-4">
              Which does better on messages neither has ever seen?
            </p>

            <div className="grid items-stretch gap-3 sm:grid-cols-2">
              {(["left", "right"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  disabled={revealed}
                  onClick={() => choose(side)}
                  className={`block h-full text-left ${
                    revealed ? "" : "cursor-pointer"
                  }`}
                >
                  <Card
                    model={pair[side]}
                    revealed={revealed}
                    chosen={scene.called === side}
                    won={winner === side}
                  />
                </button>
              ))}
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
                  {pair[winner ?? "left"].name} holds up better.
                  {isTrap(pair)
                    ? " And its training score was the lower of the two, which is the whole lesson."
                    : ""}
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
          <p className="text-ink-soft">Loading the results…</p>
        )}
      </div>
    </GameShell>
  );
}
