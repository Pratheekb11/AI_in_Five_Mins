"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import {
  analogy,
  loadEmbeddings,
  similarity,
  vectorFor,
  type EmbeddingSpace,
} from "@/lib/embeddings";

/**
 * The fifty numbers themselves, which every other figure on this page hides.
 */

const SUBJECT = "cat";
const KIN = "dog";
const STRANGER = "table";

/** The famous one, computed rather than quoted. */
const A = "king";
const B = "man";
const C = "woman";

type Strip = { word: string; values: number[]; ink: "blue" | "pink" | "teal" };

function stripOf(
  space: EmbeddingSpace,
  word: string,
  ink: Strip["ink"],
): Strip | null {
  const v = vectorFor(space, word);
  if (!v) return null;
  return { word, values: Array.from(v), ink };
}

const CELL: Record<Strip["ink"], string> = {
  blue: "bg-blue",
  pink: "bg-pink",
  teal: "bg-teal",
};

function StripRow({ strip, still }: { strip: Strip; still: boolean | null }) {
  // The values are unit-normalised, so they sit in a narrow band around zero.
  // Scaling by the strip's own largest magnitude is what makes the pattern
  // visible at all, and it is the same scaling for every strip on screen.
  const widest = Math.max(...strip.values.map(Math.abs)) || 1;

  return (
    <motion.div
      layout={!still}
      initial={still ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="font-data mb-1 text-[0.8125rem] font-bold">{strip.word}</p>
      <div className="flex h-7 gap-[1px]">
        {strip.values.map((value, i) => (
          <span
            key={i}
            className="bg-paper-sunk relative flex-1 overflow-hidden"
            title={value.toFixed(3)}
          >
            <span
              className={`absolute inset-x-0 ${CELL[strip.ink]}`}
              style={{
                height: `${(Math.abs(value) / widest) * 100}%`,
                [value >= 0 ? "bottom" : "top"]: 0,
                opacity: value >= 0 ? 1 : 0.45,
              }}
            />
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function VectorStripFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [space, setSpace] = useState<EmbeddingSpace | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadEmbeddings()
      .then((s) => alive && setSpace(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="plate-flush p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          The vectors did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="plate-flush min-h-[10rem] p-3 sm:min-h-[18rem] sm:p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the vectors…</p>
      </div>
    );
  }

  const doingSums = stage >= 3;

  const strips = doingSums
    ? ([
        stripOf(space, A, "blue"),
        stripOf(space, B, "pink"),
        stripOf(space, C, "teal"),
      ].filter(Boolean) as Strip[])
    : ([
        stripOf(space, SUBJECT, "blue"),
        stage >= 1 ? stripOf(space, KIN, "blue") : null,
        stage >= 2 ? stripOf(space, STRANGER, "pink") : null,
      ].filter(Boolean) as Strip[]);

  const kin = similarity(space, SUBJECT, KIN);
  const stranger = similarity(space, SUBJECT, STRANGER);
  const answers = doingSums ? analogy(space, A, B, C, 3) : null;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {doingSums
            ? `${A} − ${B} + ${C}, on the numbers themselves`
            : `Every word is ${space.dims} numbers. Here they are.`}
        </p>
        <p className="label text-ink-faint">
          up is positive · down is negative
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        {strips.map((strip) => (
          <StripRow key={strip.word} strip={strip} still={still} />
        ))}

        {stage >= 2 && !doingSums ? (
          <motion.div
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-ink/20 space-y-1 border-t pt-3"
          >
            <p className="text-[0.9375rem]">
              <span className="font-data">
                {SUBJECT} · {KIN}
              </span>
              <span className="data text-teal-text ml-3 font-bold tabular-nums">
                {kin?.toFixed(3)}
              </span>
            </p>
            <p className="text-[0.9375rem]">
              <span className="font-data">
                {SUBJECT} · {STRANGER}
              </span>
              <span className="data text-pink-text ml-3 font-bold tabular-nums">
                {stranger?.toFixed(3)}
              </span>
            </p>
            <p className="prose-measure text-ink-soft pt-1 text-[0.9375rem]">
              Nobody wrote either number. They are the angle between two lists
              of {space.dims} numbers, and the lists came out of counting which
              words turn up near which other words.
            </p>
          </motion.div>
        ) : null}

        {doingSums && answers ? (
          <motion.div
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-ink/20 border-t pt-3"
          >
            <p className="label text-ink-faint mb-2">
              Nearest words to the result, with the three inputs ruled out
            </p>
            <ul className="space-y-1">
              {answers.map((n, i) => (
                <li key={n.word} className="text-[0.9375rem]">
                  <span
                    className={`font-data ${i === 0 ? "text-teal-text font-bold" : ""}`}
                  >
                    {n.word}
                  </span>
                  <span className="data text-ink-soft ml-3 text-sm tabular-nums">
                    {n.similarity.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
            {stage >= 4 ? (
              <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
                The arithmetic runs on the strips, not on any picture of them.
                And the result does not land on a word: it lands near one, and
                the three inputs have to be excluded by hand or most analogies
                answer with one of their own ingredients.
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {space.source.name}, trained on {space.source.trainedOn}. Every number
        is computed in your browser across all {space.dims} dimensions, from the
        same vectors the game uses. That is {space.words.length} words stored
        compactly enough to ship, so a cosine here lands a few thousandths off
        the same sum run at full precision over a fifty thousand word
        vocabulary.
      </figcaption>
    </figure>
  );
}
