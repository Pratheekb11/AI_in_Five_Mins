"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { SPAM_BENCH } from "@/lib/datasets";

/**
 * What the word "AI" is actually pointing at.
 *
 * The distinction is genuinely simple and almost never drawn: in ordinary
 * software a person writes the rule, and in this kind of software nobody does
 * — the rule is found from examples. Everything else people argue about
 * follows from that one difference.
 *
 * So it is shown rather than asserted, on one real job. The same 5,574 real SMS
 * messages, the same held-out test set, three machines:
 *
 *   flag nothing        86.01%   the trap
 *   three written rules 97.31%   somebody sat down and thought
 *   learned from data   98.65%   nobody wrote a rule at all
 *
 * The middle bar is the one people underrate and the first is the one that
 * should worry them: a machine that does nothing at all scores 86% on this
 * job, which is why an accuracy figure on its own tells you nothing. That beat
 * is given its own moment instead of being a footnote.
 *
 * Every number is from `spam-bench.json`, measured on the same split.
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
    says: `Now nobody writes a rule. The machine is shown labelled examples and finds the pattern itself — ${(learned.accuracy * 100).toFixed(1)}%. That is the whole of what "AI" means here, and it is the only line that matters.`,
  },
];

export function WhatIsAI() {
  const still = useReducedMotion();
  const [beat, setBeat] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setBeat((b) => (b + 1) % BEATS.length),
      4200,
    );
    return () => clearInterval(id);
  }, [running]);

  const step = useCallback(() => {
    setRunning(false);
    setBeat((b) => (b + 1) % BEATS.length);
  }, []);

  /** How many bars are on screen at this beat. */
  const showing = beat === 0 ? 0 : beat;

  return (
    <div className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">Same job, three machines</span>
        <span className="flex items-center gap-3">
          {BEATS.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === beat ? "bg-pink" : "bg-ink/20"
                }`}
                aria-hidden="true"
              />
              <span
                className={`label transition-colors ${
                  i === beat ? "text-pink-text" : "text-ink-faint"
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

        <p className="text-ink-faint mb-4 text-[0.75rem]">
          Bars start at 80%, not zero. The whole argument on this job happens
          between 86% and 99%, and a bar drawn from zero hides it.
        </p>

        <div className="border-ink/20 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p
            className="prose-measure text-ink-soft min-h-[3.5rem] text-[0.9375rem]"
            aria-live="polite"
          >
            <motion.span
              key={beat}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              {BEATS[beat].says}
            </motion.span>
          </p>

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
        </div>
      </div>

      <p className="border-ink/20 text-ink-faint border-t px-4 py-3 text-[0.8125rem]">
        {corpus.name}, {corpus.total.toLocaleString("en-US")} messages. All
        three scored on the same held-out split, and the {rules.length} candidate
        rules were written before any of them were tested. Nothing here is
        rounded in anyone&rsquo;s favour.
      </p>
    </div>
  );
}
