"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import {
  phrasingOf,
  type PushData,
  type PushRound,
  type PushStyle,
} from "@/lib/game/pushback";

/**
 * One fact, two bars, four ways of asking. The bars never get redrawn.
 */

const STAGE_STYLE: Record<number, PushStyle> = {
  0: "neutral",
  1: "leading",
  2: "insistent",
  3: "corrected",
  4: "insistent",
  5: "insistent",
};

/** Named, not measured. Only the third of these has numbers on this page. */
const FAILURE_MODES = [
  { name: "Invents", where: "panel below", watched: false },
  { name: "Goes stale", where: "panel below", watched: false },
  { name: "Caves", where: "measured above", watched: true },
  { name: "Cannot calculate", where: "panel below", watched: false },
] as const;

const STYLE_ORDER: PushStyle[] = [
  "neutral",
  "leading",
  "insistent",
  "corrected",
];

export function PushbackFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<PushData | null>(null);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<{
    stage: number;
    round?: string;
    style?: PushStyle;
  }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/pushback.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<PushData>;
      })
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="plate-flush p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          The measurements did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the measurements…
        </p>
      </div>
    );
  }

  const here = pick && pick.stage === stage ? pick : undefined;
  const round: PushRound =
    data.rounds.find((r) => r.id === here?.round) ?? data.rounds[0];
  const style: PushStyle = here?.style ?? STAGE_STYLE[Math.min(stage, 5)];
  const phrasing = phrasingOf(round, style);
  const canExplore = stage >= 4;

  const right = phrasing?.right.probability ?? 0;
  const wrong = phrasing?.wrong.probability ?? 0;
  const widest = Math.max(right, wrong, 0.0001);
  const caved = wrong > right;

  // Some facts sit near zero in every framing (Shakespeare is 0.3% against a
  // 0.02% Dickens). One decimal place turns both of those into "0.0%" and the
  // reader is left with two bars and no numbers. Give the small rounds the
  // decimals they need to stay readable.
  const places = widest < 0.02 ? 3 : 1;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 border-b px-4 py-3">
        <p className="label text-ink-faint mb-1">
          A fact nobody disputes · {data.styles[style]}
        </p>
        <p className="font-data text-[0.9375rem] whitespace-pre-wrap">
          {phrasing?.prompt}
          <span className="bg-yellow-wash text-yellow-text ml-1 rounded-[2px] px-2">
            ?
          </span>
        </p>
      </div>

      <div className="px-4 py-4">
        {/* Two rows, always these two, never rebuilt. Everything the figure
            has to say is in how far each one reaches. */}
        <ul className="space-y-3">
          {[
            { label: round.right, value: right, truth: true },
            { label: round.wrong, value: wrong, truth: false },
          ].map((row) => (
            <li key={row.label} className="flex items-center gap-3">
              <span
                className={`font-data w-28 shrink-0 truncate text-sm font-bold ${
                  row.truth ? "text-teal-text" : "text-pink-text"
                }`}
              >
                {row.label.trim()}
              </span>

              <span className="bg-paper-sunk border-ink/20 h-4 flex-1 overflow-hidden rounded-[1px] border">
                <motion.span
                  className={`block h-full ${row.truth ? "bg-teal" : "bg-pink"}`}
                  initial={false}
                  animate={{ width: `${(row.value / widest) * 100}%` }}
                  transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
                />
              </span>

              <span className="data text-ink-soft w-20 shrink-0 text-right text-sm tabular-nums">
                {(row.value * 100).toFixed(places)}%
              </span>

              <span className="label w-16 shrink-0">
                {row.truth ? (
                  <span className="text-teal-text">true</span>
                ) : (
                  <span className="text-pink-text">false</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <motion.p
          key={caved ? "caved" : "held"}
          initial={still ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 text-[0.9375rem] font-semibold ${
            caved ? "text-pink-text" : "text-teal-text"
          }`}
        >
          {caved
            ? "The false answer is now ahead. It went with what it was told."
            : "The true answer is still ahead."}
        </motion.p>

        {stage === 3 ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-2 text-[0.9375rem]"
          >
            Same sentence shape, same insistence, and it agrees just as hard.
            Nothing was persuaded of anything. It is copying whatever sits in
            front of it, which is why agreement after you push is worth nothing
            at all.
          </motion.p>
        ) : null}
      </div>

      {canExplore ? (
        <div className="border-ink/20 space-y-3 border-t px-4 py-3">
          <div>
            <p className="label text-ink-faint mb-2">How it was asked</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setPick({ stage, round: round.id, style: option })
                  }
                  className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    option === style
                      ? "border-ink bg-paper-sunk font-semibold"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {data.styles[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label text-ink-faint mb-2">
              On any of the {data.rounds.length} facts
            </p>
            <div className="flex flex-wrap gap-2">
              {data.rounds.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPick({ stage, round: option.id, style })}
                  className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    option.id === round.id
                      ? "border-ink bg-paper-sunk font-semibold"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {option.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* The last step of the walkthrough talks about the other three failure
          modes, and until this existed the figure had nothing to say there:
          stages four and five drew the identical picture, so pressing Next did
          nothing at all. This names the four and marks the one just watched.
          No bars, because only one of the four is measured on this page and a
          bar for the other three would be a number nobody took. */}
      {stage >= 5 ? (
        <motion.div
          className="border-ink/20 border-t px-4 py-3"
          initial={still ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="label text-ink-faint mb-2">
            The four ways these fail
          </p>
          <ul className="flex flex-wrap gap-2">
            {FAILURE_MODES.map((mode) => (
              <li
                key={mode.name}
                className={`rounded-[2px] border px-2 py-1 text-sm font-semibold ${
                  mode.watched
                    ? "border-pink-text/40 bg-pink-wash text-pink-text"
                    : "border-ink/25 text-ink-faint"
                }`}
              >
                {mode.name}
                <span className="label ml-2 opacity-70">{mode.where}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.model.name}, scored on the true and false answers for each prompt
        exactly as printed. This measures copying rather than sycophancy, which
        is a trained behaviour in assistants and a separate thing. Sharma and
        colleagues measured that across five leading models.
      </figcaption>
    </figure>
  );
}
