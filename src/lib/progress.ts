"use client";

import { useSyncExternalStore } from "react";
import { LESSONS } from "./lessons";

/**
 * Learner progress.
 *
 * Kept in localStorage for now, there are no accounts. The shape below is the
 * contract a backend would take over: swap the read/write pair for API calls
 * and nothing else in the app has to change.
 */

const STORAGE_KEY = "llai-progress";

export type Progress = {
  /** Lesson slugs the learner has finished the check for. */
  completed: string[];
  /** Best score per lesson, as a fraction 0–1. */
  scores: Record<string, number>;
};

const EMPTY: Progress = { completed: [], scores: {} };

const listeners = new Set<() => void>();

/**
 * useSyncExternalStore compares snapshots by identity, so the parsed value is
 * cached and only replaced when storage actually changes. Returning a fresh
 * object each read would re-render forever.
 */
let cache: Progress = EMPTY;
let cacheRaw: string | null = null;

function read(): Progress {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }

  if (raw === cacheRaw) return cache;
  cacheRaw = raw;

  if (!raw) {
    cache = EMPTY;
    return cache;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Progress>;
    cache = {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      scores:
        parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {},
    };
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable or full, progress just will not survive a reload.
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Keeps two open tabs in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getServerSnapshot(): Progress {
  return EMPTY;
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, read, getServerSnapshot);

  return {
    progress,
    isComplete: (slug: string) => progress.completed.includes(slug),
    scoreFor: (slug: string) => progress.scores[slug],
    completedCount: progress.completed.length,
    totalCount: LESSONS.length,

    /** Records a finished check. Keeps the learner's best score. */
    complete(slug: string, score: number) {
      const current = read();
      const best = Math.max(current.scores[slug] ?? 0, score);
      write({
        completed: current.completed.includes(slug)
          ? current.completed
          : [...current.completed, slug],
        scores: { ...current.scores, [slug]: best },
      });
    },

    reset() {
      write(EMPTY);
    },
  };
}
