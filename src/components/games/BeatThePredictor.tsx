"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { GameShareCard } from "@/components/GameShareCard";
import { playCue } from "@/lib/game/sound";
import {
  actOf,
  current,
  newScene,
  next,
  pick,
  pointsFor,
  type Option,
  type PredictorData,
  type PredictorRound,
  type PredictorScene,
  ROUND_SIZE,
  scoreOf,
  start as startRound,
} from "@/lib/game/predictor";

/**
 * Beat the Predictor.
 */

/**
 * What to print for an option.
 *
 * Every number here belongs to a token, and two of the true answers are words
 * the model cannot write in one: it scores " photos", and the question is
 * about photosynthesis. The word goes on screen and the split is said out loud
 * in the verdict, rather than printing the chunk and letting it read as the
 * answer.
 */
function wordOf(option: Option): string {
  return (option.label ?? option.text).trim();
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

/** What each kind of round is, in one plain line. The right word is a
 *  different kind of thing in each: what usually follows, what one author
 *  actually wrote, and what happens to be true. */
const KIND_LINES: Record<PredictorRound["kind"], string> = {
  phrase: "An everyday phrase",
  corpus: "From a real book: the right word is the one the author wrote",
  fact: "A fact: the right word is the true one",
};

/** Share of the four that counts as "most of its vote". */
const MOST = 0.5;

/**
 * What happened, in plain words, for somebody who has never heard the word
 * "token". The measured detail (rank, chunks, citation) stays one tap away.
 */
function plainVerdict(round: PredictorRound): string {
  const truth = `\u201c${wordOf(round.options[round.truth])}\u201d`;
  const pickOption = round.options[round.modelPick];
  const pick = `\u201c${wordOf(pickOption)}\u201d`;
  if (round.modelPick === round.truth) {
    if (round.kind === "phrase")
      return `It picked ${truth}. Easy: this phrase is everywhere.`;
    if (round.kind === "corpus")
      return `It picked ${truth}, same as the author.`;
    return `It picked ${truth}. Right this time: the true answer also sounded most likely.`;
  }
  if (round.kind === "phrase")
    return `It picked ${pick}. It rated that above ${truth}.`;
  if (round.kind === "corpus")
    return `It picked ${pick}, the usual word. The author wrote ${truth}.`;
  const most =
    pickOption.probability >= MOST
      ? " It put most of its vote on it, too."
      : "";
  return `It picked ${pick}. Wrong. It goes with what sounds likely and never checks facts.${most}`;
}

/** How the reveal unfolds, one round at a time. */
type Stage = "waiting" | "picked" | "bars" | "resolved";

export function BeatThePredictor({
  initialData,
  initialScene,
}: {
  /** The full dataset, embedded by the page at build time. Skips the fetch
   *  entirely when present. */
  initialData?: PredictorData;
  /** Round one, already dealt server-side, so the very first HTML this page
   *  sends is already the playing board, not a loading or ready screen. */
  initialScene?: PredictorScene;
} = {}) {
  const still = useReducedMotion();
  const [data, setData] = useState<PredictorData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<PredictorScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);
  const [stage, setStage] = useState<Stage>("waiting");

  // Falls back to a network fetch and a client-side deal only where a page
  // has not embedded round one server-side. The lesson page that matters most
  // for first paint always has. Kept as one async callback rather than a
  // second effect watching `data`, so nothing here sets state synchronously
  // in the effect body itself.
  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadPredictor().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 120 }, () => Math.random()),
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
        Array.from({ length: 120 }, () => Math.random()),
      ),
    );
    setPlaying(true);
    setStage("waiting");
  }, [data]);

  const round = current(scene);

  const choose = useCallback((i: number) => {
    playCue("tap");
    setScene((s) => pick(s, i));
    setStage("picked");
  }, []);
  const carryOn = useCallback(() => {
    setScene((s) => next(s));
    setStage("waiting");
  }, []);

  // Held silence, then the bars, then the verdict. Collapses to instant for
  // reduced motion rather than skipping steps, so the order stays honest.
  useEffect(() => {
    if (stage !== "picked") return;
    const t = setTimeout(
      () => {
        playCue("reveal");
        setStage("bars");
      },
      still ? 0 : 400,
    );
    return () => clearTimeout(t);
  }, [stage, still]);

  useEffect(() => {
    if (stage !== "bars" || !round) return;
    const bars = round.options.length;
    const totalMs = still ? 0 : 90 + bars * 130 + 350;
    const t = setTimeout(() => setStage("resolved"), totalMs);
    return () => clearTimeout(t);
  }, [stage, still, round]);

  const committed = scene.picked !== null;
  const showAnswer = stage === "bars" || stage === "resolved";
  const showVerdict = stage === "resolved";
  const result = round && committed ? scoreOf(round, scene.picked!) : null;
  const act = round ? actOf(scene.at) : null;

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

  /* Lowest probability first, highest last: the bar race's own winner lands
     at the end, whoever it turns out to belong to. */
  const barRank = round
    ? [...round.options.keys()].sort(
        (a, b) => round.options[a].probability - round.options[b].probability,
      )
    : [];

  return (
    <GameShell
      gameId="beat-the-predictor"
      name="Beat the Predictor"
      instruction="A sentence with its last word missing. You and the AI both guess it. Whoever picks the real word wins the round."
      howToPlay={{
        goal: "Pick the real missing word more often than the AI does.",
        steps: [
          "Read the sentence. Its last word is missing.",
          "Tap the word you think goes there. The AI guesses at the same time.",
          "See the AI's guess, how sure it was about each word, and the real word.",
        ],
        controls:
          "Tap or click a word, or press 1 to 4. Enter goes to the next round.",
        scoring:
          "100 points when you are right. Extra when you are right and the AI was wrong.",
      }}
      startLabel={data ? "Play" : "Loading…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !showVerdict
          ? "think"
          : result?.upset
            ? "celebrate"
            : result?.you
              ? "cheer"
              : "wince"
      }
      streak={showVerdict ? scene.streak : undefined}
      readouts={[
        { label: "You", value: scene.youRight, accent: true },
        { label: "AI", value: scene.modelRight },
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
            You {scene.youRight}, AI {scene.modelRight}
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            It is good at everyday phrases and slips on facts, because it goes
            with what sounds likely, not what is true. That is why ChatGPT can
            sound sure and still be wrong.
          </p>
          <GameShareCard
            gameName="Beat the Predictor"
            playerScore={String(scene.youRight)}
            modelScore={String(scene.modelRight)}
            resultLine={
              scene.youRight > scene.modelRight
                ? `Beat a language model ${scene.youRight}-${scene.modelRight} at guessing the next word.`
                : scene.youRight < scene.modelRight
                  ? `Lost to a language model ${scene.modelRight}-${scene.youRight} at guessing the next word.`
                  : `Tied a language model ${scene.youRight}-${scene.modelRight} at guessing the next word.`
            }
          />
        </div>
      }
      footer={
        data ? (
          <>
            The AI here is {data.model.name}, a small real language model. Every
            percentage is its own measured output, and the wrong options are
            words it rated highly itself.
          </>
        ) : failed ? (
          <>The game did not load.</>
        ) : (
          <>Loading…</>
        )
      }
    >
      <div className="min-h-[13rem] p-3 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round && act ? (
          <>
            {/* The premise, in the board itself, in words a newcomer
                already has. The whole lesson in two sentences, said before
                the first guess rather than explained after it. */}
            <p className="prose-measure text-ink-soft mb-2 text-[0.9375rem] leading-snug sm:mb-3">
              ChatGPT writes by guessing the next word. So does this small AI.
              Can you beat it?
            </p>
            <p
              className={`label mb-2 sm:mb-3 ${
                round.kind === "phrase" ? "text-ink-faint" : "text-pink-text"
              }`}
            >
              {KIND_LINES[round.kind]}
            </p>

            <p className="prose-measure mb-3 text-[1.125rem] leading-relaxed sm:mb-4">
              {round.prefix}{" "}
              <AnimatePresence mode="wait">
                {showAnswer ? (
                  <motion.span
                    key="filled"
                    initial={still ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: still ? 0 : 0.28 }}
                    className="bg-teal-wash text-teal-text font-data rounded-[2px] px-2 py-0.5 font-bold"
                  >
                    {wordOf(round.options[round.truth])}
                  </motion.span>
                ) : (
                  <motion.span
                    key="blank"
                    /* The pulse is `.ink-pulse` in globals.css, not an
                       animation here: repeating it for ever in JS holds the
                       animation library's frame loop open for as long as the
                       round is unanswered, which is nearly all of the time. */
                    className="bg-yellow-wash text-yellow-text font-data ink-pulse rounded-[2px] px-6 py-0.5"
                  >
                    ?
                  </motion.span>
                )}
              </AnimatePresence>
            </p>

            <p
              className={`label mb-1 transition-opacity ${
                showAnswer ? "text-ink-faint opacity-100" : "opacity-0"
              }`}
              aria-hidden={!showAnswer}
            >
              How the AI rated each answer
            </p>
            <ul className="mb-3 space-y-1.5 sm:mb-3 sm:space-y-1.5">
              {round.options.map((option, i) => {
                const isTruth = showAnswer && i === round.truth;
                const isYours = scene.picked === i;
                const isMachine = showAnswer && i === round.modelPick;
                const rank = barRank.indexOf(i);
                return (
                  <li key={`${round.id}-${i}`}>
                    <button
                      type="button"
                      disabled={committed}
                      onClick={() => choose(i)}
                      className={`tap plate w-full px-3 py-1.5 text-left transition-[border-color,background-color,transform] duration-150 sm:px-4 sm:py-2.5 ${
                        isTruth
                          ? "border-teal bg-teal-wash"
                          : isYours
                            ? "border-pink bg-pink-wash scale-[1.01]"
                            : committed
                              ? ""
                              : "hover:border-ink cursor-pointer"
                      }`}
                    >
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="label text-ink-faint">{i + 1}</span>
                        <span className="font-data text-[1.0625rem]">
                          {wordOf(option) || "␣"}
                        </span>
                        {isYours ? (
                          <span className="label text-pink-text">
                            your pick
                          </span>
                        ) : null}
                        {isMachine ? (
                          <span className="label text-blue-text">
                            AI&rsquo;s pick
                          </span>
                        ) : null}
                        {isTruth ? (
                          <span className="label text-teal-text">
                            right word
                          </span>
                        ) : null}
                      </span>

                      {/* The evidence. It arrives, rather than being there. */}
                      <span className="mt-1.5 flex items-center gap-3 sm:mt-2">
                        <span className="bg-paper-sunk border-ink/20 h-3 flex-1 overflow-hidden rounded-[1px] border">
                          <motion.span
                            className={`block h-full ${
                              isTruth
                                ? "bg-teal"
                                : isMachine
                                  ? "bg-blue"
                                  : "bg-ink/30"
                            }`}
                            initial={{ width: 0 }}
                            animate={{
                              width:
                                showAnswer && rank >= 0
                                  ? `${(option.probability / widest) * 100}%`
                                  : 0,
                            }}
                            transition={{
                              duration: still ? 0 : 0.4,
                              delay:
                                showAnswer && !still ? 0.09 + rank * 0.13 : 0,
                              ease: "easeOut",
                            }}
                          />
                        </span>
                        <span className="data text-ink-soft w-16 shrink-0 text-right text-xs tabular-nums">
                          {showAnswer
                            ? `${(option.probability * 100).toFixed(
                                option.probability < 0.01 ? 3 : 1,
                              )}%`
                            : "-"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* The room the verdict will need is held from the start. It is
                the same block before and after the pick, so a phone that had
                to scale the board down to fit does not have to scale it again
                the moment the answer lands. */}
            <div
              className="flex min-h-[13rem] flex-col justify-center sm:min-h-[7rem]"
              aria-live="polite"
            >
              {showVerdict && result ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: still ? 0 : 0.3 }}
                >
                  <p
                    className={`mb-1 text-[1.0625rem] font-bold ${
                      result.you ? "text-teal-text" : "text-pink-text"
                    }`}
                  >
                    {result.upset
                      ? `You win this round. +${pointsFor(round, scene.picked!)}`
                      : result.you
                        ? `You both got it. +${pointsFor(round, scene.picked!)}`
                        : result.model
                          ? "The AI wins this round."
                          : "Neither of you got it."}
                  </p>
                  <p className="prose-measure text-ink-soft mb-2 text-[0.9375rem] leading-snug">
                    {plainVerdict(round)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={carryOn}
                      className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                    >
                      {scene.at + 1 >= scene.rounds.length
                        ? "See the result"
                        : "Next round"}
                    </button>
                  </div>
                  {round.citation ? (
                    <details className="text-ink-faint mt-3 text-[0.8125rem]">
                      <summary className="cursor-pointer underline underline-offset-2">
                        Source
                      </summary>
                      <p className="mt-1">
                        {round.fact}{" "}
                        <a
                          href={round.citation.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline underline-offset-2"
                        >
                          Checked against {round.citation.title}
                        </a>
                        {round.citation.revision
                          ? `, revision ${round.citation.revision}.`
                          : "."}{" "}
                        {round.because}
                      </p>
                    </details>
                  ) : null}
                </motion.div>
              ) : (
                <p className="text-ink-soft text-[0.9375rem]">
                  Tap the word you think is missing.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The game did not load. Try refreshing the page."
              : "Loading…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
