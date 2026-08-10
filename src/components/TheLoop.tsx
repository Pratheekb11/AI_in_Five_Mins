"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

/**
 * A sentence being written, one word at a time, by a real model.
 */

type Candidate = { text: string; probability: number };

type Step = {
  before: string;
  candidates: Candidate[];
  taken: string;
  entropyBits: number;
};

type Chain = { seed: string; steps: Step[]; final: string };

type LoopData = {
  model: { name: string; url: string };
  note: string;
  topK: number;
  vocabSize: number;
  chains: Chain[];
};

/** One word per tick. Slow enough to read the bars, fast enough to feel written. */
const TICK_MS = 1900;

let cached: Promise<LoopData> | null = null;

function loadLoop(): Promise<LoopData> {
  if (!cached) {
    cached = fetch("/data/loop.json").then((r) => {
      if (!r.ok) throw new Error(`loop: ${r.status}`);
      return r.json() as Promise<LoopData>;
    });
  }
  return cached;
}

/** True once the chain has started repeating itself. */
function isRepeating(steps: Step[], upTo: number): boolean {
  if (upTo < 6) return false;
  const recent = steps.slice(Math.max(0, upTo - 6), upTo).map((s) => s.taken);
  return new Set(recent).size <= 3;
}

export function TheLoop() {
  const still = useReducedMotion();
  const [data, setData] = useState<LoopData | null>(null);
  const [chain, setChain] = useState(0);
  const [at, setAt] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let alive = true;
    loadLoop()
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const total = data?.chains[chain]?.steps.length ?? 0;

  useEffect(() => {
    if (!running || total === 0) return;
    const id = setInterval(() => {
      setAt((n) => {
        if (n + 1 < total) return n + 1;
        // Chain finished. Pause on the finished sentence, then start a new one.
        return n;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, total]);

  const restart = useCallback(() => {
    setAt(0);
    setChain((c) => (data ? (c + 1) % data.chains.length : 0));
    setRunning(true);
  }, [data]);

  const stepOn = useCallback(() => {
    setRunning(false);
    setAt((n) => (n + 1 < total ? n + 1 : n));
  }, [total]);

  if (!data) {
    return (
      <div className="plate min-h-[20rem] p-5 md:p-6">
        <p className="text-ink-soft text-[0.9375rem]">Loading a real model…</p>
      </div>
    );
  }

  const steps = data.chains[chain].steps;
  const step = steps[at];
  const done = at + 1 >= steps.length;
  /** Everything written so far, and the word this step is adding. */
  const written = step.before;
  const adding = step.taken;
  const repeating = isRepeating(steps, at);

  return (
    <div className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">Watch it write one word at a time</span>
        <span className="label text-ink-faint">
          word {at + 1} of {steps.length}
        </span>
      </div>

      <div className="p-5 md:p-6">
        {/* The sentence. This is the whole point: it gets longer, and what it
            says next is decided by what it already says. */}
        <p className="label text-ink-faint mb-2">
          What it has written so far, and what it is about to add
        </p>
        <p className="font-data bg-paper-sunk border-ink/20 mb-6 min-h-[4rem] sm:min-h-[6rem] rounded-[2px] border px-4 py-3 text-[1.0625rem] leading-relaxed">
          <span className="text-ink-soft">{written}</span>
          <motion.span
            key={`${chain}-${at}`}
            initial={still ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className="bg-teal-wash text-teal-text rounded-[2px] px-1 font-bold"
          >
            {adding}
          </motion.span>
        </p>

        <p className="label text-ink-faint mb-2">
          The words it weighed up before picking, out of{" "}
          {data.vocabSize.toLocaleString("en-US")}
        </p>
        <ul className="mb-5 space-y-1.5">
          {step.candidates.map((candidate, i) => {
            const taken = candidate.text === adding && i === 0;
            return (
              <li
                key={`${chain}-${at}-${i}`}
                className="flex items-center gap-3"
              >
                <span
                  className={`font-data w-28 shrink-0 truncate text-sm ${
                    taken ? "text-teal-text font-bold" : "text-ink-soft"
                  }`}
                >
                  {candidate.text.trim() || "␣"}
                </span>
                <span className="bg-paper-sunk border-ink/20 h-3.5 flex-1 overflow-hidden rounded-[1px] border">
                  <motion.span
                    className={`block h-full ${taken ? "bg-teal" : "bg-blue"}`}
                    initial={still ? false : { width: 0 }}
                    animate={{
                      width: `${
                        (candidate.probability /
                          Math.max(
                            ...step.candidates.map((c) => c.probability),
                            0.0001,
                          )) *
                        100
                      }%`,
                    }}
                    transition={{
                      duration: still ? 0 : 0.45,
                      delay: still ? 0 : i * 0.05,
                      ease: "easeOut",
                    }}
                  />
                </span>
                <span className="data text-ink-soft w-14 shrink-0 text-right text-xs tabular-nums">
                  {(candidate.probability * 100).toFixed(1)}%
                </span>
                {taken ? (
                  <span className="label text-teal-text shrink-0">taken</span>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="border-ink/20 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="prose-measure text-ink-soft min-h-[3rem] text-[0.9375rem]">
            {repeating ? (
              <>
                It has started repeating itself. That is what always taking the
                likeliest word does. The likeliest continuation of a likely
                continuation is likelier still, so it falls into a groove.{" "}
                <Link
                  href="/lessons/how-llms-answer"
                  className="underline underline-offset-2"
                >
                  That is measured here
                </Link>
                , and it is why real systems roll dice instead.
              </>
            ) : (
              <>
                It read everything above, scored every word that could come
                next, took that one, and added it. Now it reads the longer
                sentence and does it again. That is the entire machine.
              </>
            )}
          </p>

          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              disabled={done}
              className="tap plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              {running ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={stepOn}
              disabled={done}
              className="tap plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              Add a word
            </button>
            <button
              type="button"
              onClick={restart}
              className="tap plate hover:border-ink px-3 py-1.5 text-[0.875rem]"
            >
              {done ? "New sentence" : "Start over"}
            </button>
          </span>
        </div>
      </div>

      <p className="border-ink/20 text-ink-faint border-t px-4 py-3 text-[0.8125rem]">
        {data.model.name}. Every step is a real run over the text the step
        before it produced, not a script. It always takes its top choice here,
        so this exact sentence comes back every time and you can check it.
      </p>
    </div>
  );
}
