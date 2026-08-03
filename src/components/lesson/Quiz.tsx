"use client";

import { useState } from "react";
import { useProgress } from "@/lib/progress";

/**
 * The check beat.
 *
 * Answering reveals the reasoning immediately, whether the answer was right or
 * wrong — the explanation is the teaching, and withholding it until the end
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

export function Quiz({ slug, questions }: QuizProps) {
  const { complete, scoreFor } = useProgress();
  const [picks, setPicks] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );

  const answered = picks.filter((p) => p !== null).length;
  const correct = picks.filter((p, i) => p === questions[i].answer).length;
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
        next.filter((p, i) => p === questions[i].answer).length /
        questions.length;
      complete(slug, score);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-5">
        {questions.map((question, qi) => {
          const pickedIndex = picks[qi];
          const revealed = pickedIndex !== null;

          return (
            <li key={qi} className="plate p-5">
              <p className="font-display mb-4 text-lg font-bold">
                {question.prompt}
              </p>

              <div className="grid gap-2">
                {question.options.map((option, oi) => {
                  const isAnswer = oi === question.answer;
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
