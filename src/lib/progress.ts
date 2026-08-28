"use client";

import { useSyncExternalStore } from "react";
import { LESSONS } from "./lessons";

/**
 * Learner progress.
 */

const STORAGE_KEY = "llai-progress";

/** Bumped whenever the stored shape changes. A visitor's existing progress is
 *  migrated forward rather than dropped; only a shape `migrate` cannot make
 *  sense of at all falls back to empty. */
const SCHEMA_VERSION = 3;

export type Progress = {
  schemaVersion: number;
  /** Chapter slugs whose check the learner has finished. */
  completed: string[];
  /** Best check score per chapter, as a fraction from 0 to 1. */
  scores: Record<string, number>;
  /** Consecutive days on which at least one chapter was finished. */
  streak: { days: number; last: string };
  /** Consecutive days on which the daily puzzle was solved. Its own counter:
   *  the chapters run out, the puzzle does not. */
  puzzleStreak: { days: number; last: string };
  /** The reader closed Nimo's reaction bubble. Sitewide, and it stays that
   *  way until Reset. */
  nimoDismissed: boolean;
};

const EMPTY: Progress = {
  schemaVersion: SCHEMA_VERSION,
  completed: [],
  scores: {},
  streak: { days: 0, last: "" },
  puzzleStreak: { days: 0, last: "" },
  nimoDismissed: false,
};

/** Brings whatever is on disk up to `SCHEMA_VERSION`. Every past shape this
 *  site has ever written is version 1 or 2 (these fields did not exist yet),
 *  and every other field is exactly today's, so migrating it is filling in
 *  defaults and stamping the version on. A future shape change adds a real
 *  transform here, keyed on `version`, rather than a rewrite of this function
 *  — and a version newer than this build knows about still has its fields
 *  read rather than being wiped. */
export function migrate(
  parsed: Partial<Progress> & { schemaVersion?: number },
): Progress {
  return {
    schemaVersion: SCHEMA_VERSION,
    completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    scores:
      parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {},
    streak:
      parsed.streak && typeof parsed.streak.days === "number"
        ? { days: parsed.streak.days, last: String(parsed.streak.last ?? "") }
        : { days: 0, last: "" },
    puzzleStreak:
      parsed.puzzleStreak && typeof parsed.puzzleStreak.days === "number"
        ? {
            days: parsed.puzzleStreak.days,
            last: String(parsed.puzzleStreak.last ?? ""),
          }
        : { days: 0, last: "" },
    nimoDismissed: parsed.nimoDismissed === true,
  };
}

/** Finishing a chapter is worth this, before the score is taken into account. */
export const XP_PER_CHAPTER = 40;
/** What a perfect check adds on top. A weak pass still earns the 40. */
export const XP_PER_CHECK = 60;
/** XP in a level. Flat rather than curved, so the next level is always close. */
export const XP_PER_LEVEL = 150;

/** Named bands, so a level means something other than a bigger number. */
const RANKS = [
  "Curious",
  "Reader",
  "Tinkerer",
  "Operator",
  "Sceptic",
  "Handler",
  "Engineer",
  "Veteran",
] as const;

export function rankFor(level: number): string {
  return RANKS[Math.min(level - 1, RANKS.length - 1)] ?? RANKS[0];
}

const listeners = new Set<() => void>();

/**
 * useSyncExternalStore compares snapshots by identity, so the parsed value is
 * cached and only replaced when storage actually changes. Returning a fresh
 * object on every read would re-render for ever.
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
    const parsed = JSON.parse(raw) as Partial<Progress> & {
      schemaVersion?: number;
    };
    cache = migrate(parsed);
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable or full. Progress just will not survive a reload.
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

/** Local date, not UTC. A streak should break at the learner's midnight. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dayBefore(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Rolls a streak forward for a day on which something was finished.
 *  `graceDays` is how many days may be skipped without the streak resetting
 *  to 1 — 0 for the chapter streak (strictly consecutive), 1 for the puzzle
 *  streak (a single missed day is forgiven, two in a row is not). */
export function rollStreak(
  streak: { days: number; last: string },
  now: string,
  graceDays = 0,
): { days: number; last: string } {
  if (streak.last === now) return streak;
  if (!streak.last) return { days: 1, last: now };

  let cursor = now;
  for (let missed = 0; missed <= graceDays; missed++) {
    cursor = dayBefore(cursor);
    if (cursor === streak.last) return { days: streak.days + 1, last: now };
  }
  return { days: 1, last: now };
}

function bumpStreak(streak: Progress["streak"]): Progress["streak"] {
  return rollStreak(streak, today());
}

export type Totals = {
  xp: number;
  level: number;
  rank: string;
  /** XP into the current level, and what a level costs. */
  intoLevel: number;
  levelSpan: number;
  completedCount: number;
  totalCount: number;
  streakDays: number;
};

export function totalsFor(progress: Progress): Totals {
  let xp = 0;
  for (const slug of progress.completed) {
    const score = Math.max(0, Math.min(1, progress.scores[slug] ?? 0));
    xp += XP_PER_CHAPTER + Math.round(score * XP_PER_CHECK);
  }

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  return {
    xp,
    level,
    rank: rankFor(level),
    intoLevel: xp % XP_PER_LEVEL,
    levelSpan: XP_PER_LEVEL,
    completedCount: progress.completed.length,
    totalCount: LESSONS.length,
    streakDays: progress.streak.days,
  };
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, read, getServerSnapshot);
  const totals = totalsFor(progress);

  return {
    progress,
    totals,
    completedCount: totals.completedCount,
    totalCount: totals.totalCount,

    isComplete: (slug: string) => progress.completed.includes(slug),
    scoreFor: (slug: string) => progress.scores[slug],

    /** Records a finished check. Keeps the learner's best score. */
    recordScore(slug: string, score: number) {
      const current = read();
      const best = Math.max(current.scores[slug] ?? 0, score);
      const known = current.completed.includes(slug);
      if (known && best === current.scores[slug]) return;

      write({
        ...current,
        completed: known ? current.completed : [...current.completed, slug],
        scores: { ...current.scores, [slug]: best },
        streak: bumpStreak(current.streak),
      });
    },

    /** Records a solved daily puzzle. One-day grace: a single missed day
     *  does not reset it, only two in a row does. */
    recordPuzzle(dateSolved: string) {
      const current = read();
      if (current.puzzleStreak.last === dateSolved) return;
      write({
        ...current,
        puzzleStreak: rollStreak(current.puzzleStreak, dateSolved, 1),
      });
    },

    dismissNimo() {
      write({ ...read(), nimoDismissed: true });
    },

    reset() {
      write(EMPTY);
    },
  };
}
