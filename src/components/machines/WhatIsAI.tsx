"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { SPAM_BENCH } from "@/lib/datasets";

/**
 * What the word "AI" is actually pointing at.
 */

const { corpus, baseline, bestSubset, learned, rules } = SPAM_BENCH;

type Machine = {
  id: string;
  name: string;
  how: string;
  who: string;
  accuracy: number;
  caught: number;
  missed: number;
  falseAlarms: number;
  ink: string;
};

const MACHINES: Machine[] = [
  {
    id: "nothing",
    name: "Flag nothing",
    how: "Call every message fine and go home.",
    who: "Nobody had to write anything.",
    accuracy: baseline.accuracy,
    caught: baseline.caught,
    missed: baseline.missed,
    falseAlarms: baseline.falseAlarms,
    ink: "bg-ink/30",
  },
  {
    id: "rules",
    name: "Rules a person wrote",
    how: `${bestSubset.rules.length} rules, chosen by hand: ${bestSubset.rules.join(", ")}.`,
    who: "A person read the messages and decided what spam looks like.",
    accuracy: bestSubset.accuracy,
    caught: bestSubset.caught,
    missed: bestSubset.missed,
    falseAlarms: bestSubset.falseAlarms,
    ink: "bg-blue",
  },
  {
    id: "learned",
    name: "A rule nobody wrote",
    how: learned.method,
    who: `Shown ${learned.trainSize.toLocaleString("en-US")} labelled messages and left to work it out.`,
    accuracy: learned.accuracy,
    caught: learned.caught,
    missed: learned.missed,
    falseAlarms: learned.falseAlarms,
    ink: "bg-teal",
  },
];

const BEATS = [
  {
    label: "The job",
    says: `${corpus.total.toLocaleString("en-US")} real text messages, ${corpus.spam.toLocaleString("en-US")} of them spam. Sort them. Every machine below is scored on the same held-out messages it has never seen.`,
  },
  {
    label: "Do nothing",
    says: `A machine that flags nothing at all scores ${(baseline.accuracy * 100).toFixed(1)}%. It catches no spam whatsoever. This is why an accuracy number on its own is not evidence of anything.`,
  },
  {
    label: "Write the rules",
    says: `Now a person reads the messages and writes ${bestSubset.rules.length} rules. That is ordinary software: somebody understood the problem and said what to do. ${(bestSubset.accuracy * 100).toFixed(1)}%.`,
  },
  {
    label: "Find the rule",
    says: `Now nobody writes a rule. The machine is shown labelled examples and finds the pattern itself, scoring ${(learned.accuracy * 100).toFixed(1)}%. That is the whole of what "AI" means here, and it is the only line that matters.`,
  },
  {
    label: "What it missed",
    says: `${(learned.accuracy * 100).toFixed(1)}% is ${learned.missed} spam messages delivered and ${learned.falseAlarms} ordinary messages binned. A percentage hides both. The counts do not.`,
  },
];

/** The held-out spam, one square each. 145 caught, 11 through. */
const TEST_SPAM = learned.caught + learned.missed;
const TEST_HAM = learned.testSize - TEST_SPAM;

export function WhatIsAI({ driven }: { driven?: number }) {
  const still = useReducedMotion();
  const [beat, setBeat] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running || driven !== undefined) return;
    const id = setInterval(() => setBeat((b) => (b + 1) % BEATS.length), 4200);
    return () => clearInterval(id);
  }, [running, driven]);

  const step = useCallback(() => {
    setRunning(false);
    setBeat((b) => (b + 1) % BEATS.length);
  }, []);

  // Driven from outside, this is a walkthrough figure and the reader advances
  // it with the walkthrough's own controls. Left alone, it plays itself.
  const at = driven === undefined ? beat : Math.min(driven, BEATS.length - 1);

  /** How many bars are on screen at this beat. Beats past the last machine
      keep all three up and add to them rather than counting past the end. */
  const showing = at === 0 ? 0 : Math.min(at, MACHINES.length);

  return (
    <div className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">Same job, three machines</span>
        <span className="flex items-center gap-3">
          {BEATS.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === at ? "bg-pink" : "bg-ink/20"
                }`}
                aria-hidden="true"
              />
              <span
                className={`label transition-colors ${
                  i === at ? "text-pink-text" : "text-ink-faint"
                }`}
              >
                {b.label}
              </span>
            </span>
          ))}
        </span>
      </div>

      <div className="p-5 md:p-6">
        <ul className="mb-5 space-y-4">
          {MACHINES.map((machine, i) => {
            const on = i < showing;
            const isNew = i === showing - 1;
            return (
              <li key={machine.id}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
                  <span
                    className={`text-[0.9375rem] font-semibold transition-opacity ${
                      on ? "opacity-100" : "opacity-30"
                    }`}
                  >
                    {machine.name}
                  </span>
                  <span
                    className={`data text-sm tabular-nums transition-opacity ${
                      on ? "opacity-100" : "opacity-0"
                    } ${isNew ? "text-pink-text font-bold" : "text-ink-soft"}`}
                  >
                    {(machine.accuracy * 100).toFixed(2)}%
                  </span>
                </div>

                <span className="bg-paper-sunk border-ink/20 block h-5 overflow-hidden rounded-[1px] border">
                  <motion.span
                    className={`block h-full ${machine.ink}`}
                    initial={false}
                    animate={{
                      // Scaled from 80% so the differences are visible: the
                      // interesting range on this job is 86 to 99, and a bar
                      // drawn from zero makes all three look identical.
                      width: on
                        ? `${Math.max(0, (machine.accuracy - 0.8) / 0.2) * 100}%`
                        : "0%",
                    }}
                    transition={{
                      duration: still ? 0 : 0.9,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </span>

                <p
                  className={`text-ink-faint mt-1 text-[0.8125rem] transition-opacity ${
                    on ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {on
                    ? `Caught ${machine.caught} of ${machine.caught + machine.missed} spam · ${machine.falseAlarms} false alarm${machine.falseAlarms === 1 ? "" : "s"} · ${machine.who}`
                    : " "}
                </p>
              </li>
            );
          })}
        </ul>

        {/* The last beat turns the winning percentage back into messages.
            98.65% reads as finished; eleven squares of spam that got through
            does not, and both are the same measurement. */}
        {at >= 4 ? (
          <motion.div
            className="border-ink/20 mb-4 border-t pt-4"
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="label text-ink-faint mb-2">
              The {TEST_SPAM} spam messages it was tested on
            </p>
            <div
              className="flex flex-wrap gap-[3px]"
              role="img"
              aria-label={`${learned.caught} spam caught, ${learned.missed} delivered`}
            >
              {Array.from({ length: TEST_SPAM }, (_, i) => {
                const missed = i >= learned.caught;
                return (
                  <motion.span
                    key={i}
                    className={`block h-2.5 w-2.5 rounded-[1px] ${
                      missed ? "bg-pink" : "bg-teal"
                    }`}
                    initial={still ? false : { opacity: 0 }}
                    animate={{ opacity: missed ? 1 : 0.55 }}
                    transition={{
                      duration: 0.2,
                      delay: still ? 0 : Math.min(i, 60) * 0.006,
                    }}
                  />
                );
              })}
            </div>
            <p className="text-ink-soft mt-2 text-[0.8125rem]">
              <span className="text-pink-text font-semibold">
                {learned.missed} delivered
              </span>{" "}
              anyway. And {learned.falseAlarms} of the {TEST_HAM} ordinary
              messages were binned, which for most people is the more expensive
              mistake.
            </p>
          </motion.div>
        ) : null}

        <p className="text-ink-faint mb-4 text-[0.75rem]">
          Bars start at 80%, not zero. The whole argument on this job happens
          between 86% and 99%, and a bar drawn from zero hides it.
        </p>

        {/* Driven from a walkthrough, the walkthrough is already saying this
            in Nimo's voice a few lines above. Two copies of the same sentence
            on one screen is worse than none. */}
        <div
          className={`border-ink/20 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
            driven === undefined ? "" : "hidden"
          }`}
        >
          <p
            className="prose-measure text-ink-soft min-h-[3.5rem] text-[0.9375rem]"
            aria-live="polite"
          >
            <motion.span
              key={at}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              {BEATS[at].says}
            </motion.span>
          </p>

          {driven === undefined ? (
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                className="plate hover:border-ink px-3 py-1.5 text-[0.875rem]"
              >
                {running ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={step}
                className="plate hover:border-ink px-3 py-1.5 text-[0.875rem]"
              >
                Step
              </button>
            </span>
          ) : null}
        </div>
      </div>

      <p className="border-ink/20 text-ink-faint border-t px-4 py-3 text-[0.8125rem]">
        {corpus.name}, {corpus.total.toLocaleString("en-US")} messages. All
        three scored on the same held-out split, and the {rules.length}{" "}
        candidate rules were written before any of them were tested. Nothing
        here is rounded in anyone&rsquo;s favour.
      </p>
    </div>
  );
}
