"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { HoldRoom } from "@/components/game/HoldRoom";
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

export function OddOneIn({
  initialData,
  initialScene,
}: {
  initialData?: ClusterData;
  initialScene?: ClusterScene;
} = {}) {
  const [data, setData] = useState<ClusterData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ClusterScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadClusters().catch(() => null));
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

  /* The verdict for this group. Drawn invisibly before the call too, so the
     board already holds its room and answering moves nothing. */
  const verdict = (ok: boolean, live: boolean) => {
    if (!round || !data) return null;
    return (
      <div aria-live={live ? "polite" : undefined}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          /* On a phone the verdict, then Next group, then why. */
          className="mt-4 flex flex-col sm:mt-5 sm:block"
        >
          <p
            className={`order-1 text-[1.0625rem] font-semibold ${
              ok ? "text-teal-text" : "text-pink-text"
            }`}
          >
            {ok ? "Right." : "Not this time."} It put{" "}
            <span className="font-data">{round.answer}</span> in group{" "}
            {round.cluster + 1}, alongside{" "}
            {data.clusters[round.cluster].nearest.slice(0, 3).join(", ")}.
          </p>
          <p className="prose-measure text-ink-soft order-3 mt-2 text-[0.9375rem] sm:mt-1">
            That group has {data.clusters[round.cluster].size} words in it, and
            nobody named it. It exists because those vectors sat nearer to each
            other than to anything else.
          </p>
          <button
            type="button"
            onClick={carryOn}
            className="plate misreg btn-primary font-display order-2 mt-3 self-start px-5 py-2.5 font-bold sm:mt-4"
          >
            {scene.at + 1 >= scene.rounds.length ? "Finish" : "Next group"}
          </button>
        </motion.div>
      </div>
    );
  };

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
            {/* The premise. A board that opens on a bare task reads as a
                quiz somebody forgot to write the question for. */}
            <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-4">
              <span className="sm:hidden">
                Nobody labelled these. Pick the word the algorithm put in with
                the six.
              </span>
              <span className="hidden sm:inline">
                Nobody labelled these groups. An algorithm sorted the words by
                the company they keep in real text, and these six came out
                together. Pick the word it put in with them.
              </span>
            </p>
            <p className="label text-ink-faint mb-2">
              Six words the algorithm put together
            </p>
            <div className="mb-4 flex flex-wrap gap-2 sm:mb-5">
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
            {/* Four single words: two by two on a phone, a row of four wide. */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {round.options.map((word, i) => {
                const yours = scene.called === word;
                const won = word === round.answer;
                return (
                  <button
                    key={word}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(word)}
                    className={`plate px-3 py-2 text-left transition-colors sm:py-3 ${
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
                    {/* Always drawn, invisible until the reveal, so the cards
                        are one height before and after the call. */}
                    <motion.span
                      initial={false}
                      animate={{ opacity: revealed ? 1 : 0 }}
                      aria-hidden={!revealed}
                      className="text-ink-faint mt-1 block text-[0.8125rem]"
                    >
                      group {data.assignment[data.words.indexOf(word)] + 1}
                    </motion.span>
                  </button>
                );
              })}
            </div>

            <HoldRoom
              shown={revealed ? verdict(Boolean(correct), true) : null}
              held={revealed ? null : verdict(true, false)}
            />
          </>
        ) : (
          <p className="text-ink-soft">Loading the groups…</p>
        )}
      </div>
    </GameShell>
  );
}
