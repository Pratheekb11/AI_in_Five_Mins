"use client";

import { useState } from "react";
import type { CheckBeat } from "@/lib/check";
import { useProgress } from "@/lib/progress";
import { ChoiceBeatView } from "./ChoiceBeatView";
import { FillBeatView } from "./FillBeatView";
import { FlagBeatView } from "./FlagBeatView";
import { MatchBeatView } from "./MatchBeatView";
import { SortBeatView } from "./SortBeatView";

/**
 * The check at the end of a module: two or three beats, at most one of them
 * multiple choice.
 *
 * Score is the mean of the beats rather than a count of questions, so a sort of
 * six items and a single choice count the same. Progress is recorded once every
 * beat has been settled, and only ever improves on itself.
 */
export function Check({
  slug,
  beats,
}: {
  slug: string;
  beats: CheckBeat[];
}) {
  const { recordScore, scoreFor } = useProgress();
  const [scores, setScores] = useState<(number | null)[]>(() =>
    beats.map(() => null),
  );

  const settled = scores.filter((s) => s !== null).length;
  const done = settled === beats.length;
  const total = scores.reduce<number>((sum, s) => sum + (s ?? 0), 0);
  const best = scoreFor(slug);

  /**
   * Settles one beat, and records the module once every beat has landed.
   *
   * The recording deliberately happens out here rather than inside the state
   * updater. An updater has to be pure: React is free to run it during a
   * render, and `recordScore` writes to the progress store, which notifies the
   * header pill. Doing that from inside the updater meant updating one
   * component while rendering another, which React reports as an error.
   *
   * Reading `scores` from this render is safe because every beat settles
   * exactly once and each settle is a separate user action, so there is no
   * batch in which two beats land against the same stale array.
   */
  function settle(index: number, fraction: number) {
    if (scores[index] !== null) return;

    const next = [...scores];
    next[index] = fraction;
    setScores(next);

    if (next.every((s) => s !== null)) {
      const mean =
        next.reduce<number>((sum, s) => sum + (s ?? 0), 0) / next.length;
      recordScore(slug, mean);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-5">
        {beats.map((beat, i) => {
          const onSettled = (fraction: number) => settle(i, fraction);

          switch (beat.kind) {
            case "choice":
              return (
                <ChoiceBeatView key={i} beat={beat} onSettled={onSettled} />
              );
            case "sort":
              return <SortBeatView key={i} beat={beat} onSettled={onSettled} />;
            case "match":
              return (
                <MatchBeatView key={i} beat={beat} onSettled={onSettled} />
              );
            case "flag":
              return <FlagBeatView key={i} beat={beat} onSettled={onSettled} />;
            case "fill":
              return <FillBeatView key={i} beat={beat} onSettled={onSettled} />;
          }
        })}
      </ol>

      <div
        className="plate-flush bg-paper-sunk flex flex-wrap items-center justify-between gap-3 p-4"
        aria-live="polite"
      >
        <span className="label text-ink-faint">
          {done ? "Chapter complete" : `${settled} of ${beats.length} done`}
        </span>
        <span className="data text-lg font-semibold">
          {Math.round((total / beats.length) * 100)}%
          {best !== undefined && done ? (
            <span className="text-ink-faint ml-2 text-xs font-normal">
              best {Math.round(best * 100)}%
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
