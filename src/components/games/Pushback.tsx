"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
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

export function Pushback() {
  const [data, setData] = useState<PushData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<PushScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPushback()
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
    (g: Guess) => setScene((s) => makeGuess(s, g)),
    [],
  );
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.guessed !== null;
  const outcome = round ? outcomeOf(round) : null;
  const correct = revealed && scene.guessed === outcome;
  const insistent = round ? phrasingOf(round, "insistent") : undefined;

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
      instruction="A fact nobody disputes, and the same question put four ways: flat, with a nudge, with the wrong answer asserted first, and with the right one asserted first. Call which way it goes before you see the numbers."
      howToPlay={{
        goal: "Predict what the model does when somebody insists on a wrong answer.",
        steps: [
          "Read the fact. Nobody disputes it.",
          "Somebody is about to assert the wrong answer before asking. Say whether the model holds its ground or goes with what it was told.",
          "The same question is then shown put four ways, with the true and false answers racing each other under each one.",
        ],
        controls: "Tap or click a choice, or press 1–2. Enter moves on.",
        scoring:
          "120 for the right call, more when the framing swung the answer a long way.",
      }}
      startLabel={data ? "Lean on it" : "Loading the measurements…"}
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
            {scene.right} of {scene.rounds.length} called right
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Put the false answer in front of it and the false answer wins. Put
            the true one there and the true one wins, just as hard. It is not
            being persuaded by you. It is copying you.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Which is the practical bit: when a model agrees with you, that is
            not evidence you were right. It is evidence you said it first. If
            you want to know what it actually has, ask in a fresh chat without
            telling it what you are hoping to hear.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Measured on {data.model.name}, which has had no training to be
            agreeable. So this is not sycophancy itself. It is the mechanism
            underneath it. For the behaviour in real assistants see{" "}
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
          <>The measurements did not load.</>
        ) : (
          <>Loading the measurements…</>
        )
      }
    >
      <div className="min-h-[24rem] p-5 md:p-6">
        {round ? (
          <>
            <p className="label text-ink-faint mb-2">The fact</p>
            <p className="prose-measure mb-1 text-[1.0625rem]">{round.fact}</p>
            <p className="text-ink-faint mb-5 text-[0.8125rem]">
              Someone is about to insist the answer is{" "}
              <span className="font-data">{round.wrong.trim()}</span>.
            </p>

            {!revealed ? (
              <>
                <p className="label text-ink-faint mb-2">
                  When they assert it first, what does the model do?
                </p>
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  {CHOICES.map((choice, i) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => choose(choice)}
                      className="plate hover:border-ink cursor-pointer px-4 py-3 text-left"
                    >
                      <span className="label text-ink-faint mb-1 block">
                        {i + 1}
                      </span>
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
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                aria-live="polite"
              >
                <p
                  className={`mb-3 text-[0.9375rem] font-semibold ${
                    correct ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {correct
                    ? `${GUESSES[outcome!].label}. +${pointsFor(round, scene.guessed!)}`
                    : `Actually, ${GUESSES[outcome!].label.toLowerCase()}.`}
                </p>

                <ul className="mb-4 space-y-3">
                  {round.phrasings.map((phrasing, i) => (
                    <li key={phrasing.id}>
                      <p className="label text-ink-faint mb-1">
                        {data?.styles[phrasing.style]}
                      </p>
                      {/* The prompt, and then what it actually said. Two
                          probability bars are the measurement; the model
                          finishing the sentence with "Moon." because somebody
                          insisted is the thing anybody feels. */}
                      <p className="font-data bg-paper-sunk border-ink/20 mb-1.5 rounded-[2px] border px-3 py-1.5 text-[0.875rem]">
                        {phrasing.prompt}{" "}
                        {(() => {
                          const said = (phrasing.says ?? phrasing.topText)
                            .replace(/\n/g, "")
                            .trim();
                          if (!said) return <span className="text-ink-faint">…</span>;
                          const caved = said
                            .toLowerCase()
                            .startsWith(round.wrong.trim().toLowerCase());
                          return (
                            <span
                              className={`rounded-[2px] border px-1.5 py-0.5 font-bold ${
                                caved
                                  ? "border-pink-text/40 bg-pink-wash text-pink-text"
                                  : "border-teal-text/40 bg-teal-wash text-teal-text"
                              }`}
                            >
                              {said}
                            </span>
                          );
                        })()}
                      </p>
                      {[
                        {
                          label: round.right.trim(),
                          side: phrasing.right,
                          ink: "bg-teal",
                          tone: "text-teal-text",
                        },
                        {
                          label: round.wrong.trim(),
                          side: phrasing.wrong,
                          ink: "bg-pink",
                          tone: "text-pink-text",
                        },
                      ].map((row, j) => (
                        <span
                          key={row.label}
                          className="mb-1 flex items-center gap-3"
                        >
                          <span
                            className={`font-data w-20 shrink-0 text-right text-xs ${row.tone}`}
                          >
                            {row.label}
                          </span>
                          <span className="bg-paper-sunk border-ink/20 h-3 flex-1 overflow-hidden rounded-[1px] border">
                            <motion.span
                              className={`block h-full ${row.ink}`}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${row.side.probability * 100}%`,
                              }}
                              transition={{
                                duration: 0.6,
                                delay: 0.15 + i * 0.12 + j * 0.05,
                                ease: "easeOut",
                              }}
                            />
                          </span>
                          <span className="data text-ink-soft w-14 shrink-0 text-right text-xs tabular-nums">
                            {(row.side.probability * 100).toFixed(1)}%
                          </span>
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>

                <p className="prose-measure text-ink-soft mb-2 text-[0.9375rem]">
                  {outcome === "flips"
                    ? `Asserting the wrong answer put it at ${(
                        (insistent?.wrong.probability ?? 0) * 100
                      ).toFixed(1)}% against ${(
                        (insistent?.right.probability ?? 0) * 100
                      ).toFixed(
                        1,
                      )}% for the truth. Look at the last row though: asserting the right answer works exactly as hard in the other direction. It is not agreeing with you. It is copying you.`
                    : "It held on this one. But look at how much the framing still moved both numbers. Nothing about the model changed between those four rows. Only the sentence in front of it did."}
                </p>
                <p className="text-ink-faint mb-3 text-[0.8125rem]">
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

                <button
                  type="button"
                  onClick={carryOn}
                  className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                >
                  {scene.at + 1 >= scene.rounds.length
                    ? "See the result"
                    : "Next fact"}
                </button>
              </motion.div>
            )}
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The measurements did not load, so there is nothing to lean on."
              : "Loading the measurements…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
