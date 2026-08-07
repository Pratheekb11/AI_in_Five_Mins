"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { PredictorData, PredictorRound } from "@/lib/game/predictor";
import { playCue } from "@/lib/game/sound";

/**
 * The landing page, which is one round long.
 *
 * No welcome, no course description, no sign-up. A sentence with a word missing,
 * four buttons, and about fifteen seconds later a machine has beaten you at
 * something you assumed you were good at. That is the entire pitch, and making
 * it as a paragraph instead would be the sort of thing this site exists to
 * argue against.
 *
 * The round is drawn from the phrase act deliberately. Those are the ones the
 * model is genuinely strong at, no rigging, just its own recorded odds on its
 * own best ground, so the first thing a visitor learns is true and stings.
 */

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

export function HeroDemo() {
  const [round, setRound] = useState<PredictorRound | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    loadPredictor()
      .then((data) => {
        if (!alive) return;
        // Only rounds the model actually gets right, so the demo is the model
        // at its best rather than a stitch-up.
        const strong = data.rounds.filter(
          (r) => r.kind === "phrase" && r.modelPick === r.truth,
        );
        const pool = strong.length > 0 ? strong : data.rounds;
        setRound(pool[Math.floor(Math.random() * pool.length)]);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const choose = useCallback(
    (i: number) => {
      if (!round || picked !== null) return;
      setPicked(i);
      playCue(i === round.truth ? "right" : "wrong");
    },
    [round, picked],
  );

  const again = useCallback(() => setPicked(null), []);

  if (failed) {
    return (
      <div className="plate p-5">
        <p className="text-ink-soft text-[0.9375rem]">
          The demo did not load. Everything below still works.
        </p>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="plate p-5">
        <p className="text-ink-soft text-[0.9375rem]">Loading a real model…</p>
      </div>
    );
  }

  const revealed = picked !== null;
  const youWon = revealed && picked === round.truth;
  const widest = Math.max(...round.options.map((o) => o.probability), 0.0001);

  return (
    <div className="plate p-5 md:p-6">
      <p className="label text-ink-faint mb-3">
        Beat the machine · one round · no sign-up
      </p>

      <p className="prose-measure mb-4 text-[1.125rem] leading-relaxed">
        {round.prefix}{" "}
        {revealed ? (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-teal-wash text-teal-text font-data rounded-[2px] px-2 py-0.5 font-bold"
          >
            {round.options[round.truth].text.trim()}
          </motion.span>
        ) : (
          <motion.span
            className="bg-yellow-wash text-yellow-text font-data rounded-[2px] px-6 py-0.5"
            animate={{ opacity: [1, 0.45, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            ?
          </motion.span>
        )}
      </p>

      <ul className="space-y-1.5">
        {round.options.map((option, i) => {
          const isTruth = revealed && i === round.truth;
          const isYours = picked === i;
          return (
            <li key={`${round.id}-${i}`}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => choose(i)}
                className={`plate w-full px-3 py-2 text-left transition-colors ${
                  isTruth
                    ? "border-teal bg-teal-wash"
                    : isYours
                      ? "border-pink bg-pink-wash"
                      : revealed
                        ? ""
                        : "hover:border-ink cursor-pointer"
                }`}
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-data text-[0.9375rem]">
                    {option.text.trim() || "␣"}
                  </span>
                  {isYours ? (
                    <span className="label text-pink-text">you</span>
                  ) : null}
                  {isTruth ? (
                    <span className="label text-teal-text">right</span>
                  ) : null}
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="bg-paper-sunk border-ink/20 h-2.5 flex-1 overflow-hidden rounded-[1px] border">
                    <motion.span
                      className={`block h-full ${isTruth ? "bg-teal" : "bg-ink/30"}`}
                      initial={{ width: 0 }}
                      animate={{
                        width: revealed
                          ? `${(option.probability / widest) * 100}%`
                          : 0,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: revealed ? 0.1 + i * 0.07 : 0,
                        ease: "easeOut",
                      }}
                    />
                  </span>
                  <span className="data text-ink-soft w-14 shrink-0 text-right text-xs tabular-nums">
                    {revealed ? `${(option.probability * 100).toFixed(1)}%` : "-"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 min-h-[3.5rem]" aria-live="polite">
        {revealed ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="mb-1 text-[0.9375rem] font-semibold">
              {youWon ? (
                <span className="text-teal-text">
                  You got it, and so did the machine, at{" "}
                  {(round.options[round.truth].probability * 100).toFixed(0)}%.
                </span>
              ) : (
                <span className="text-pink-text">
                  The machine had it at{" "}
                  {(round.options[round.truth].probability * 100).toFixed(0)}%.
                  You did not.
                </span>
              )}
            </p>
            <p className="text-ink-soft text-[0.875rem]">
              Those are its real odds, measured rather than illustrated.
              It is very good at this and very bad at other things. Chapter
              one is where it falls over.{" "}
              <button
                type="button"
                onClick={again}
                className="underline underline-offset-2"
              >
                Go again
              </button>
              .
            </p>
          </motion.div>
        ) : (
          <p className="text-ink-soft text-[0.875rem]">
            Pick the word that comes next. The machine has already picked.
          </p>
        )}
      </div>
    </div>
  );
}
