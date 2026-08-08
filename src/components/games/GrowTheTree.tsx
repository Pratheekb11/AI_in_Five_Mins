"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  call,
  current,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start as startRound,
  type TreeData,
  type TreeScene,
} from "@/lib/game/tree";

/**
 * Grow the Tree. One pile, five questions, which do you ask?
 *
 * This is the first module of the track running again, one level down. The
 * player is told how big the pile is and how much of it is spam, which is
 * everything the algorithm knows, and then picks the question to split it with.
 *
 * The rounds are real nodes from the real tree, and only the ones where the
 * choice is close. Where the best question is worth four times the next, the
 * algorithm has nothing to decide and neither does anybody else.
 */

let cached: Promise<TreeData> | null = null;

function loadTree(): Promise<TreeData> {
  if (!cached) {
    cached = fetch("/data/tree.json").then((r) => {
      if (!r.ok) throw new Error(`tree: ${r.status}`);
      return r.json() as Promise<TreeData>;
    });
  }
  return cached;
}

function pathWords(path: string[], data: TreeData): string {
  if (path.length === 0) return "Every training message";
  const parts: string[] = [];
  let node = data.tree;
  for (const step of path) {
    parts.push(`${step === "yes" ? "" : "not "}${node.label?.toLowerCase()}`);
    const nextNode = step === "yes" ? node.yes : node.no;
    if (!nextNode) break;
    node = nextNode;
  }
  return `Messages where: ${parts.join(", and ")}`;
}

export function GrowTheTree() {
  const [data, setData] = useState<TreeData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<TreeScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadTree()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const begin = useCallback(() => {
    if (!data) return;
    setScene(startRound(data, Array.from({ length: 20 }, () => Math.random())));
    setPlaying(true);
  }, [data]);

  const choose = useCallback((id: string) => setScene((s) => call(s, id)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const earned = round && scene.called ? pointsFor(round, scene.called) : 0;

  useEffect(() => {
    if (!playing || scene.done || !round) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= round.candidates.length) {
        choose(round.candidates[n - 1].id);
      } else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, round, choose, carryOn]);

  return (
    <GameShell
      gameId="grow-the-tree"
      name="Grow the Tree"
      instruction="A pile of messages, and five questions you could ask about them. Which one splits this pile best? Same measure as the first module: bits of uncertainty removed."
      howToPlay={{
        goal: "Choose the question the tree should ask at this node.",
        steps: [
          "Read how big the pile is and how much of it is spam.",
          "Pick the question you think separates it best.",
          "Every candidate's real information gain arrives.",
        ],
        controls: "Click a question, or press its number. Enter moves on.",
        scoring: "100 for the best question, 50 for one worth nearly as much.",
      }}
      startLabel={data ? "Take the first split" : "Loading the tree…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : earned >= 100
            ? scene.streak >= 3
              ? "celebrate"
              : "cheer"
            : "wince"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Best", value: scene.right },
        { label: "Streak", value: `×${scene.streak}` },
        {
          label: "Node",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} best splits found
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            That is the entire algorithm. There is no cleverness hidden
            underneath it: at every node it tries all twelve questions, keeps the
            one that removes most, and repeats on both piles. Which is why a
            tree can be read out loud, and why it is the model people reach for
            when somebody will have to justify a decision to a person.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.name}. Every gain is measured on the{" "}
            {data.corpus.trainSize} training messages at that node, on the same
            seeded split the rest of the site uses.
          </>
        ) : failed ? (
          <>The tree did not load.</>
        ) : (
          <>Loading the tree…</>
        )
      }
    >
      <div className="min-h-[24rem] p-5 md:p-6">
        {round && data ? (
          <>
            <p className="label text-ink-faint mb-1">
              {pathWords(round.path, data)}
            </p>
            <p className="prose-measure mb-1 text-[1.0625rem]">
              <span className="data font-bold">{round.size}</span> messages,{" "}
              <span className="data text-pink-text font-bold">{round.spam}</span>{" "}
              of them spam.
            </p>
            <p className="text-ink-soft mb-5 text-[0.9375rem]">
              That leaves {round.entropy.toFixed(3)} bits of uncertainty about
              this pile. Which question takes the most of it away?
            </p>

            <ul className="space-y-2">
              {round.candidates.map((candidate, i) => {
                const yours = scene.called === candidate.id;
                const won = candidate.id === round.answer;
                const widest = Math.max(
                  ...round.candidates.map((c) => c.gain),
                  0.0001,
                );
                return (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      disabled={revealed}
                      onClick={() => choose(candidate.id)}
                      className={`plate block w-full p-3 text-left transition-colors ${
                        !revealed
                          ? "hover:border-ink cursor-pointer"
                          : won
                            ? "border-teal bg-teal-wash"
                            : yours
                              ? "border-pink bg-pink-wash"
                              : ""
                      }`}
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-[0.9375rem] font-semibold">
                          <span className="text-ink-faint mr-2">{i + 1}</span>
                          {candidate.label}
                        </span>
                        {revealed ? (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="data text-[0.9375rem] font-bold tabular-nums"
                          >
                            {candidate.gain.toFixed(3)} bits
                          </motion.span>
                        ) : null}
                      </span>
                      {revealed ? (
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${(candidate.gain / widest) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.04 }}
                          className={`mt-2 block h-2 rounded-[1px] ${
                            won ? "bg-teal" : "bg-pink"
                          }`}
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {revealed ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <p
                  className={`text-[1.0625rem] font-semibold ${
                    earned >= 100 ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {earned >= 100
                    ? "That is the one the tree took."
                    : earned > 0
                      ? "Close. That question is nearly as good, and the tree took another."
                      : "The tree took a different question."}
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.rounds.length ? "Finish" : "Next node"}
                </button>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the tree…</p>
        )}
      </div>
    </GameShell>
  );
}
