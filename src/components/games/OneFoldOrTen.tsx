"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  call,
  type CrossvalData,
  current,
  type CvScene,
  isMisleading,
  modelOf,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start as startRound,
} from "@/lib/game/crossval";

/**
 * One Fold or Ten. The evidence you are usually given, and the answer you
 * usually want.
 */

let cached: Promise<CrossvalData> | null = null;

function loadCrossval(): Promise<CrossvalData> {
  if (!cached) {
    cached = fetch("/data/crossval.json").then((r) => {
      if (!r.ok) throw new Error(`crossval: ${r.status}`);
      return r.json() as Promise<CrossvalData>;
    });
  }
  return cached;
}

export function OneFoldOrTen({
  initialData,
  initialScene,
}: {
  initialData?: CrossvalData;
  initialScene?: CvScene;
} = {}) {
  const [data, setData] = useState<CrossvalData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<CvScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadCrossval().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 30 }, () => Math.random()),
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
        Array.from({ length: 30 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback((id: string) => setScene((s) => call(s, id)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const correct = revealed && round && scene.called === round.pair.truth;

  const shown = round?.pair.folds.find((f) => f.fold === round.fold);

  useEffect(() => {
    if (!playing || scene.done || !round) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") choose(round.pair.left);
      else if (e.key === "2") choose(round.pair.right);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, round, choose, carryOn]);

  return (
    <GameShell
      gameId="one-fold-or-ten"
      name="One Fold or Ten"
      instruction="Two models, and what each scored on one held-out slice of the messages. That is what a report gives you. Which model is actually better?"
      howToPlay={{
        goal: "Say which model is better overall, from a single slice of evidence.",
        steps: [
          "Read the two models and the one slice you are shown.",
          "Pick the better model.",
          "All ten slices arrive, and their averages settle it.",
        ],
        controls: "Tap or click a model, or press 1 or 2. Enter moves on.",
        scoring:
          "100 a call, and 100 more for backing the model that lost on the slice you were shown.",
      }}
      startLabel={data ? "See the first slice" : "Loading the folds…"}
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
          label: "Round",
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
            Half of those slices were chosen because they point the wrong way,
            so this game is harder than life. In life the trouble is worse in
            one respect: you cannot tell which kind of slice you are holding.
            Every close comparison between two models needs more than one, and
            the cheapest way to get more is to let every part of the data take
            its turn being held out.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.source.name}, {data.corpus.total} messages cut into{" "}
            {data.corpus.folds} blocks of about {data.corpus.blockSize}. Every
            model is trained on nine blocks and scored on the tenth, ten times
            over.
          </>
        ) : failed ? (
          <>The folds did not load.</>
        ) : (
          <>Loading the folds…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round && data && shown ? (
          <>
            <p className="label text-ink-faint mb-4">
              Slice {round.fold} of {data.corpus.folds} · about{" "}
              {data.corpus.blockSize} messages held out
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {([round.pair.left, round.pair.right] as const).map((id, i) => {
                const model = modelOf(data, id);
                const onFold = i === 0 ? shown.left : shown.right;
                const yours = scene.called === id;
                const won = round.pair.truth === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(id)}
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
                      {model.name}
                    </span>
                    <span className="text-ink-soft mt-1 block text-[0.875rem]">
                      {model.how}
                    </span>
                    <span className="data mt-3 block text-[1.5rem] font-bold">
                      {(onFold * 100).toFixed(1)}%
                    </span>
                    <span className="label text-ink-faint block">
                      on this slice
                    </span>

                    {revealed ? (
                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-ink/20 mt-3 block border-t pt-3"
                      >
                        <span className="label text-ink-faint block">
                          Across all {data.corpus.folds}
                        </span>
                        <span className="data block text-[1.25rem] font-bold">
                          {(model.mean * 100).toFixed(2)}%
                          <span className="text-ink-faint text-sm font-normal">
                            {" "}
                            ± {(model.sd * 100).toFixed(2)}
                          </span>
                        </span>
                        <span className="text-ink-faint block text-[0.8125rem]">
                          worst slice {(model.worstFold * 100).toFixed(1)}%,
                          best {(model.bestFold * 100).toFixed(1)}%
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
                    correct ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {correct ? "Right." : "Not this time."}{" "}
                  {modelOf(data, round.pair.truth).name} is better on average,
                  by {(round.pair.gap * 100).toFixed(2)} points.
                  {isMisleading(round)
                    ? " And the slice you were shown pointed the other way."
                    : ""}
                </p>
                <p className="prose-measure text-ink-soft mt-1 text-[0.9375rem]">
                  {round.pair.misleadingFolds.length} of the {data.corpus.folds}{" "}
                  slices disagree with the average on this pair. A gap of{" "}
                  {(round.pair.gap * 100).toFixed(2)} points is smaller than the
                  slice-to-slice wobble, which is what makes a single number
                  useless here.
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.rounds.length
                    ? "Finish"
                    : "Next slice"}
                </button>
                <span className="text-ink-faint ml-3 text-[0.8125rem]">
                  {pointsFor(round, scene.called ?? "")} points
                </span>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the folds…</p>
        )}
      </div>
    </GameShell>
  );
}
