"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  bandOf,
  call,
  CALLS,
  type CallId,
  current,
  type ForestData,
  type ForestScene,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start as startRound,
} from "@/lib/game/forest";

/**
 * Worth the Crowd. Sixty trees, and whether they are worth more than one.
 */

let cached: Promise<ForestData> | null = null;

function loadForest(): Promise<ForestData> {
  if (!cached) {
    cached = fetch("/data/forest.json").then((r) => {
      if (!r.ok) throw new Error(`forest: ${r.status}`);
      return r.json() as Promise<ForestData>;
    });
  }
  return cached;
}

export function WorthTheCrowd() {
  const [data, setData] = useState<ForestData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ForestScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadForest()
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

  const choose = useCallback((id: CallId) => setScene((s) => call(s, id)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const forest = current(scene);
  const revealed = scene.called !== null;
  const truth = forest ? bandOf(forest) : null;
  const earned = forest && scene.called ? pointsFor(forest, scene.called) : 0;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "3") choose(CALLS[Number(e.key) - 1].id);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  return (
    <GameShell
      gameId="worth-the-crowd"
      name="Worth the Crowd"
      instruction="Sixty trees, grown on the same messages, and what one of them scores on its own. What is the vote of all sixty worth? Read how they were built before answering."
      howToPlay={{
        goal: "Say how much the vote of sixty trees beats a single one by.",
        steps: [
          "Read how the trees were grown, and what an average single tree scores.",
          "Choose: nothing at all, a little, or a lot.",
          "The vote's real accuracy arrives, along with how often two of the trees disagree.",
        ],
        controls: "Tap or click a call, or press 1–3. Enter moves on.",
        scoring: "120 for the right band, 40 for the one next to it.",
      }}
      startLabel={data ? "Meet the first forest" : "Loading the forests…"}
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
        { label: "Right", value: scene.right },
        { label: "Streak", value: `×${scene.streak}` },
        {
          label: "Forest",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} called right
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            The forest that gained the most was made of the worst trees. Each of
            those asks a single question and gets 93 per cent on its own, and
            sixty of them together get nearly 96. The forest that gained nothing
            was made of the best trees, all identical. What a vote buys is not
            quality. It is the cancelling out of independent mistakes, and
            identical models make identical mistakes.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.name}. {data.note} Sixty trees per forest, scored on
            the {data.corpus.testSize} held-out messages.
          </>
        ) : failed ? (
          <>The forests did not load.</>
        ) : (
          <>Loading the forests…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {forest && data ? (
          <>
            <p className="label text-ink-faint mb-1">{forest.name}</p>
            <p className="prose-measure mb-3 text-[1.0625rem]">{forest.how}</p>
            <p className="text-ink-soft mb-5 text-[0.9375rem]">
              On its own, an average tree in this forest scores{" "}
              <span className="data text-[1.125rem] font-bold">
                {(forest.meanAlone * 100).toFixed(2)}%
              </span>{" "}
              on messages it has never seen. The best of them manages{" "}
              {(forest.bestAlone * 100).toFixed(2)}% and the worst{" "}
              {(forest.worstAlone * 100).toFixed(2)}%.
            </p>

            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              {CALLS.map((option, i) => {
                const yours = scene.called === option.id;
                const won = truth === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(option.id)}
                    className={`plate px-3 py-3 text-left transition-colors ${
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
                    <span className="block text-[0.9375rem] font-semibold">
                      {option.label}
                    </span>
                    <span className="text-ink-faint mt-1 block text-[0.8125rem]">
                      {option.means}
                    </span>
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="display-md mb-1">
                  <span
                    className={
                      earned >= 120 ? "text-teal-text" : "text-pink-text"
                    }
                  >
                    {(forest.together * 100).toFixed(2)}%
                  </span>
                  <span className="text-ink-faint text-base font-normal">
                    {" "}
                    for the vote of all {forest.trees}
                  </span>
                </p>
                <p className="prose-measure text-ink-soft text-[0.9375rem]">
                  {forest.gain < 0.002
                    ? "Nothing gained, because these trees are identical. Sixty copies of one opinion is one opinion, and a vote among them can only ever return it."
                    : `That is ${(forest.gain * 100).toFixed(2)} points better than an average tree in it. Two of these trees disagree with each other on ${(forest.disagreement * 100).toFixed(1)}% of messages, and that disagreement is exactly what the vote is spending.`}
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.rounds.length
                    ? "Finish"
                    : "Next forest"}
                </button>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the forests…</p>
        )}
      </div>
    </GameShell>
  );
}
