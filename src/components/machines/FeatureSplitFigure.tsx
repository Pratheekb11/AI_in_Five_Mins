"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { Feature, FeatureData } from "@/lib/game/features";

/**
 * One pile of messages, cut in two, over and over by different questions.
 *
 * The pile is the object. It arrives whole, mixed, 13.4% spam, and every step
 * after that is the same pile cut by a different yes-or-no question. Because it
 * is never redrawn, the only thing there is to notice is how cleanly a
 * particular cut separates the colours, which is exactly the judgement the
 * chapter is teaching.
 *
 * The order is chosen to break the intuition in the right sequence. The best
 * feature first, so the reader sees what a clean cut looks like. Then the word
 * everybody would have picked, which is not clean at all. Then a feature that
 * has nothing to do with the words in the message and beats it anyway. Then the
 * one that points the other way: "says I or me" catches almost no spam, and is
 * a genuinely useful feature for exactly that reason.
 *
 * Every count is from `features.json`, measured on the training split.
 *
 * Stages:
 *   0  the pile, uncut
 *   1  the sharpest question in the set
 *   2  the one everybody reaches for first
 *   3  a question about nothing but length
 *   4  a feature that works by pointing the other way
 *   5  what a model is left holding
 */

const CUTS: Record<number, string> = {
  1: "shortcode",
  2: "free",
  3: "long",
  4: "i",
  5: "i",
};

function Bar({
  spam,
  total,
  still,
  label,
}: {
  spam: number;
  total: number;
  still: boolean | null;
  label: string;
}) {
  const share = total === 0 ? 0 : spam / total;
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[0.875rem] font-semibold">{label}</span>
        <span className="data text-ink-soft text-[0.8125rem] tabular-nums">
          {total} messages · {(share * 100).toFixed(1)}% spam
        </span>
      </div>
      <motion.span
        layout={!still}
        className="bg-paper-sunk border-ink/20 flex h-7 overflow-hidden rounded-[1px] border"
      >
        <motion.span
          className="bg-pink block h-full"
          initial={false}
          animate={{ width: `${share * 100}%` }}
          transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
        />
        <motion.span
          className="bg-blue block h-full"
          initial={false}
          animate={{ width: `${(1 - share) * 100}%` }}
          transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
        />
      </motion.span>
    </div>
  );
}

export function FeatureSplitFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<FeatureData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<{ stage: number; id: string }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/features.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<FeatureData>;
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
          The corpus did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the corpus…</p>
      </div>
    );
  }

  const here = picked && picked.stage === stage ? picked.id : CUTS[stage];
  const cut: Feature | undefined = data.features.find((f) => f.id === here);
  const { corpus } = data;
  const explore = stage >= 5;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {cut ? `Cut by: ${cut.label}` : "Every training message, uncut"}
        </p>
        <p className="label text-ink-faint">
          <span className="text-pink-text">pink is spam</span> ·{" "}
          <span className="text-blue-text">blue is ordinary</span>
        </p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <Bar
          spam={Math.round(corpus.spam * (corpus.trainSize / corpus.total))}
          total={corpus.trainSize}
          still={still}
          label="The pile you start with"
        />

        {cut ? (
          <motion.div
            layout={!still}
            initial={still ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 space-y-4 border-t pt-4"
          >
            <Bar
              spam={cut.train.firesSpam}
              total={cut.train.fires}
              still={still}
              label="Answered yes"
            />
            <Bar
              spam={cut.train.quietSpam}
              total={cut.train.quiet}
              still={still}
              label="Answered no"
            />

            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="label text-ink-faint">
                Uncertainty removed
                <span className="data text-pink-text ml-2 text-base font-bold">
                  {cut.train.gain.toFixed(3)} bits
                </span>
              </span>
              <span className="label text-ink-faint">
                out of {corpus.baseEntropy.toFixed(3)} there were to remove
              </span>
            </div>
          </motion.div>
        ) : (
          <p className="prose-measure text-ink-soft text-[0.9375rem]">
            {corpus.trainSize} real text messages, mixed. Roughly one in seven is
            spam, and nothing about the pile tells you which. Every question you
            can ask about a message cuts this bar in two, and a good question is
            one whose two halves are less mixed than what it started with.
          </p>
        )}
      </div>

      {explore ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <p className="label text-ink-faint mb-2">
            Every candidate, worst to best. Cut the pile with any of them.
          </p>
          <div className="flex flex-wrap gap-2">
            {[...data.features]
              .sort((a, b) => a.train.gain - b.train.gain)
              .map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPicked({ stage, id: option.id })}
                  className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    option.id === cut?.id
                      ? "border-ink bg-paper-sunk font-semibold"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.name}, {data.corpus.total} real messages. Counts are from
        the {data.corpus.trainSize} training messages only, on the same seeded
        split the rest of the site uses, so no feature is judged on the messages
        it will later be tested against.
      </figcaption>
    </figure>
  );
}
