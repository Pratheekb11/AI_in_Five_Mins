"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/progress";

/** Counts up to a new value rather than snapping to it, so a point award in a
 *  game reads as landing in the header, not as a number that just changed. */
function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      // First paint: no history to count up from, so it just shows.
      mounted.current = true;
      from.current = value;
      setShown(value);
      return;
    }
    if (from.current === value) return;
    const still = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const start = from.current;
    const startedAt = performance.now();
    const dur = still ? 0 : 500;
    let raf = 0;
    const step = (now: number) => {
      const t = dur === 0 ? 1 : Math.min(1, (now - startedAt) / dur);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(start + (value - start) * eased);
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return shown;
}

/**
 * Where the learner is, in the masthead, on every page.
 */
export function ProgressPill() {
  const { totals } = useProgress();
  const shownXp = useCountUp(totals.xp);

  if (totals.xp === 0) return null;

  const pct = Math.round((totals.intoLevel / totals.levelSpan) * 100);

  return (
    <Link
      href="/curriculum#chapter"
      className="tap hover:border-ink border-ink/30 flex items-center gap-2.5 rounded-[2px] border px-2 py-1"
      title={`Level ${totals.level}, ${totals.rank}. ${totals.xp} XP. ${totals.completedCount} of ${totals.totalCount} chapters finished.`}
    >
      <span className="data text-teal-text text-xs font-bold">
        L{totals.level}
      </span>

      <span className="hidden sm:block">
        <span className="bg-paper-sunk border-ink/20 block h-2 w-16 overflow-hidden rounded-[1px] border">
          <span
            className="bg-teal block h-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </span>
      </span>

      <span className="label text-ink-faint tabular-nums hidden md:inline">
        {shownXp} xp
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
