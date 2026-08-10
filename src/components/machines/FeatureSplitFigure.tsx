"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { Feature, FeatureData } from "@/lib/game/features";

/**
 * One pile of messages, cut in two, over and over by different questions.
 */

const CUTS: Record<number, string> = {
  1: "shortcode",
  2: "free",
  3: "long",
  4: "i",
  5: "i",
};

/** Dots on screen. Enough to see a proportion, few enough to animate. */
const DOTS = 220;

type Dot = { id: number; spam: boolean };

type Piles = { yes: Dot[]; no: Dot[]; all: Dot[] };

/**
 * Builds the dots once and then decides, for a given cut, which pile each one
 * lands in.
 */
function pilesFor(data: FeatureData, cut: Feature | undefined): Piles {
  const { corpus } = data;
  const spamDots = Math.round((corpus.spam / corpus.total) * DOTS);

  const all: Dot[] = Array.from({ length: DOTS }, (_, id) => ({
    id,
    spam: id < spamDots,
  }));

  if (!cut) return { yes: [], no: [], all };

  const scale = DOTS / corpus.trainSize;
  const yesSpam = Math.round(cut.train.firesSpam * scale);
  const yesHam = Math.round((cut.train.fires - cut.train.firesSpam) * scale);

  const spam = all.filter((d) => d.spam);
  const ham = all.filter((d) => !d.spam);

  return {
    yes: [...spam.slice(0, yesSpam), ...ham.slice(0, yesHam)],
    no: [...spam.slice(yesSpam), ...ham.slice(yesHam)],
    all,
  };
}

function Swarm({
  dots,
  still,
  label,
  count,
  spam,
}: {
  dots: Dot[];
  still: boolean | null;
  label: string;
  /** The real number of messages, not the number of dots. */
  count: number;
  spam: number;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[0.875rem] font-semibold">{label}</span>
        <span className="data text-ink-soft text-[0.8125rem] tabular-nums">
          {count} · {count === 0 ? "0.0" : ((spam / count) * 100).toFixed(1)}%
          spam
        </span>
      </div>
      <div className="bg-paper-sunk border-ink/20 flex min-h-[3rem] sm:min-h-[4.5rem] flex-wrap content-start gap-[3px] rounded-[2px] border p-2">
        {dots.map((dot) => (
          <motion.span
            key={dot.id}
            layoutId={`msg-${dot.id}`}
            layout={!still}
            transition={
              still
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 26 }
            }
            className={`block h-2 w-2 rounded-[1px] ${
              dot.spam ? "bg-pink" : "bg-blue"
            }`}
          />
        ))}
      </div>
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
      <div className="plate-flush min-h-[10rem] p-3 sm:min-h-[18rem] sm:p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the corpus…</p>
      </div>
    );
  }

  const here = picked && picked.stage === stage ? picked.id : CUTS[stage];
  const cut = data.features.find((f) => f.id === here);
  const { corpus } = data;
  const piles = pilesFor(data, cut);
  const trainSpam = Math.round(corpus.spam * (corpus.trainSize / corpus.total));
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

      <div className="px-4 py-4">
        {cut ? (
          <div className="flex flex-col gap-4 sm:flex-row">
            <Swarm
              dots={piles.yes}
              still={still}
              label="Answered yes"
              count={cut.train.fires}
              spam={cut.train.firesSpam}
            />
            <Swarm
              dots={piles.no}
              still={still}
              label="Answered no"
              count={cut.train.quiet}
              spam={cut.train.quietSpam}
            />
          </div>
        ) : (
          <Swarm
            dots={piles.all}
            still={still}
            label="The pile you start with"
            count={corpus.trainSize}
            spam={trainSpam}
          />
        )}

        {cut ? (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="label text-ink-faint">
              Uncertainty removed
              <motion.span
                key={cut.id}
                initial={still ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="data text-pink-text ml-2 text-base font-bold"
              >
                {cut.train.gain.toFixed(3)} bits
              </motion.span>
            </span>
            <span className="label text-ink-faint">
              out of {corpus.baseEntropy.toFixed(3)} there were to remove
            </span>
          </div>
        ) : (
          <p className="prose-measure text-ink-soft mt-4 text-[0.9375rem]">
            {corpus.trainSize} real text messages, mixed. Roughly one in seven
            is spam, and nothing about the pile tells you which. Every question
            you can ask about a message sorts these dots into two piles, and a
            good question is one whose piles come out less mixed than what it
            started with.
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
                  className={`tap rounded-[2px] border px-2 py-1 text-xs transition-colors ${
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
        {data.source.name}, {data.corpus.total} real messages. The counts are
        the real ones, measured on the {data.corpus.trainSize} training messages
        alone. The dots are scaled: {DOTS} of them for those messages, so each
        dot stands for about {Math.round(data.corpus.trainSize / DOTS)}.
      </figcaption>
    </figure>
  );
}
