"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress";

/**
 * Where the learner is, in the masthead, on every page.
 */
export function ProgressPill() {
  const { totals } = useProgress();

  if (totals.xp === 0) return null;

  const pct = Math.round((totals.intoLevel / totals.levelSpan) * 100);

  return (
    <Link
      href="/#chapters"
      className="tap hover:border-ink border-ink/30 flex items-center gap-2.5 rounded-[2px] border px-2 py-1"
      title={`Level ${totals.level}, ${totals.rank}. ${totals.xp} XP. ${totals.completedCount} of ${totals.totalCount} chapters finished.`}
    >
      <span className="data text-teal-text text-xs font-bold">
        L{totals.level}
      </span>

      <span className="hidden sm:block">
        <span className="bg-paper-sunk border-ink/20 block h-2 w-16 overflow-hidden rounded-[1px] border">
          <span
            className="bg-teal block h-full"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </span>
      </span>

      <span className="label text-ink-faint hidden md:inline">
        {totals.xp} xp
      </span>

      {totals.streakDays > 1 ? (
        <span className="label text-pink-text" title="Days in a row">
          {totals.streakDays} day
          {totals.streakDays === 1 ? "" : "s"}
        </span>
      ) : null}
    </Link>
  );
}
