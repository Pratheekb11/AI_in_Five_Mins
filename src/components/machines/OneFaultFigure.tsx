"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { buildBench, type Weighing } from "@/lib/game/bench";
import { loadEmbeddings } from "@/lib/embeddings";
import type { LogitData } from "@/lib/logits";

/**
 * Three faults everybody names separately, on one instrument.
 *
 * The chapter's claim is that making things up, sounding certain and carrying
 * prejudice are not three bugs. They are one fact about how the thing was made,
 * seen from three angles. An argument like that is easy to assert and hard to
 * believe, so the figure does it structurally: the same two-pan comparison
 * stays on screen the whole way through and only its contents change.
 *
 * Fabrication is measured in probability, certainty in bits, inherited
 * association in cosine. Three different units, one instrument, and the reader
 * watches the same needle answer all three. If they were separate faults they
 * would not fit in the same box.
 *
 * The last specimen is the one that stops this being a lecture. Secretary
 * leans the other way, because half the corpus is newswire and in newswire a
 * secretary is a Secretary of State. The measurement is of a particular pile of
 * text, and anybody who says these systems are biased full stop, without
 * saying what they were fitted on, is not measuring anything.
 *
 * Every value is computed here from the same two files the game uses.
 *
 * Stages:
 *   0  the three names
 *   1  making things up
 *   2  sounding certain
 *   3  carrying an association
 *   4  the same measurement, pointing the other way
 *   5  what that means
 */

const NAMES = [
  { kind: "fabrication", label: "Making things up" },
  { kind: "confidence", label: "Sounding certain when wrong" },
  { kind: "inheritance", label: "Carrying prejudice" },
] as const;

/** Which specimen each step puts on the instrument, by subject. */
const PICK: Record<number, (w: Weighing) => boolean> = {
  1: (w) => w.kind === "fabrication" && w.left.label === "France",
  2: (w) => w.kind === "confidence" && w.left.label.startsWith("Paris"),
  3: (w) => w.kind === "inheritance" && w.subject === "nurse",
  4: (w) => w.kind === "inheritance" && w.subject === "secretary",
  5: (w) => w.kind === "inheritance" && w.subject === "secretary",
};

const UNIT: Record<Weighing["unit"], string> = {
  probability: "share of the whole vocabulary",
  bits: "bits of uncertainty · fewer means more certain",
  cosine: "cosine similarity · higher means nearer",
};

function format(value: number, unit: Weighing["unit"]): string {
  if (unit === "probability") return `${(value * 100).toFixed(2)}%`;
  if (unit === "bits") return `${value.toFixed(2)} bits`;
  return value.toFixed(3);
}

export function OneFaultFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [bench, setBench] = useState<Weighing[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/logits.json").then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<LogitData>;
      }),
      loadEmbeddings(),
    ])
      .then(([logits, space]) => alive && setBench(buildBench(logits, space)))
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

  if (!bench) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the measurements…
        </p>
      </div>
    );
  }

  const pick = PICK[Math.min(stage, 5)];
  const shown = pick ? bench.find(pick) : undefined;

  // Fewer bits is more certain, so that one specimen reads the other way.
  const winner = shown
    ? shown.answer === "left"
      ? shown.left
      : shown.right
    : null;

  const widest = shown ? Math.max(shown.left.value, shown.right.value) : 1;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 border-b px-4 py-3">
        <p className="label text-ink-faint mb-2">
          Three faults, one instrument
        </p>
        <div className="flex flex-wrap gap-2">
          {NAMES.map((name) => (
            <span
              key={name.kind}
              className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                shown && shown.kind === name.kind
                  ? "border-ink bg-paper-sunk font-semibold"
                  : "border-ink/25 text-ink-faint"
              }`}
            >
              {name.label}
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {shown ? (
          <>
            <p className="font-data mb-1 text-[0.875rem]">{shown.subject}</p>
            {shown.note ? (
              <p className="text-ink-faint mb-3 text-[0.8125rem]">
                {shown.note}
              </p>
            ) : null}

            <ul className="mt-3 space-y-3">
              {[shown.left, shown.right].map((pan) => (
                <li key={pan.label} className="flex items-center gap-3">
                  <span
                    className={`font-data w-40 shrink-0 truncate text-[0.8125rem] ${
                      pan === winner
                        ? "text-pink-text font-bold"
                        : "text-ink-soft"
                    }`}
                  >
                    {pan.label}
                  </span>
                  <span className="bg-paper-sunk border-ink/20 h-4 flex-1 overflow-hidden rounded-[1px] border">
                    <motion.span
                      // Pink is heat here, not correctness. The heavier pan is
                      // the one the model went with, which on the Paris
                      // specimen is the wrong answer, so teal would be a lie.
                      className={`block h-full ${pan === winner ? "bg-pink" : "bg-ink/30"}`}
                      initial={false}
                      animate={{ width: `${(pan.value / widest) * 100}%` }}
                      transition={{
                        duration: still ? 0 : 0.6,
                        ease: "easeOut",
                      }}
                    />
                  </span>
                  <span className="data text-ink-soft w-24 shrink-0 text-right text-[0.8125rem] tabular-nums">
                    {format(pan.value, shown.unit)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="label text-ink-faint mt-2">{UNIT[shown.unit]}</p>

            <motion.p
              key={shown.subject + shown.kind}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose-measure text-ink-soft mt-4 text-[0.9375rem]"
            >
              {shown.tell}
            </motion.p>

            {stage >= 5 ? (
              <motion.p
                initial={still ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose-measure mt-3 text-[0.9375rem] font-semibold"
              >
                Three units, one instrument, and the same answer every time: the
                thing was fitted to text. There is no true-or-false module to
                repair, which is why these cannot be patched out one at a time.
              </motion.p>
            ) : null}
          </>
        ) : (
          <p className="prose-measure text-ink-soft text-[0.9375rem]">
            Three names, three teams, three fixes. Everything after this is the
            same instrument measuring all three, because they are the same thing
            seen from three angles.
          </p>
        )}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        Probabilities and entropies from a DistilGPT-2 forward pass; cosines
        computed in your browser from GloVe vectors. The same two files the game
        above runs on, and the same functions.
      </figcaption>
    </figure>
  );
}
