"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { HoldRoom } from "@/components/game/HoldRoom";
import {
  current,
  guess as makeGuess,
  type Guess,
  GUESSES,
  newScene,
  next,
  outcomeOf,
  phrasingOf,
  pointsFor,
  type PushData,
  type PushScene,
  ROUND_SIZE,
  start as startRound,
} from "@/lib/game/pushback";

/**
 * Pushback, say it firmly enough and watch what happens.
 */

let cached: Promise<PushData> | null = null;

function loadPushback(): Promise<PushData> {
  if (!cached) {
    cached = fetch("/data/pushback.json").then((r) => {
      if (!r.ok) throw new Error(`pushback: ${r.status}`);
      return r.json() as Promise<PushData>;
    });
  }
  return cached;
}

const CHOICES: Guess[] = ["holds", "flips"];

export function Pushback({
  initialData,
  initialScene,
}: {
  initialData?: PushData;
  initialScene?: PushScene;
} = {}) {
  const [data, setData] = useState<PushData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<PushScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadPushback().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 40 }, () => Math.random()),
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
        Array.from({ length: 40 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback(
    (g: Guess) => setScene((s) => makeGuess(s, g)),
    [],
  );
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.guessed !== null;
  const outcome = round ? outcomeOf(round) : null;
  const correct = revealed && scene.guessed === outcome;

  const question = round ? (
    <>
      <p className="mb-3 text-[0.9375rem] sm:mb-4">
        Someone tells the AI the answer is{" "}
        <span className="font-data text-pink-text font-bold">
          {round.wrong.trim()}
        </span>
        , then asks. What does it do?
      </p>
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {CHOICES.map((choice, i) => (
          <button
            key={choice}
            type="button"
            onClick={() => choose(choice)}
            className="tap plate hover:border-ink cursor-pointer px-4 py-3 text-left"
          >
            <span className="label text-ink-faint mb-1 block">{i + 1}</span>
            <span className="block text-[0.9375rem] font-semibold">
              {GUESSES[choice].label}
            </span>
            <span className="text-ink-soft block text-[0.875rem]">
              {GUESSES[choice].blurb}
            </span>
          </button>
        ))}
      </div>
    </>
  ) : null;

  /* The reveal for a given call. Drawn invisibly before the call too, with
     the true outcome standing in, so the board already holds its room. */
  const reveal = (guess: Guess, live: boolean) => {
    if (!round || !outcome) return null;
    const ok = guess === outcome;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        aria-live={live ? "polite" : undefined}
      >
        <p
          className={`mb-2 text-[0.9375rem] font-semibold sm:mb-3 ${
            ok ? "text-teal-text" : "text-pink-text"
          }`}
        >
          {ok
            ? `${GUESSES[outcome!].label}. +${pointsFor(round, guess)}`
            : `Actually, ${GUESSES[outcome!].label.toLowerCase()}.`}
        </p>

        {/* Two framings carry the whole idea: the wrong answer said first,
            then the right one said first. What it said back is the evidence. */}
        <ul className="mb-3 space-y-2">
          {(["insistent", "corrected"] as const).map((style) => {
            const phrasing = phrasingOf(round, style);
            if (!phrasing) return null;
            const said = (phrasing.says ?? phrasing.topText)
              .replace(/\n/g, "")
              .trim()
              .replace(/[,.]+$/, "");
            const lower = said.toLowerCase();
            const isWrong = lower.startsWith(round.wrong.trim().toLowerCase());
            const isRight = lower.startsWith(round.right.trim().toLowerCase());
            return (
              <li key={style}>
                <p className="label text-ink-faint mb-0.5">
                  {style === "insistent"
                    ? `Told \u201c${round.wrong.trim()}\u201d first`
                    : `Told \u201c${round.right.trim()}\u201d first`}
                </p>
                <p className="text-[0.9375rem]">
                  It says{" "}
                  <span
                    className={`data rounded-[2px] px-1.5 py-0.5 font-bold ${
                      isWrong
                        ? "bg-pink-wash text-pink-text"
                        : isRight
                          ? "bg-teal-wash text-teal-text"
                          : "bg-paper-sunk text-ink-soft"
                    }`}
                  >
                    {said || "nothing"}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>

        <p className="prose-measure text-ink-soft mb-2 text-[0.9375rem] leading-snug">
          {outcome === "flips"
            ? "It goes with whatever it was told first, true or false. It is not agreeing with you. It is copying you."
            : "It held on this one. It is not always this firm."}
        </p>
        <details className="text-ink-faint mb-3 text-[0.8125rem]">
          <summary className="cursor-pointer underline underline-offset-2">
            Source
          </summary>
          <p className="text-ink-faint mb-2 text-[0.8125rem] sm:mb-3">
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
              : "."}
          </p>
        </details>

        <button
          type="button"
          onClick={carryOn}
          className="plate misreg btn-primary font-display px-5 py-2 font-bold sm:py-2.5"
        >
          {scene.at + 1 >= scene.rounds.length ? "See the result" : "Next fact"}
        </button>
      </motion.div>
    );
  };

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1" || e.key === "2") choose(CHOICES[Number(e.key) - 1]);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  return (
    <GameShell
      gameId="pushback"
      name="Pushback"
      instruction="Someone tells the AI a wrong answer, then asks. Guess whether it holds firm or repeats them."
      howToPlay={{
        goal: "Guess what the AI does when told a wrong answer first.",
        steps: [
          "Read the fact.",
          "Someone tells the AI a wrong answer first. Guess what it does.",
          "See what it said.",
        ],
        controls: "Tap or click, or press 1 or 2.",
        scoring: "Points for a right guess.",
      }}
      startLabel={data ? "Play" : "Loading…"}
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
            {scene.right} of {scene.rounds.length} called right
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            It goes with what you said first. So when it agrees with you, that
            is not proof you were right. Ask without hinting at the answer.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Measured on {data.model.name}. For the same behaviour in chat
            assistants see{" "}
            <a
              href={data.literature.url}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2"
            >
              {data.literature.title}
            </a>
            .
          </>
        ) : failed ? (
          <>The game did not load.</>
        ) : (
          <>Loading…</>
        )
      }
    >
      <div className="min-h-[13rem] p-3 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round ? (
          <>
            <p className="label text-ink-faint mb-2">The fact</p>
            <p className="prose-measure mb-1 text-[1.0625rem]">{round.fact}</p>
            <HoldRoom
              shown={revealed ? reveal(scene.guessed!, true) : question}
              held={
                revealed ? question : outcome ? reveal(outcome, false) : null
              }
            />
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
