"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useNearViewport } from "@/lib/useNearViewport";

/**
 * How a chatbot answers, as a loop that plays by itself: it reads the words,
 * rates every answer it could give, and says the top one. Nobody has to press
 * anything or read a paragraph; the only thing that changes is what moved.
 *
 * Every bar is a measured number out of `predictor.json`: the model's own
 * probability for each whole answer, as a share of the four on screen.
 */

export type AnswerExample = {
  prefix: string;
  options: { text: string; probability: number }[];
  modelPick: number;
  truth: number;
};

type Phase = 0 | 1 | 2;

const STEPS: { label: string; caption: string }[] = [
  { label: "Reads", caption: "It reads the words so far." },
  { label: "Rates", caption: "It rates every answer it could give." },
  {
    label: "Answers",
    caption: "It says the highest-rated answer. It never checks if it is true.",
  },
];

const WORD_MS = 200;
const AFTER_READ_MS = 500;
const RATE_MS = 2200;
const PICK_MS = 4200;
const STILL_MS = 6000;

const pct = (p: number) => `${Math.round(p * 100)}%`;

export function HowItAnswers({ examples }: { examples: AnswerExample[] }) {
  const still = useReducedMotion();
  const [ref, near] = useNearViewport("0px");
  const [state, setState] = useState({ e: 0, phase: 0 as Phase, words: 0 });

  const example = examples[state.e];
  const words = example.prefix.split(" ");
  const phase: Phase = still ? 2 : state.phase;
  const shownWords = still ? words.length : state.words;

  useEffect(() => {
    if (!near) return;
    const nextExample = () =>
      setState((s) => ({ e: (s.e + 1) % examples.length, phase: 0, words: 0 }));
    let ms: number;
    let step: () => void;
    if (still) {
      ms = STILL_MS;
      step = nextExample;
    } else if (state.phase === 0 && state.words < words.length) {
      ms = WORD_MS;
      step = () => setState((s) => ({ ...s, words: s.words + 1 }));
    } else if (state.phase === 0) {
      ms = AFTER_READ_MS;
      step = () => setState((s) => ({ ...s, phase: 1 }));
    } else if (state.phase === 1) {
      ms = RATE_MS;
      step = () => setState((s) => ({ ...s, phase: 2 }));
    } else {
      ms = PICK_MS;
      step = nextExample;
    }
    const id = setTimeout(step, ms);
    return () => clearTimeout(id);
  }, [near, still, state, words.length, examples.length]);

  // Highest first, so the AI's answer is always the top row.
  const order = [...example.options.keys()].sort(
    (a, b) => example.options[b].probability - example.options[a].probability,
  );
  const widest = example.options[order[0]].probability;
  const right = example.modelPick === example.truth;
  const said = example.options[example.modelPick].text.trim();
  const truth = example.options[example.truth].text.trim();

  return (
    <figure
      ref={ref}
      className="plate-flush mx-auto max-w-2xl overflow-hidden"
      aria-live="off"
    >
      {/* The three moves, lit one at a time. */}
      <ol className="border-ink/20 bg-paper-sunk flex border-b">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={`label flex-1 px-2 py-2 text-center transition-colors duration-300 sm:py-2.5 ${
              i === phase
                ? "bg-blue-wash text-blue-text"
                : i < phase
                  ? "text-ink-soft"
                  : "text-ink-faint"
            } ${i > 0 ? "border-ink/20 border-l" : ""}`}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <div className="p-4 sm:p-5">
        {/* The sentence, a word at a time, then the answer in its gap. */}
        <p className="mb-4 min-h-[3.5rem] text-[1.125rem] leading-relaxed sm:text-xl">
          {words.map((w, i) => (
            <span
              key={`${state.e}-${i}`}
              className={`transition-opacity duration-200 ${
                i < shownWords ? "opacity-100" : "opacity-20"
              }`}
            >
              {w}{" "}
            </span>
          ))}
          {phase === 2 ? (
            <motion.span
              key={`said-${state.e}`}
              initial={still ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-data rounded-[2px] px-2 py-0.5 font-bold ${
                right
                  ? "bg-teal-wash text-teal-text"
                  : "bg-pink-wash text-pink-text"
              }`}
            >
              {said}
            </motion.span>
          ) : (
            <span className="bg-yellow-wash text-yellow-text font-data ink-pulse rounded-[2px] px-5 py-0.5">
              ?
            </span>
          )}
        </p>

        {/* The ratings. The room is always there, so nothing jumps. */}
        <ul className="space-y-2">
          {order.map((i, rank) => {
            const o = example.options[i];
            const isPick = phase === 2 && i === example.modelPick;
            const isTruth = phase === 2 && i === example.truth;
            return (
              <li key={`${state.e}-${i}`} className="flex items-center gap-3">
                <span className="w-[42%] shrink-0 truncate text-[0.9375rem] sm:w-48">
                  {o.text.trim()}
                </span>
                <span className="bg-paper-sunk border-ink/20 h-3.5 flex-1 overflow-hidden rounded-[1px] border">
                  <motion.span
                    className={`block h-full ${
                      isPick && !right
                        ? "bg-pink"
                        : isTruth
                          ? "bg-teal"
                          : rank === 0
                            ? "bg-blue"
                            : "bg-ink/30"
                    }`}
                    initial={false}
                    animate={{
                      width:
                        phase >= 1
                          ? `${(o.probability / widest) * 100}%`
                          : "0%",
                    }}
                    transition={{
                      duration: still ? 0 : 0.5,
                      delay: still || phase !== 1 ? 0 : 0.15 * (3 - rank),
                      ease: "easeOut",
                    }}
                  />
                </span>
                <span
                  className={`data w-10 shrink-0 text-right text-xs tabular-nums transition-opacity ${
                    phase >= 1 ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {pct(o.probability)}
                </span>
              </li>
            );
          })}
        </ul>

        {/* What happened, in one line, or what is happening now. */}
        <p
          className={`mt-4 min-h-[3rem] text-[0.9375rem] leading-snug font-semibold ${
            phase === 2
              ? right
                ? "text-teal-text"
                : "text-pink-text"
              : "text-ink-soft font-normal"
          }`}
        >
          {phase === 2
            ? right
              ? `Right. Here the top-rated answer is also the true one.`
              : `Wrong. The true answer is ${truth}. Nothing in it checked.`
            : STEPS[phase].caption}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            {examples.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-[1px] ${i === state.e ? "bg-pink" : "bg-ink/20"}`}
              />
            ))}
          </span>
          <span className="text-ink-faint text-[0.75rem]">Plays by itself</span>
        </div>
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2 text-[0.75rem] leading-snug">
        Bars are DistilGPT-2&rsquo;s own measured rating of each whole answer,
        as a share of these four.
      </figcaption>
    </figure>
  );
}
