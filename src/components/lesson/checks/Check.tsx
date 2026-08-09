"use client";

import { useRef, useState } from "react";
import type { CheckBeat } from "@/lib/check";
import { useProgress } from "@/lib/progress";
import { trackCheckCompleted } from "@/lib/telemetry";
import { ChoiceBeatView } from "./ChoiceBeatView";
import { FillBeatView } from "./FillBeatView";
import { FlagBeatView } from "./FlagBeatView";
import { MatchBeatView } from "./MatchBeatView";
import { SortBeatView } from "./SortBeatView";

/**
 * The check at the end of a module: two or three beats, at most one of them
 * multiple choice.
 */
export function Check({ slug, beats }: { slug: string; beats: CheckBeat[] }) {
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
   */
  const landed = useRef<(number | null)[]>(beats.map(() => null));
  const reported = useRef(false);

  function settle(index: number, fraction: number) {
    if (landed.current[index] !== null) return;

    landed.current = landed.current.map((value, i) =>
      i === index ? fraction : value,
    );
    setScores(landed.current);

    if (reported.current) return;
    if (landed.current.some((value) => value === null)) return;

    reported.current = true;
    const mean =
      landed.current.reduce<number>((sum, value) => sum + (value ?? 0), 0) /
      landed.current.length;
    recordScore(slug, mean);
    trackCheckCompleted(slug, mean);
  }

  return (
    <div className="space-y-5" data-section="check">
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
