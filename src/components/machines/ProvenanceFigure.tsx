"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { ProvenanceData, ProvenanceRound } from "@/lib/game/provenance";

/**
 * One question, one bar, and one rank readout that never gets rebuilt.
 */

/** Rank 0 sits at the left edge; the track saturates just past a thousand. */
const TRACK_DEPTH = Math.log10(1024);

function trackPosition(rank: number): number {
  return Math.min(100, (Math.log10(rank + 1) / TRACK_DEPTH) * 100);
}

/**
 * Its favourite word is often a space and a punctuation mark. Escaping that
 * for display turned one round into a row of backslashes, so spaces get a
 * printable stand-in and everything else is shown as it is.
 */
function visible(text: string): string {
  return text.replace(/ /g, "␣");
}

const STAGE_ROUND: Record<number, string> = {
  0: "usa-capital",
  1: "usa-capital",
  2: "photosynthesis",
  3: "photosynthesis",
  4: "photosynthesis",
  5: "usa-capital",
};

const SOURCED_AT = new Set([1, 3]);

export function ProvenanceFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<ProvenanceData | null>(null);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<{
    stage: number;
    round?: string;
    sourced?: boolean;
  }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/provenance.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ProvenanceData>;
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
      <div className="plate-flush min-h-[10rem] p-3 sm:min-h-[18rem] sm:p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the measurements…
        </p>
      </div>
    );
  }

  const here = pick && pick.stage === stage ? pick : undefined;
  const wanted = here?.round ?? STAGE_ROUND[Math.min(stage, 5)];
  const round: ProvenanceRound =
    data.rounds.find((r) => r.id === wanted) ?? data.rounds[0];
  const sourced = here?.sourced ?? SOURCED_AT.has(stage);
  const sums = stage === 4 && !here;
  const canExplore = stage >= 5;

  const shown = sourced ? round.sourced : round.bare;
  const { arithmetic } = data;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 border-b px-4 py-3">
        <p className="label text-ink-faint mb-1">
          {sums
            ? "The third door · a sum, not a fact"
            : sourced
              ? "Asked with the source in front of it"
              : "Asked cold, out of memory alone"}
        </p>
        <p className="font-data text-[0.9375rem]">
          {sums ? arithmetic.examples[0].prompt : round.question}
          <span className="bg-yellow-wash text-yellow-text ml-1 rounded-[2px] px-2">
            {sums ? arithmetic.examples[0].truth : round.answerLabel}
          </span>
        </p>
      </div>

      {/* The sourced sentence, which is all a search tool or a file upload
          really does: put the fact where the model can read it. */}
      {sourced && !sums ? (
        <motion.div
          initial={still ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-ink/20 bg-blue-wash overflow-hidden border-b px-4 py-2.5"
        >
          <p className="label text-blue-text mb-1">Handed to it first</p>
          <p className="text-blue-text text-[0.875rem]">{round.fact}</p>
        </motion.div>
      ) : null}

      <div className="px-4 py-4">
        {sums ? (
          <div>
            <p className="display-md mb-1">
              <span className="text-pink-text">{arithmetic.correct}</span> right
              out of {arithmetic.problems}
            </p>
            <p className="prose-measure text-ink-soft mb-4 text-[0.9375rem]">
              {arithmetic.description} No sentence you can put in front of it
              fixes this, because the answer was never written down anywhere to
              be recalled. It has to be worked out, and working out is not what
              this machine does.
            </p>
            <ul className="space-y-1.5">
              {arithmetic.examples.slice(0, 4).map((example) => (
                <li
                  key={example.prompt}
                  className="font-data flex flex-wrap items-baseline gap-x-3 text-[0.8125rem]"
                >
                  <span className="w-24 shrink-0">{example.prompt}</span>
                  <span className="text-teal-text">{example.truth}</span>
                  <span className="text-ink-faint">it wrote</span>
                  <span className="text-pink-text">{example.raw.trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            {/* The rank track. The whole figure is really this one marker. */}
            <p className="label text-ink-faint mb-2">
              Where {round.answerLabel} sat in its own ranking
            </p>
            <div className="mb-1.5 flex items-center gap-3">
              <span className="bg-paper-sunk border-ink/20 relative h-8 flex-1 rounded-[1px] border">
                <motion.span
                  className={`absolute top-0 bottom-0 w-1.5 ${
                    shown.rank === 0 ? "bg-teal" : "bg-pink"
                  }`}
                  initial={false}
                  animate={{
                    left: `calc(${trackPosition(shown.rank)}% - 3px)`,
                  }}
                  transition={{ duration: still ? 0 : 0.8, ease: "easeInOut" }}
                />
              </span>
              <motion.span
                key={shown.rank}
                initial={still ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`data w-28 shrink-0 text-right text-lg font-bold tabular-nums ${
                  shown.rank === 0 ? "text-teal-text" : "text-pink-text"
                }`}
              >
                {shown.rank === 0 ? "first choice" : `${shown.rank} deep`}
              </motion.span>
            </div>
            <div className="label text-ink-faint mb-4 flex justify-between">
              <span>its own first choice</span>
              <span>buried a thousand deep</span>
            </div>

            <p className="label text-ink-faint mb-2">
              How sure it was of {round.answerLabel}
            </p>
            <div className="flex items-center gap-3">
              <span className="bg-paper-sunk border-ink/20 h-4 flex-1 overflow-hidden rounded-[1px] border">
                <motion.span
                  className={`block h-full ${
                    shown.rank === 0 ? "bg-teal" : "bg-pink"
                  }`}
                  initial={false}
                  animate={{ width: `${shown.probability * 100}%` }}
                  transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
                />
              </span>
              <span className="data text-ink-soft w-20 shrink-0 text-right text-sm tabular-nums">
                {(shown.probability * 100).toFixed(
                  shown.probability < 0.01 ? 2 : 1,
                )}
                %
              </span>
            </div>

            {!sourced ? (
              <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
                What it wanted to write instead was{" "}
                <span className="font-data bg-pink-wash text-pink-text rounded-[2px] px-1.5">
                  {visible(shown.topText)}
                </span>
                . Not a wrong fact. Just the likeliest next word, which is all
                it was ever choosing.
              </p>
            ) : (
              <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
                Nothing was learned and nothing was looked up by the model
                itself. One sentence was put in front of it, and the answer it
                could not reach went straight to the top.
              </p>
            )}
          </div>
        )}
      </div>

      {canExplore ? (
        <div className="border-ink/20 space-y-3 border-t px-4 py-3">
          <div>
            <p className="label text-ink-faint mb-2">What it was given</p>
            <div className="flex flex-wrap gap-2">
              {[
                { on: false, label: "Nothing, just the question" },
                { on: true, label: "The fact, in front of it" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() =>
                    setPick({ stage, round: round.id, sourced: option.on })
                  }
                  className={`tap rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    option.on === sourced
                      ? "border-ink bg-paper-sunk font-semibold"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label text-ink-faint mb-2">
              On any of the {data.rounds.length} questions. The three it already
              knew are marked.
            </p>
            <div className="flex flex-wrap gap-2">
              {data.rounds.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPick({ stage, round: option.id, sourced })}
                  className={`tap rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    option.id === round.id
                      ? "border-ink bg-paper-sunk font-semibold"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {option.answerLabel}
                  {option.kind === "memory" ? (
                    <span className="text-teal-text ml-1">✓</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.model.name}. {data.note} Every sourced sentence is quoted from the
        cited page, and the sums are read greedily and compared with the real
        total.
      </figcaption>
    </figure>
  );
}
