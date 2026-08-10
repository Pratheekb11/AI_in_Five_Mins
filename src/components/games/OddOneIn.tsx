"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  call,
  type ClusterData,
  type ClusterScene,
  current,
  newScene,
  next,
  ROUNDS,
  start as startRound,
} from "@/lib/game/clusters";

/**
 * Odd One In. Six words from one group, and which of four joins them.
 */

let cached: Promise<ClusterData> | null = null;

function loadClusters(): Promise<ClusterData> {
  if (!cached) {
    cached = fetch("/data/clusters.json").then((r) => {
      if (!r.ok) throw new Error(`clusters: ${r.status}`);
      return r.json() as Promise<ClusterData>;
    });
  }
  return cached;
}

export function OddOneIn() {
  const [data, setData] = useState<ClusterData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ClusterScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadClusters()
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

  const choose = useCallback(
    (word: string) => setScene((s) => call(s, word)),
    [],
  );
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const correct = revealed && round && scene.called === round.answer;

  useEffect(() => {
    if (!playing || scene.done || !round) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= round.options.length) choose(round.options[n - 1]);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, round, choose, carryOn]);

  return (
    <GameShell
      gameId="odd-one-in"
      name="Odd One In"
      instruction="Six words an algorithm put in one group, with no labels and nobody telling it what any of them mean. Which of these four did it put there too?"
      howToPlay={{
        goal: "Spot which candidate belongs to the same discovered group.",
        steps: [
          "Read the six words already in the group.",
          "Pick the candidate you think the algorithm also put there.",
          "The real answer arrives, along with which group each of the others landed in.",
        ],
        controls: "Tap or click a word, or press 1–4. Enter moves on.",
        scoring: "100 a round. Some groups are meaningful and some are not.",
      }}
      startLabel={data ? "See the first group" : "Loading the groups…"}
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
          label: "Group",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} placed right
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Some of those groups were obvious and some were a shrug, and that is
            the honest state of clustering. Nobody labelled anything. The
            algorithm was handed 1,851 vectors and the number eight, and it
            returned eight groups whether or not there were eight things to
            find. Reading which of its groups mean something is the work, and no
            measure of cluster quality does it for you.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.name}, trained on {data.source.trainedOn}. Grouped by
            k-means in all {data.dims} dimensions, {data.words.length} words,
            settled after {data.iterations} passes.
          </>
        ) : failed ? (
          <>The groups did not load.</>
        ) : (
          <>Loading the groups…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round && data ? (
          <>
            <p className="label text-ink-faint mb-2">
              Six words the algorithm put together
            </p>
            <div className="mb-5 flex flex-wrap gap-2">
              {round.shows.map((word) => (
                <span
                  key={word}
                  className="font-data bg-paper-sunk border-ink/20 rounded-[2px] border px-2 py-1 text-[0.9375rem]"
                >
                  {word}
                </span>
              ))}
            </div>

            <p className="label text-ink-faint mb-2">
              Which of these joined them?
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              {round.options.map((word, i) => {
                const yours = scene.called === word;
                const won = word === round.answer;
                return (
                  <button
                    key={word}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(word)}
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
                    <span className="font-data block text-[1.0625rem] font-semibold">
                      {word}
                    </span>
                    {revealed ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-ink-faint mt-1 block text-[0.8125rem]"
                      >
                        group {data.assignment[data.words.indexOf(word)] + 1}
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
                    correct ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {correct ? "Right." : "Not this time."} It put{" "}
                  <span className="font-data">{round.answer}</span> in group{" "}
                  {round.cluster + 1}, alongside{" "}
                  {data.clusters[round.cluster].nearest.slice(0, 3).join(", ")}.
                </p>
                <p className="prose-measure text-ink-soft mt-1 text-[0.9375rem]">
                  That group has {data.clusters[round.cluster].size} words in
                  it, and nobody named it. It exists because those vectors sat
                  nearer to each other than to anything else.
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.rounds.length
                    ? "Finish"
                    : "Next group"}
                </button>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the groups…</p>
        )}
      </div>
    </GameShell>
  );
}
