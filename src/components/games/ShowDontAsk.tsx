"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  current,
  type ListenData,
  type ListenScene,
  newScene,
  next,
  pick,
  pointsFor,
  ROUND_SIZE,
  shownVariants,
  start as startRound,
  timesBare,
  winnerOf,
} from "@/lib/game/listen";

/**
 * Show, Don't Ask.
 *
 * One goal, five phrasings, and a call to make before any evidence appears.
 * Then all five measured probabilities arrive at once as bars, and the gap
 * between "please answer in one word" and a worked example is more than a
 * hundred times over.
 *
 * The bars land together rather than one at a time, because the comparison is
 * the point, you are meant to see the pattern phrasing tower over the polite
 * one, not read five numbers in sequence.
 */

let cached: Promise<ListenData> | null = null;

function loadListen(): Promise<ListenData> {
  if (!cached) {
    cached = fetch("/data/listen.json").then((r) => {
      if (!r.ok) throw new Error(`listen: ${r.status}`);
      return r.json() as Promise<ListenData>;
    });
  }
  return cached;
}

export function ShowDontAsk() {
  const [data, setData] = useState<ListenData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ListenScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadListen()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const begin = useCallback(() => {
    if (!data) return;
    setScene(startRound(data, Array.from({ length: 90 }, () => Math.random())));
    setPlaying(true);
  }, [data]);

  const choose = useCallback((id: string) => setScene((s) => pick(s, id)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const variants = shownVariants(scene);
  const revealed = scene.picked !== null;
  const winner = round ? winnerOf(round) : null;
  const correct = revealed && scene.picked === winner?.id;
  const widest = round
    ? Math.max(...round.variants.map((v) => v.probability), 1e-9)
    : 1;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= variants.length) choose(variants[n - 1].id);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn, variants]);

  return (
    <GameShell
      gameId="show-dont-ask"
      name="Show, Don't Ask"
      instruction="One thing you want out of the model, and five ways of asking for it. Pick the phrasing that you think gets it, then watch all five measured at once. Most of what people tell you about prompting turns out not to survive this."
      howToPlay={{
        goal: "Pick the phrasing that actually gets what you asked for.",
        steps: [
          "Read what you are trying to get out of the model.",
          "Five phrasings of the same request are listed. Pick the one you think works best.",
          "All five measured probabilities arrive at once, with how many times better than a bare question each one is.",
        ],
        controls: "Click a phrasing, or press 1–5. Enter moves on.",
        scoring: "120 for the winner, and more when the runner-up was close behind.",
      }}
      startLabel={data ? "Take the first one" : "Loading the measurements…"}
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
            scene.rounds.length || ROUND_SIZE
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} right
          </p>
          {data ? (
            <ul className="mb-3 space-y-1">
              {data.summary.map((row) => (
                <li key={row.style} className="flex items-baseline gap-3 text-[0.9375rem]">
                  <span className="data w-16 shrink-0 tabular-nums">
                    {row.medianTimesBare}×
                  </span>
                  <span className="text-ink-soft">{row.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-ink-soft text-[0.9375rem]">
            Telling it how to answer did almost nothing. Giving it a role to
            play did slightly less than nothing. Showing it one worked example
            beat both on every single item. Delegation is not conversation
            . If you want a particular shape of answer, put an example of
            that shape in front of it.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Measured on {data.model.name}, a base model with no
            instruction-following training at all, which is the point.
            The assistant you use has had that training, so polite instructions
            do work on it. What this shows is the floor: showing a pattern works
            even on a model that is not trying to please you, which is why it
            keeps working when the polite phrasing quietly stops.
          </>
        ) : failed ? (
          <>The measurements did not load.</>
        ) : (
          <>Loading the measurements…</>
        )
      }
    >
      <div className="min-h-[24rem] p-5 md:p-6">
        {round ? (
          <>
            <p className="label text-ink-faint mb-2">What you want</p>
            <p className="prose-measure mb-1 text-[1.0625rem]">{round.goal}</p>
            <p className="text-ink-faint mb-5 text-[0.8125rem]">
              Scored on the chance the model produces{" "}
              <span className="font-data">
                &ldquo;{round.target.trim()}&rdquo;
              </span>{" "}
              next.
            </p>

            <ul className="space-y-2">
              {variants.map((variant, i) => {
                const isWinner = revealed && variant.id === winner?.id;
                const isYours = scene.picked === variant.id;
                const multiple = timesBare(round, variant);
                return (
                  <li key={variant.id}>
                    <button
                      type="button"
                      disabled={revealed}
                      onClick={() => choose(variant.id)}
                      className={`plate w-full px-4 py-3 text-left transition-colors ${
                        isWinner
                          ? "border-teal bg-teal-wash"
                          : isYours
                            ? "border-pink bg-pink-wash"
                            : revealed
                              ? ""
                              : "hover:border-ink cursor-pointer"
                      }`}
                    >
                      <span className="mb-1 flex flex-wrap items-baseline gap-x-3">
                        <span className="label text-ink-faint">{i + 1}</span>
                        {revealed ? (
                          <span className="label text-ink-faint">
                            {data?.styles[variant.style]}
                          </span>
                        ) : null}
                        {isYours ? (
                          <span className="label text-pink-text">you</span>
                        ) : null}
                      </span>
                      <span className="font-data block text-[0.9375rem] whitespace-pre-wrap">
                        {variant.prompt}
                      </span>

                      {revealed ? (
                        <span className="mt-2 flex items-center gap-3">
                          <span className="bg-paper-sunk border-ink/20 h-3 flex-1 overflow-hidden rounded-[1px] border">
                            <motion.span
                              className={`block h-full ${
                                isWinner ? "bg-teal" : "bg-ink/30"
                              }`}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(variant.probability / widest) * 100}%`,
                              }}
                              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                            />
                          </span>
                          <span className="data text-ink-soft w-20 shrink-0 text-right text-xs tabular-nums">
                            {(variant.probability * 100).toFixed(
                              variant.probability < 0.001 ? 4 : 2,
                            )}
                            %
                          </span>
                          <span
                            className={`data w-16 shrink-0 text-right text-xs tabular-nums ${
                              multiple && multiple >= 2
                                ? "text-teal-text"
                                : multiple && multiple < 1
                                  ? "text-pink-text"
                                  : "text-ink-soft"
                            }`}
                          >
                            {multiple ? `${multiple.toFixed(multiple >= 10 ? 0 : 1)}×` : "-"}
                          </span>
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 min-h-[6rem]" aria-live="polite">
              {revealed && winner ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.3 }}
                >
                  <p
                    className={`mb-1 text-[0.9375rem] font-semibold ${
                      correct ? "text-teal-text" : "text-pink-text"
                    }`}
                  >
                    {correct
                      ? `Right. +${pointsFor(round, scene.picked!)}`
                      : "Not that one."}
                  </p>
                  <p className="prose-measure text-ink-soft mb-3 text-[0.9375rem]">
                    The winner was the phrasing that stopped asking and started
                    showing. Its own next word was &ldquo;
                    {winner.topText.replace(/\n/g, "⏎").trim() || "␣"}&rdquo;,
                    against &ldquo;
                    {round.variants
                      .find((v) => v.style === "bare")
                      ?.topText.replace(/\n/g, "⏎")
                      .trim() || "␣"}
                    &rdquo; for the bare question.
                  </p>
                  <button
                    type="button"
                    onClick={carryOn}
                    className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                  >
                    {scene.at + 1 >= scene.rounds.length
                      ? "See the result"
                      : "Next one"}
                  </button>
                </motion.div>
              ) : (
                <p className="text-ink-soft text-[0.9375rem]">
                  Keys 1&ndash;{variants.length} work. Pick the one you would
                  actually type.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The measurements did not load, so there is nothing to compare."
              : "Loading the measurements…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
