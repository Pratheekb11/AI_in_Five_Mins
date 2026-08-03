"use client";

import { useProgress } from "@/lib/progress";

/**
 * How far through the manual the learner is. Rendered as a row of ticks rather
 * than a percentage — eight lessons is few enough to count, and counting reads
 * as progress you could finish today.
 */
export function ProgressPill() {
  const { progress, completedCount, totalCount } = useProgress();

  return (
    <span
      className="hidden items-center gap-2 sm:flex"
      title={`${completedCount} of ${totalCount} lessons complete`}
    >
      <span className="label text-ink-faint">
        {completedCount}/{totalCount}
      </span>
      <span className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: totalCount }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-[5px] rounded-[1px] border ${
              i < progress.completed.length
                ? "bg-teal border-teal"
                : "border-ink/35"
            }`}
          />
        ))}
      </span>
    </span>
  );
}
