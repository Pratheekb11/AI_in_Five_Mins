"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import type { SplitData, SplitModel } from "@/lib/game/split";

/**
 * The split, done to the messages rather than described.
 *
 * One block of dots arrives, a wall comes down between them, and four in every
 * five fly to the left of it. The ones on the right are never shown to
 * anything: they sit there, untouched, until a model has finished learning and
 * has to answer them cold. Watching the dots actually move across the wall is
 * the difference between knowing the definition of a test set and understanding
 * why it has to exist.
 *
 * Then a model is put in the left room and both rooms are marked. Pink is a
 * message it got wrong. The memoriser leaves the left room completely clean and
 * the right room speckled, and no explanation of overfitting lands as hard as
 * seeing those two rooms side by side.
 *
 * SAMPLING. There are 5,574 messages and 220 dots, so one dot is about
 * twenty-five messages. Every percentage and every count is the real measured
 * one; only the dots are scaled, and the caption says so.
 *
 * Stages:
 *   0  all of it, in one heap
 *   1  the wall, and four fifths going left
 *   2  a model that memorises
 *   3  a model that learned something
 *   4  a model that was not shown enough
 *   5  any of the ten
 */

const DOTS = 220;

const SHOWN: Record<number, string> = {
  2: "memoriser",
  3: "learned",
  4: "tiny",
  5: "memoriser",
};

type Dot = { id: number; wrong: boolean };

/** Marks the first `wrong` dots of a room, so a dot only ever changes state. */
function room(ids: number[], accuracy: number): Dot[] {
  const wrong = Math.round(ids.length * (1 - accuracy));
  return ids.map((id, i) => ({ id, wrong: i < wrong }));
}

function Room({
  dots,
  still,
  label,
  detail,
  accuracy,
  marked,
}: {
  dots: Dot[];
  still: boolean | null;
  label: string;
  detail: string;
  accuracy?: number;
  marked: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[0.875rem] font-semibold">{label}</span>
        {accuracy === undefined ? null : (
          <motion.span
            key={accuracy}
            initial={still ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`data text-base font-bold tabular-nums ${
              marked ? "text-ink" : "text-ink-soft"
            }`}
          >
            {(accuracy * 100).toFixed(1)}%
          </motion.span>
        )}
      </div>
      <div className="bg-paper-sunk border-ink/20 flex min-h-[5rem] flex-wrap content-start gap-[3px] rounded-[2px] border p-2">
        {dots.map((dot) => (
          <motion.span
            key={dot.id}
            layoutId={`held-${dot.id}`}
            layout={!still}
            transition={
              still
                ? { duration: 0 }
                : { type: "spring", stiffness: 240, damping: 24 }
            }
            className={`block h-2 w-2 rounded-[1px] ${
              !marked ? "bg-blue" : dot.wrong ? "bg-pink" : "bg-teal"
            }`}
          />
        ))}
      </div>
      <p className="text-ink-faint mt-1 text-[0.8125rem]">{detail}</p>
    </div>
  );
}

export function HoldoutFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<SplitData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<{ stage: number; id: string }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/split.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SplitData>;
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
          The results did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the results…</p>
      </div>
    );
  }

  const wanted = picked && picked.stage === stage ? picked.id : SHOWN[stage];
  const model: SplitModel | undefined = data.models.find(
    (m) => m.id === wanted,
  );
  const marked = Boolean(model);
  const explore = stage >= 5;

  const trainDots = Math.round(
    (data.corpus.trainSize / data.corpus.total) * DOTS,
  );
  const left = Array.from({ length: trainDots }, (_, i) => i);
  const right = Array.from(
    { length: DOTS - trainDots },
    (_, i) => i + trainDots,
  );
  const split = stage >= 1;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {model ? model.name : "Every message you have"}
        </p>
        <p className="label text-ink-faint">
          {marked ? (
            <>
              <span className="text-teal-text">teal is right</span> ·{" "}
              <span className="text-pink-text">pink is wrong</span>
            </>
          ) : (
            "one dot is about 25 messages"
          )}
        </p>
      </div>

      <div className="px-4 py-4">
        {split ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Room
              dots={room(left, model ? model.train.accuracy : 1)}
              still={still}
              label="What it learns from"
              detail={`${data.corpus.trainSize} messages, shown to the model`}
              accuracy={model?.train.accuracy}
              marked={marked}
            />
            {/* The wall. Everything on this page is about which side of it a
                message is on. */}
            <div className="border-ink/40 hidden self-stretch border-l border-dashed sm:block" />
            <Room
              dots={room(right, model ? model.test.accuracy : 1)}
              still={still}
              label="What it is judged on"
              detail={`${data.corpus.testSize} messages, locked away until the end`}
              accuracy={model?.test.accuracy}
              marked={marked}
            />
          </div>
        ) : (
          <Room
            dots={room(
              Array.from({ length: DOTS }, (_, i) => i),
              1,
            )}
            still={still}
            label="The whole collection"
            detail={`${data.corpus.total} real text messages, ${data.corpus.spam} of them spam`}
            marked={false}
          />
        )}

        {model ? (
          <motion.div
            key={model.id}
            initial={still ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <p className="text-[0.9375rem] font-semibold">
              {model.gap > 0.05
                ? `It drops ${(model.gap * 100).toFixed(1)} points the moment it leaves the room it studied in.`
                : model.gap > 0.01
                  ? `It gives up ${(model.gap * 100).toFixed(1)} points on messages it has not seen.`
                  : "Both rooms agree, so whatever it knows, it knew before it saw this data."}
            </p>
            <p className="prose-measure text-ink-soft mt-1 text-[0.9375rem]">
              {model.why}
            </p>
          </motion.div>
        ) : (
          <p className="prose-measure text-ink-soft mt-4 text-[0.9375rem]">
            {split
              ? "Four in every five go left, and the model is allowed to study those. The rest are locked away and not looked at once. That is the only way to find out whether a model learned anything, because nothing stops it from simply remembering."
              : "Every message you have, in one heap. Hand all of it to a model and there is no way left to find out what it knows, because any question you ask it, it has already been given the answer to."}
          </p>
        )}
      </div>

      {explore ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <p className="label text-ink-faint mb-2">
            Ten models, same rooms. Biggest drop first.
          </p>
          <div className="flex flex-wrap gap-2">
            {[...data.models]
              .sort((a, b) => b.gap - a.gap)
              .map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPicked({ stage, id: option.id })}
                  className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    option.id === model?.id
                      ? "border-ink bg-paper-sunk font-semibold"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {option.name}
                </button>
              ))}
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.source.name}. Every accuracy is measured, on the same seeded 80/20
        split the rest of the site uses. The dots are scaled: {DOTS} of them for{" "}
        {data.corpus.total} messages, marked in the same proportion as the real
        result.
      </figcaption>
    </figure>
  );
}
