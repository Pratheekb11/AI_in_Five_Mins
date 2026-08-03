"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { PredictorData, PredictorRound } from "@/lib/game/predictor";

/**
 * The whole machine, running, on a loop.
 *
 * Everything on this site argues that a language model does one small thing
 * over and over: read what is there, score every possible next chunk, draw one,
 * stick it on the end, go again. That claim was only ever made in prose, which
 * is a strange way to make it on a site about not taking prose at its word.
 *
 * So it runs. Four beats — READ, SCORE, DRAW, APPEND — and then it starts over
 * with the sentence one word longer. The numbers on the bars are the same
 * recorded probabilities the first game plays with; nothing here is an
 * illustration of what a model might do.
 *
 * NOTE. The beats used `AnimatePresence mode="wait"`, which deadlocked: the
 * exit animation never settled, so the next child was never mounted and both
 * the caption and the appended word froze on their first value while the step
 * indicator carried on cycling. A keyed element that simply remounts does the
 * same job here and cannot get stuck.
 *
 * It is deliberately not interactive. There is a game two screens down for
 * that. This is the thing you watch while you work out what you are looking at.
 */

type Beat = 0 | 1 | 2 | 3;

const BEATS: { key: Beat; label: string; says: string }[] = [
  { key: 0, label: "Read", says: "It reads everything so far. Not remembers — reads, from the top, every time." },
  { key: 1, label: "Score", says: "It scores every chunk of text that could come next. All fifty thousand of them." },
  { key: 2, label: "Draw", says: "One is drawn. Usually the likeliest, not always — that is the only dial you get." },
  { key: 3, label: "Append", says: "It is stuck on the end, and the whole thing starts again. That is the entire machine." },
];

/** Long enough to read the line, short enough not to feel stuck. */
const BEAT_MS = 2300;

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

export function TheLoop() {
  const still = useReducedMotion();
  const [rounds, setRounds] = useState<PredictorRound[]>([]);
  const [at, setAt] = useState(0);
  const [beat, setBeat] = useState<Beat>(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let alive = true;
    loadPredictor()
      .then((data) => {
        if (!alive) return;
        // Rounds where the model is confident read best here: the point of this
        // panel is the shape of the loop, not the failure. The failures get
        // three whole worlds to themselves.
        const strong = data.rounds.filter(
          (r) => r.kind === "phrase" && r.modelPick === r.truth,
        );
        setRounds(strong.length > 0 ? strong : data.rounds.slice(0, 4));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // The clock. Advances the beat, and rolls onto the next sentence after the
  // fourth — so the loop visibly *is* a loop rather than a four-step diagram.
  useEffect(() => {
    if (!running || rounds.length === 0) return;
    const id = setInterval(() => {
      setBeat((b) => {
        if (b === 3) {
          setAt((n) => (n + 1) % rounds.length);
          return 0;
        }
        return (b + 1) as Beat;
      });
    }, BEAT_MS);
    return () => clearInterval(id);
  }, [running, rounds.length]);

  const round = rounds[at];
  const step = useCallback(() => {
    setRunning(false);
    setBeat((b) => {
      if (b === 3) {
        setAt((n) => (rounds.length ? (n + 1) % rounds.length : 0));
        return 0;
      }
      return (b + 1) as Beat;
    });
  }, [rounds.length]);

  if (!round) {
    return (
      <div className="plate min-h-[19rem] p-5 md:p-6">
        <p className="text-ink-soft text-[0.9375rem]">Loading a real model…</p>
      </div>
    );
  }

  const shown = beat >= 3 ? round.options[round.truth].text.trim() : null;
  const widest = Math.max(...round.options.map((o) => o.probability), 0.0001);

  return (
    <div className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">One word, four steps, then again</span>
        <span className="flex items-center gap-3">
          {BEATS.map((b) => (
            <span key={b.key} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  b.key === beat ? "bg-pink" : "bg-ink/20"
                }`}
                aria-hidden="true"
              />
              <span
                className={`label transition-colors ${
                  b.key === beat ? "text-pink-text" : "text-ink-faint"
                }`}
              >
                {b.label}
              </span>
            </span>
          ))}
        </span>
      </div>

      <div className="p-5 md:p-6">
        {/* The sentence. It is the same object all the way through — the word
            that gets drawn lands on the end of this line, which is the whole
            point and does not survive being redrawn as a new panel. */}
        <p className="font-data bg-paper-sunk border-ink/20 mb-5 min-h-[3.5rem] rounded-[2px] border px-4 py-3 text-[1.0625rem] leading-relaxed">
          <motion.span
            animate={
              still || beat !== 0
                ? {}
                : { backgroundColor: ["rgba(0,0,0,0)", "var(--blue-wash)", "rgba(0,0,0,0)"] }
            }
            transition={{ duration: 1.4 }}
            className="rounded-[2px]"
          >
            {round.prefix}
          </motion.span>{" "}
          {shown ? (
            <motion.span
              key={`word-${at}`}
              initial={still ? false : { opacity: 0, y: -14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="bg-teal-wash text-teal-text rounded-[2px] px-2 py-0.5 font-bold"
            >
              {shown}
            </motion.span>
          ) : (
            <motion.span
              className="bg-yellow-wash text-yellow-text rounded-[2px] px-5 py-0.5"
              animate={still ? {} : { opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ?
            </motion.span>
          )}
        </p>

        {/* The scores. They grow on beat 1 and the winner is picked out on 2. */}
        <ul className="mb-5 space-y-1.5">
          {round.options.map((option, i) => {
            const isDrawn = beat >= 2 && i === round.truth;
            return (
              <li key={`${round.id}-${i}`} className="flex items-center gap-3">
                <span
                  className={`font-data w-24 shrink-0 truncate text-sm transition-colors ${
                    isDrawn ? "text-teal-text font-bold" : "text-ink-soft"
                  }`}
                >
                  {option.text.trim() || "␣"}
                </span>
                <span className="bg-paper-sunk border-ink/20 h-3.5 flex-1 overflow-hidden rounded-[1px] border">
                  <motion.span
                    className={`block h-full ${isDrawn ? "bg-teal" : "bg-blue"}`}
                    animate={{
                      width:
                        beat >= 1
                          ? `${(option.probability / widest) * 100}%`
                          : "0%",
                      opacity: beat >= 2 && !isDrawn ? 0.35 : 1,
                    }}
                    transition={{
                      duration: still ? 0 : 0.55,
                      delay: still || beat !== 1 ? 0 : i * 0.07,
                      ease: "easeOut",
                    }}
                  />
                </span>
                <span className="data text-ink-soft w-14 shrink-0 text-right text-xs tabular-nums">
                  {beat >= 1 ? `${(option.probability * 100).toFixed(1)}%` : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-ink/20 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p
            className="prose-measure text-ink-soft min-h-[2.75rem] text-[0.9375rem]"
            aria-live="polite"
          >
            <motion.span
              key={beat}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
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
        Real recorded probabilities from DistilGPT-2, the same ones the first
        world plays with. The bars are its odds, not an artist&rsquo;s
        impression of them.
      </p>
    </div>
  );
}
