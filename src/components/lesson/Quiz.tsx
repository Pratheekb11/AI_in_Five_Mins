"use client";

import { useState } from "react";
import { useProgress } from "@/lib/progress";

/**
 * The check beat.
 *
 * Answering reveals the reasoning immediately, whether the answer was right or
 * wrong, the explanation is the teaching, and withholding it until the end
 * would waste the moment the learner most wants it. There is no penalty and no
 * timer; this is a check, not an exam.
 */

export type QuizQuestion = {
  prompt: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** Why that answer is right. Shown after any choice. */
  because: string;
};

export type QuizProps = {
  slug: string;
  questions: QuizQuestion[];
};

/**
 * A small stable hash of the prompt.
 *
 * Stable is the whole requirement. It has to give the same order on the server
 * and in the browser or the markup mismatches, and the same order on a reload
 * or a learner who retries a module would find the answers had moved.
 */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deal the options into a fixed but unguessable order.
 *
 * Written because the answers had drifted into a pattern nobody intended: 44 of
 * 49 questions across the site had their correct option second, the other 5
 * had it third, and not one had it first. That is a quiz you can score full
 * marks on without reading a single question, which is worse than no quiz.
 *
 * Ordering by a hash of the prompt rather than by chance keeps it deterministic
 *, no impure call during render, no hydration mismatch, while spreading the
 * answers across every position.
 */
function dealt(question: QuizQuestion): {
  options: string[];
  answer: number;
} {
  const order = question.options.map((_, i) => i);
  let seed = seedOf(question.prompt);

  // Fisher–Yates, driven by a xorshift on the seed so it is repeatable.
  for (let i = order.length - 1; i > 0; i--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    const j = seed % (i + 1);
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }

  return {
    options: order.map((i) => question.options[i]),
    answer: order.indexOf(question.answer),
  };
}

export function Quiz({ slug, questions }: QuizProps) {
  const { recordScore, scoreFor } = useProgress();
  const [picks, setPicks] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );

  /* Everything below indexes into the dealt order, not the authored one. */
  const rounds = questions.map(dealt);

  const answered = picks.filter((p) => p !== null).length;
  const correct = picks.filter((p, i) => p === rounds[i].answer).length;
  const done = answered === questions.length;
  const best = scoreFor(slug);

  function pick(questionIndex: number, optionIndex: number) {
    if (picks[questionIndex] !== null) return;

    const next = [...picks];
    next[questionIndex] = optionIndex;
    setPicks(next);

    const nowAnswered = next.filter((p) => p !== null).length;
    if (nowAnswered === questions.length) {
      const score =
        next.filter((p, i) => p === rounds[i].answer).length /
        questions.length;
      recordScore(slug, score);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-5">
        {questions.map((question, qi) => {
          const round = rounds[qi];
          const pickedIndex = picks[qi];
          const revealed = pickedIndex !== null;

          return (
            <li key={qi} className="plate p-5">
              <p className="font-display mb-4 text-lg font-bold">
                {question.prompt}
              </p>

              <div className="grid gap-2">
                {round.options.map((option, oi) => {
                  const isAnswer = oi === round.answer;
                  const isPicked = pickedIndex === oi;

                  let tone = "border-ink/30 bg-paper";
                  if (revealed && isAnswer) {
                    tone = "border-teal bg-teal-wash text-teal-text";
                  } else if (revealed && isPicked) {
                    tone = "border-pink bg-pink-wash text-pink-text";
                  } else if (revealed) {
                    tone = "border-ink/20 bg-paper opacity-50";
                  }

                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={revealed}
                      onClick={() => pick(qi, oi)}
                      className={`flex items-start gap-3 rounded-[2px] border px-3.5 py-2.5 text-left transition-colors ${tone} ${
                        revealed ? "cursor-default" : "hover:border-ink"
                      }`}
                    >
                      <span className="data mt-0.5 text-xs opacity-60">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="text-[0.9375rem]">{option}</span>
                      {revealed && isAnswer ? (
                        <span className="label ml-auto shrink-0 pt-1">
                          Correct
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {revealed ? (
                <p className="border-ink/20 text-ink-soft mt-4 border-t pt-3.5 text-[0.9375rem]">
                  {question.because}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div
        className="plate-flush bg-paper-sunk flex flex-wrap items-center justify-between gap-3 p-4"
        aria-live="polite"
      >
        <span className="label text-ink-faint">
          {done ? "Lesson complete" : `${answered} of ${questions.length} answered`}
        </span>
        <span className="data text-lg font-semibold">
          {correct} / {questions.length}
          {best !== undefined && done ? (
            <span className="text-ink-faint ml-2 text-xs font-normal">
              best {Math.round(best * questions.length)}/{questions.length}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
