"use client";

import { useCallback, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { NEXT_WORD } from "@/lib/nextWord";

/**
 * You versus a next-word guesser.
 *
 * The opponent is a real language model, just an extremely primitive one: it
 * counted which word followed which across a whole book and guesses the most
 * common continuation. One word of context. No idea what anything means.
 *
 * It gets a third of these right, which is the point of the round. That is what
 * counting alone buys you. A modern model is the same job — guess the next
 * piece of text — with thousands of words of context instead of one, and enough
 * scale that the guessing starts to look like knowing.
 */

const ROUNDS = 8;

type Verdict = "right" | "wrong";

export function NextWord() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [youScore, setYouScore] = useState(0);
  const [modelScore, setModelScore] = useState(0);
  const [history, setHistory] = useState<Verdict[]>([]);

  const rounds = NEXT_WORD.rounds.slice(0, ROUNDS);
  const round = rounds[at];

  const start = useCallback(() => {
    setAt(0);
    setPicked(null);
    setYouScore(0);
    setModelScore(0);
    setHistory([]);
    setPhase("playing");
  }, []);

  function pick(option: string) {
    if (picked !== null || !round) return;
    setPicked(option);

    const youRight = option === round.truth;
    const modelRight = round.modelGuess === round.truth;
    if (youRight) setYouScore((s) => s + 1);
    if (modelRight) setModelScore((s) => s + 1);
    setHistory((h) => [...h, youRight ? "right" : "wrong"]);
  }

  function next() {
    if (at + 1 >= rounds.length) {
      setPhase("over");
      return;
    }
    setAt((n) => n + 1);
    setPicked(null);
  }

  const revealed = picked !== null;

  return (
    <GameShell
      gameId="nextword"
      name="Guess the next word"
      instruction="You will see the middle of a sentence from a real book. Pick the word that actually came next. A very simple guessing machine is playing the same rounds against you."
      startLabel="Play"
      phase={phase}
      onStart={start}
      finalScore={youScore}
      readouts={[
        { label: "You", value: youScore, accent: true },
        { label: "Machine", value: modelScore },
        { label: "Round", value: `${Math.min(at + 1, rounds.length)}/${rounds.length}` },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-3">
            You {youScore} &mdash; {modelScore} the machine
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            {youScore > modelScore
              ? "You beat it, and you should have. It has one word of context and no idea what any of it means — it only knows which word usually came next."
              : youScore === modelScore
                ? "A draw, against something that only counts which word usually followed which. It has no idea what any of it means."
                : "It beat you, on counting alone. It has one word of context and no understanding of anything."}{" "}
            Now imagine that same trick with thousands of words of context and
            far more text than any person could read. That is a large language
            model.
          </p>
        </div>
      }
      footer={
        <>
          Opponent: a bigram model counted from {NEXT_WORD.source.title} &mdash;{" "}
          {NEXT_WORD.model.trainedOnWords.toLocaleString()} words,{" "}
          {NEXT_WORD.model.vocabulary.toLocaleString()} distinct.
        </>
      }
    >
      <div className="min-h-[16rem] p-5 md:p-6">
        {round ? (
          <>
            <p className="label text-ink-faint mb-3">
              What came next in the book?
            </p>

            <p className="font-data bg-paper-sunk border-ink/25 mb-5 rounded-[2px] border px-4 py-4 text-lg leading-relaxed">
              <span className="text-ink-faint">…{round.lead} </span>
              <span className="text-ink font-semibold">{round.cue}</span>{" "}
              <span
                className={
                  revealed
                    ? "text-teal-text font-semibold"
                    : "bg-yellow-wash text-yellow-text rounded-[2px] px-2"
                }
              >
                {revealed ? round.truth : "?"}
              </span>
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {round.options.map((option) => {
                const isTruth = option === round.truth;
                const isPicked = picked === option;
                const isModel = round.modelGuess === option;

                let tone = "border-ink/30 bg-paper hover:border-ink";
                if (revealed && isTruth) {
                  tone = "border-teal bg-teal-wash text-teal-text";
                } else if (revealed && isPicked) {
                  tone = "border-pink bg-pink-wash text-pink-text";
                } else if (revealed) {
                  tone = "border-ink/20 bg-paper opacity-45";
                }

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={revealed}
                    onClick={() => pick(option)}
                    className={`font-data flex items-center justify-between gap-2 rounded-[2px] border px-3.5 py-3 text-left transition-colors ${tone}`}
                  >
                    <span>{option}</span>
                    <span className="flex gap-1.5">
                      {revealed && isPicked ? (
                        <span className="label">you</span>
                      ) : null}
                      {revealed && isModel ? (
                        <span className="label">machine</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <div
                className="border-ink/20 mt-5 border-t pt-4"
                aria-live="polite"
              >
                <p className="text-ink-soft mb-4 text-[0.9375rem]">
                  The machine said{" "}
                  <span className="font-data text-ink font-semibold">
                    {round.modelGuess}
                  </span>{" "}
                  and was {Math.round(round.modelConfidence * 100)}% sure
                  {round.modelGuess === round.truth
                    ? " — and it was right."
                    : " — and it was wrong. It was confident anyway."}
                </p>
                <button
                  type="button"
                  onClick={next}
                  className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                >
                  {at + 1 >= rounds.length ? "See the result" : "Next word"}
                </button>
              </div>
            ) : null}

            <span className="mt-5 flex gap-1" aria-hidden="true">
              {rounds.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-[1px] ${
                    history[i] === "right"
                      ? "bg-teal"
                      : history[i] === "wrong"
                        ? "bg-pink"
                        : "bg-ink/15"
                  }`}
                />
              ))}
            </span>
          </>
        ) : null}
      </div>
    </GameShell>
  );
}
