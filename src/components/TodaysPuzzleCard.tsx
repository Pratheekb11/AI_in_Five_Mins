"use client";

import { HallucinationHunt } from "@/components/games/HallucinationHunt";
import type { HuntData } from "@/lib/game/hunt";
import { useProgress } from "@/lib/progress";

/**
 * The daily puzzle, promoted. It changes every day and needs no chapter
 * finished first, which the six-chapter path cannot say about itself, a
 * finite site cannot carry a Duolingo-style streak on its lessons, but this
 * can.
 */
export function TodaysPuzzleCard({
  initialData,
}: {
  /** Read server-side by whichever page renders this, so the puzzle is
   *  already there, which day it is stays a client decision. */
  initialData: HuntData;
}) {
  const { progress } = useProgress();
  const days = progress.puzzleStreak.days;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-ink-faint mb-1">Today&rsquo;s puzzle</p>
          <h2 className="display-md">A real paragraph, three quiet edits.</h2>
        </div>
        {days > 0 ? (
          <p className="label text-pink-text shrink-0" title="Days solved in a row">
            {days} day{days === 1 ? "" : "s"} in a row
          </p>
        ) : null}
      </div>
      <p className="text-ink-soft mb-5 text-[0.9375rem]">
        Sixty seconds, no chapter required. Everyone gets the same paragraph
        today.
      </p>
      <HallucinationHunt initialData={initialData} />
    </div>
  );
}
