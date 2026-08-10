"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { MERGES } from "@/lib/merges";

/**
 * Byte-pair encoding, played back one merge at a time.
 */

/** Long enough to read which pair joined, short enough to keep watching. */
const HOLD_MS = 1250;
/** The gap-closing beat before the two tiles become one. */
const JOIN_MS = 420;

/** Spaces are tokens too, and an invisible tile teaches nothing. */
function visible(text: string) {
  return text.replace(/ /g, "␣");
}

/**
 * How common a token is, in words. The id IS the rank in tiktoken, so a low
 * number means the pair was worth memorising early, which is a statement
 * about how often it appears in text, not about how meaningful it is.
 */
function commonness(id: number) {
  if (id < 1000) return "one of the first thousand it ever learned";
  if (id < 20000) return "very common";
  if (id < 80000) return "common";
  return "uncommon";
}

type Scene = {
  /** Which word is being traced. */
  trace: number;
  /** How many merges have been committed. */
  done: number;
  /** True while the pair for the next merge is closing the gap. */
  joining: boolean;
  playing: boolean;
};

export function MergeReel() {
  const still = useReducedMotion();
  const data = MERGES;
  const [scene, setScene] = useState<Scene>({
    trace: 0,
    done: 0,
    joining: false,
    playing: true,
  });

  const trace = data.traces[scene.trace];
  const total = trace.steps.length;
  const finished = scene.done >= total;

  // The clock. Two beats per merge: mark the pair, then join it. Both live in
  // the timer callback rather than in the effect body, because a state update
  // written straight into an effect runs twice under the compiler.
  useEffect(() => {
    if (!scene.playing || finished) return;
    const id = setTimeout(
      () =>
        setScene((s) => {
          if (s.done >= total) return s;
          return s.joining
            ? { ...s, joining: false, done: s.done + 1 }
            : { ...s, joining: true };
        }),
      scene.joining ? (still ? 0 : JOIN_MS) : still ? 400 : HOLD_MS,
    );
    return () => clearTimeout(id);
  }, [scene.playing, scene.joining, scene.done, total, finished, still]);

  const step = useCallback(() => {
    setScene((s) => ({
      ...s,
      playing: false,
      joining: false,
      done: Math.min(total, s.done + 1),
    }));
  }, [total]);

  const restart = useCallback(() => {
    setScene((s) => ({ ...s, done: 0, joining: false, playing: true }));
  }, []);

  const pick = useCallback((n: number) => {
    setScene({ trace: n, done: 0, joining: false, playing: true });
  }, []);

  // What is on screen right now: the pieces as they stand before the next
  // merge is committed.
  const pieces = finished ? trace.final : trace.steps[scene.done].pieces;
  const next = finished ? null : trace.steps[scene.done];
  /** The two tiles about to become one, so they can be marked before they do. */
  const pairAt = next ? next.at : -1;

  return (
    <figure className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">Byte-pair encoding, one merge at a time</span>
        <span className="label text-ink-faint">
          {finished
            ? `${trace.steps.length} merges · ${trace.final.length} token${
                trace.final.length === 1 ? "" : "s"
              }`
            : `merge ${scene.done + 1} of ${trace.steps.length}`}
        </span>
      </div>

      {/* Which word. Each one is here because it goes wrong differently. */}
      <div className="border-ink/20 flex flex-wrap gap-1.5 border-b px-4 py-3">
        {data.traces.map((t, i) => (
          <button
            key={t.word}
            type="button"
            onClick={() => pick(i)}
            className={`tap font-data rounded-[2px] border px-2.5 py-1 text-[0.8125rem] ${
              i === scene.trace
                ? "border-ink bg-paper-raised font-bold"
                : "border-ink/25 text-ink-soft hover:border-ink"
            }`}
          >
            {visible(t.word)}
          </button>
        ))}
      </div>

      <div className="p-5 md:p-6">
        <p className="label text-ink-faint mb-3">
          {scene.done === 0
            ? `Where the tokenizer starts. ${trace.bytes} bytes, nothing grouped`
            : "What it is holding now"}
        </p>

        {/* The tiles. `layout` is doing the real work: when a merge commits,
            the surviving tiles keep their identity and the merged one grows
            into the space the pair occupied, so the join is continuous rather
            than a cut. */}
        <div className="mb-6 flex min-h-[4.5rem] flex-wrap items-center gap-1">
          {pieces.map((piece, i) => {
            /* Identity is where the piece starts in the word, not where it sits
               in the list. A merge removes a tile, so index-based keys would
               make every tile after the join a different tile and the layout
               animation would have nothing to follow. Offsets survive: the
               merged tile keeps the left tile's key and simply grows. */
            const offset = pieces.slice(0, i).join("").length;
            const inPair = i === pairAt || i === pairAt + 1;
            const closing = scene.joining && inPair;
            const justMerged =
              scene.done > 0 &&
              !scene.joining &&
              i === trace.steps[scene.done - 1].at;

            return (
              <motion.span
                key={`${scene.trace}-${offset}`}
                layout={!still}
                initial={still ? false : { opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  marginRight: closing && i === pairAt ? -4 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 30,
                }}
                className={`font-data inline-flex items-center rounded-[2px] border px-2.5 py-2 text-[1.0625rem] leading-none ${
                  closing
                    ? "border-pink bg-pink-wash text-pink-text font-bold"
                    : justMerged
                      ? "border-teal bg-teal-wash text-teal-text font-bold"
                      : "border-ink/30 bg-paper-sunk"
                }`}
              >
                {visible(piece)}
              </motion.span>
            );
          })}
        </div>

        {/* The commentary. One merge, what joined, and how common it is,
            because "common" is the only reason any of this happened. */}
        <div className="border-ink/20 bg-paper-sunk min-h-[5.5rem] rounded-[2px] border p-4">
          {finished ? (
            <>
              <p className="mb-1.5 text-[1.0625rem]">
                Done. <strong>{visible(trace.word)}</strong> reaches the model
                as{" "}
                <strong>
                  {trace.final.length} token
                  {trace.final.length === 1 ? "" : "s"}
                </strong>
                : {trace.final.map(visible).join(" · ")}
              </p>
              <p className="text-ink-soft text-[0.9375rem]">{trace.teaches}</p>
            </>
          ) : (
            <>
              <p className="mb-1.5 text-[1.0625rem]">
                Best pair available:{" "}
                <span className="font-data bg-pink-wash text-pink-text rounded-[2px] px-1.5 py-0.5 font-bold">
                  {visible(next!.left)}
                </span>{" "}
                +{" "}
                <span className="font-data bg-pink-wash text-pink-text rounded-[2px] px-1.5 py-0.5 font-bold">
                  {visible(next!.right)}
                </span>{" "}
                &rarr;{" "}
                <span className="font-data bg-teal-wash text-teal-text rounded-[2px] px-1.5 py-0.5 font-bold">
                  {visible(next!.into)}
                </span>
              </p>
              <p className="text-ink-soft text-[0.9375rem]">
                That chunk is token{" "}
                <span className="data tabular-nums">
                  {next!.id.toLocaleString("en-US")}
                </span>{" "}
                out of {data.vocabularySize.toLocaleString("en-US")}.{" "}
                {commonness(next!.id)}. Of every pair it could have joined here,
                this one was the most common, so it goes first.
              </p>
            </>
          )}
        </div>

        <div className="border-ink/20 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-ink-faint text-[0.8125rem]">
            Real o200k_base merges, in the order the tokenizer performs them.
          </p>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setScene((s) => ({ ...s, playing: !s.playing }))}
              disabled={finished}
              className="tap plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              {scene.playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={step}
              disabled={finished}
              className="tap plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              One merge
            </button>
            <button
              type="button"
              onClick={restart}
              className="tap plate hover:border-ink px-3 py-1.5 text-[0.875rem]"
            >
              Replay
            </button>
          </span>
        </div>
      </div>
    </figure>
  );
}
