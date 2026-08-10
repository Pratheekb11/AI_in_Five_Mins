"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { atTemperature, type LogitData, type LogitPrompt } from "@/lib/logits";

/**
 * Two prompts, one dial, and the thing the dial cannot do.
 */

const LEFT = "memorised";
const RIGHT = "open";
/** The one that has nothing to do with certainty, and everything to do with truth. */
const FACT = "fact";

const TEMPERATURE_BY_STAGE: Record<number, number> = {
  0: 1,
  1: 1,
  2: 0.4,
  3: 1.5,
  4: 1,
};

/** How much of the whole vocabulary the kept candidates hold. */
function keptMass(prompt: LogitPrompt): number {
  return prompt.candidates.reduce((sum, c) => sum + c.probability, 0);
}

function Column({
  prompt,
  temperature,
  highlight,
  still,
}: {
  prompt: LogitPrompt;
  temperature: number;
  /** Marked true where the chapter is making a point about one token. */
  highlight?: string;
  still: boolean | null;
}) {
  const mass = keptMass(prompt);
  const weights = atTemperature(prompt, temperature).map((w) => w * mass);
  const widest = Math.max(...weights);

  return (
    <div>
      <p className="font-data border-ink/20 mb-3 border-b pb-2 text-[0.875rem]">
        {prompt.text.trimEnd()}
        <span className="bg-yellow-wash text-yellow-text ml-1 rounded-[2px] px-2">
          ?
        </span>
      </p>
      <ul className="space-y-1.5">
        {prompt.candidates.slice(0, 8).map((candidate, i) => {
          const marked =
            highlight !== undefined && candidate.text === highlight;
          return (
            <li key={candidate.id} className="flex items-center gap-2">
              <span
                className={`font-data w-20 shrink-0 truncate text-[0.8125rem] ${
                  marked ? "text-teal-text font-bold" : ""
                }`}
              >
                {candidate.text.replace(/ /g, "␣")}
              </span>
              <span className="bg-paper-sunk border-ink/20 h-3 flex-1 overflow-hidden rounded-[1px] border">
                <motion.span
                  className={`block h-full ${marked ? "bg-teal" : "bg-pink"}`}
                  initial={false}
                  animate={{ width: `${(weights[i] / widest) * 100}%` }}
                  transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
                />
              </span>
              <span className="data text-ink-soft w-14 shrink-0 text-right text-[0.75rem] tabular-nums">
                {/* One decimal rounds a cold Genesis to a flat 100.0%, which
                    reads as certainty rather than as rounding. */}
                {(weights[i] * 100).toFixed(weights[i] > 0.999 ? 2 : 1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TemperaturePairFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<LogitData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/data/logits.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<LogitData>;
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

  const find = (id: string) => data.prompts.find((p) => p.id === id);
  const left = find(LEFT);
  const right = find(RIGHT);
  const fact = find(FACT);
  if (!left || !right || !fact) return null;

  const temperature = TEMPERATURE_BY_STAGE[Math.min(stage, 4)] ?? 1;
  const onFact = stage >= 4;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {onFact
            ? "The same loop, on a question with a right answer"
            : "The same model, two pieces of text"}
        </p>
        <p className="label text-ink-faint">
          temperature{" "}
          <span className="data text-pink-text font-bold">
            {temperature.toFixed(1)}
          </span>
        </p>
      </div>

      <div className="px-4 py-4">
        {onFact ? (
          <Column
            prompt={fact}
            temperature={temperature}
            highlight=" France"
            still={still}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <Column prompt={left} temperature={temperature} still={still} />
            {stage >= 1 ? (
              <Column prompt={right} temperature={temperature} still={still} />
            ) : null}
          </div>
        )}

        {stage === 2 ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-4 text-[0.9375rem]"
          >
            Cold, and nothing happened on the left, because there was nothing
            left to sharpen. On the right the same dial has thrown almost
            everything onto one token. The dial did not learn anything about
            fairy tales. It squeezed a shape that was already there.
          </motion.p>
        ) : null}

        {stage === 3 ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-4 text-[0.9375rem]"
          >
            Hot, and the weight spreads into the tail on both sides. That is the
            whole of what people call creativity here, and it is the same motion
            as what people call unreliability. One dial, pointing two ways at
            once, and every assistant you use has already picked a compromise
            for you.
          </motion.p>
        ) : null}

        {onFact ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-4 text-[0.9375rem]"
          >
            Nowhere in that loop is there a step that checks anything against
            the world. Here the true answer is on screen, marked, and it is not
            the favourite. The model is continuing a sentence, and continuing a
            sentence is a different job from answering a question.
          </motion.p>
        ) : null}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.model.name}, real scores from a forward pass, top {data.topK}{" "}
        candidates per prompt. Percentages are shares of the whole vocabulary,
        not of the candidates shown, so they stay comparable as the dial moves.
      </figcaption>
    </figure>
  );
}
