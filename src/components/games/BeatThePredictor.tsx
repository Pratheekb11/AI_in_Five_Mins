"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  actOf,
  current,
  newScene,
  next,
  pick,
  pointsFor,
  type PredictorData,
  type PredictorScene,
  ROUND_SIZE,
  scoreOf,
  start as startRound,
} from "@/lib/game/predictor";

/**
 * Beat the Predictor.
 *
 * A sentence with the last word cut off, four options, and the machine picking
 * at the same time as you. Commit, and the model's real probabilities animate
 * in as bars underneath your choice.
 *
 * The bars are the teaching and they have to move. A static chart reads as an
 * illustration; a bar that grows to 97% under an answer you did not choose
 * reads as being beaten. Everything else on screen is deliberately still so
 * that the only motion in the room is the evidence arriving.
 */

/** "1st", "2nd", "148th" — a rank reads better than an index to a person. */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n.toLocaleString()}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n.toLocaleString()}${suffix}`;
}

let cached: Promise<PredictorData> | null = null;

function loadPredictor(): Promise<PredictorData> {
  if (!cached) {
    cached = fetch("/data/predictor.json").then((r) => {
      if (!r.ok) throw new Error(`predictor: ${r.status}`);
      return r.json() as Promise<PredictorData>;
    });
  }
  return cached;
}

export function BeatThePredictor() {
  const [data, setData] = useState<PredictorData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<PredictorScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPredictor()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const begin = useCallback(() => {
    if (!data) return;
    setScene(startRound(data, Array.from({ length: 120 }, () => Math.random())));
    setPlaying(true);
  }, [data]);

  const choose = useCallback((i: number) => setScene((s) => pick(s, i)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.picked !== null;
  const result = round && revealed ? scoreOf(round, scene.picked!) : null;
  const act = actOf(scene.at);

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4") choose(Number(e.key) - 1);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  const widest = round
    ? Math.max(...round.options.map((o) => o.probability), 0.0001)
    : 1;

  return (
    <GameShell
      gameId="beat-the-predictor"
      name="Beat the Predictor"
      instruction="A sentence, with its last word taken away. You pick one of four. The machine picks at the same time, and then its real odds arrive as bars. Nine rounds, and it is not the same game all the way through."
      startLabel={data ? "Play the machine" : "Loading the odds…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : result?.upset
            ? "celebrate"
            : result?.you
              ? "cheer"
              : "wince"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "You", value: scene.youRight },
        { label: "Machine", value: scene.modelRight },
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
            You {scene.youRight}, machine {scene.modelRight}
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            {scene.upsets > 0
              ? `${scene.upsets} ${scene.upsets === 1 ? "round" : "rounds"} where you were right and it was confidently wrong.`
              : "It did not put a foot wrong against you this time. Go again — act three is where it falls over."}
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            It won the ordinary sentences because that is precisely what it is:
            a machine for guessing what usually comes next. It lost the book,
            and it lost the facts, for the same reason. Nothing in it is asking
            what is true &mdash; only what is likely.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Every percentage is {data.model.name}&rsquo;s own output, measured
            over {data.measuredSentences} sentences from {data.corpus.name}{" "}
            and printed unrounded. The wrong options are not invented &mdash; they
            are tokens the model itself ranked highly for that sentence.
          </>
        ) : failed ? (
          <>The odds did not load.</>
        ) : (
          <>Loading the odds…</>
        )
      }
    >
      <div className="min-h-[24rem] p-5 md:p-6">
        {round ? (
          <>
            <p className="label text-ink-faint mb-3">{act.name}</p>

            <p className="prose-measure mb-5 text-[1.125rem] leading-relaxed">
              {round.prefix}{" "}
              <AnimatePresence mode="wait">
                {revealed ? (
                  <motion.span
                    key="filled"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                    className="bg-teal-wash text-teal-text font-data rounded-[2px] px-2 py-0.5 font-bold"
                  >
                    {round.options[round.truth].text.trim()}
                  </motion.span>
                ) : (
                  <motion.span
                    key="blank"
                    className="bg-yellow-wash text-yellow-text font-data rounded-[2px] px-6 py-0.5"
                    animate={{ opacity: [1, 0.45, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >
                    ?
                  </motion.span>
                )}
              </AnimatePresence>
            </p>

            <ul className="mb-4 space-y-2">
              {round.options.map((option, i) => {
                const isTruth = revealed && i === round.truth;
                const isYours = scene.picked === i;
                const isMachine = revealed && i === round.modelPick;
                return (
                  <li key={`${round.id}-${i}`}>
                    <button
                      type="button"
                      disabled={revealed}
                      onClick={() => choose(i)}
                      className={`plate w-full px-4 py-3 text-left transition-colors ${
                        isTruth
                          ? "border-teal bg-teal-wash"
                          : isYours
                            ? "border-pink bg-pink-wash"
                            : revealed
                              ? ""
                              : "hover:border-ink cursor-pointer"
                      }`}
                    >
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="label text-ink-faint">{i + 1}</span>
                        <span className="font-data text-[1.0625rem]">
                          {option.text.trim() || "␣"}
                        </span>
                        {isYours ? (
                          <span className="label text-pink-text">you</span>
                        ) : null}
                        {isMachine ? (
                          <span className="label text-blue-text">machine</span>
                        ) : null}
                        {isTruth ? (
                          <span className="label text-teal-text">true</span>
                        ) : null}
                      </span>

                      {/* The evidence. It arrives, rather than being there. */}
                      <span className="mt-2 flex items-center gap-3">
                        <span className="bg-paper-sunk border-ink/20 h-3 flex-1 overflow-hidden rounded-[1px] border">
                          <motion.span
                            className={`block h-full ${
                              isTruth ? "bg-teal" : isMachine ? "bg-blue" : "bg-ink/30"
                            }`}
                            initial={{ width: 0 }}
                            animate={{
                              width: revealed
                                ? `${(option.probability / widest) * 100}%`
                                : 0,
                            }}
                            transition={{
                              duration: 0.7,
                              delay: revealed ? 0.15 + i * 0.08 : 0,
                              ease: "easeOut",
                            }}
                          />
                        </span>
                        <span className="data text-ink-soft w-16 shrink-0 text-right text-xs tabular-nums">
                          {revealed
                            ? `${(option.probability * 100).toFixed(
                                option.probability < 0.01 ? 3 : 1,
                              )}%`
                            : "—"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="min-h-[7rem]" aria-live="polite">
              {revealed && result ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <p
                    className={`mb-1 text-[0.9375rem] font-semibold ${
                      result.you ? "text-teal-text" : "text-pink-text"
                    }`}
                  >
                    {result.upset
                      ? `You got it, the machine did not — and it was ${(
                          round.options[round.modelPick].probability * 100
                        ).toFixed(0)}% sure. +${pointsFor(round, scene.picked!)}`
                      : result.you
                        ? `Right, and so was the machine. +${pointsFor(round, scene.picked!)}`
                        : result.model
                          ? "The machine got this one and you did not."
                          : "You both missed it."}
                  </p>
                  <p className="prose-measure text-ink-soft mb-1 text-[0.9375rem]">
                    {round.because}
                  </p>
                  <p className="text-ink-faint mb-3 text-[0.8125rem]">
                    The true word was the model&rsquo;s{" "}
                    {ordinal(round.answerRank + 1)} choice out of 50,257.
                    {round.fact ? ` ${round.fact}` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={carryOn}
                    className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                  >
                    {scene.at + 1 >= scene.rounds.length
                      ? "See the result"
                      : "Next round"}
                  </button>
                </motion.div>
              ) : (
                <p className="text-ink-soft text-[0.9375rem]">
                  Pick one. Keys 1&ndash;4 work too. The machine has already
                  chosen &mdash; you just cannot see it yet.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The odds did not load, so there is nothing to play against."
              : "Loading the odds…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
