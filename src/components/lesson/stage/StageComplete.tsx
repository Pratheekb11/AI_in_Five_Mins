"use client";

import { useEffect } from "react";
import { useProgress } from "@/lib/progress";
import { useStage } from "./LessonStage";

/**
 * Marks the lesson finished once the deck actually reaches its last beat.
 *
 * On a scrolling page the only completion signal was the check at the bottom,
 * so anyone who played the game and left was recorded as having done nothing.
 * A deck cannot be skipped forward, so arriving at the end is a real finish.
 * The score is left at zero: `recordScore` keeps the best it has seen, so a
 * check played earlier in the same deck still owns the number.
 */
export function StageComplete({ slug }: { slug: string }) {
  const stage = useStage();
  const { recordScore } = useProgress();
  const reached = stage?.last ?? false;

  useEffect(() => {
    if (reached) recordScore(slug, 0);
    // recordScore is rebuilt every render by useProgress, so it is deliberately
    // not a dependency; the beat being reached is the only thing that fires it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached, slug]);

  return null;
}
