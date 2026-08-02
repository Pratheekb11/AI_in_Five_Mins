"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A personal best per game, kept in localStorage.
 *
 * This is the cheapest thing that makes a short round worth replaying: a number
 * that is yours, that you can see, and that you can beat. Without it a game
 * ends and there is no reason to press again.
 */

const KEY = "llai-best";
const EVENT = "llai-best-change";

const listeners = new Set<() => void>();

let cache: Record<string, number> = {};
let cacheRaw: string | null = null;

function read(): Record<string, number> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache;
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    cache = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const EMPTY: Record<string, number> = {};

export function useBestScore(gameId: string) {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);
  const best = all[gameId] ?? 0;

  const submit = useCallback(
    (score: number): boolean => {
      const current = read();
      if (score <= (current[gameId] ?? 0)) return false;
      const next = { ...current, [gameId]: score };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private browsing — the best just won't survive a reload.
      }
      window.dispatchEvent(new Event(EVENT));
      return true;
    },
    [gameId],
  );

  return { best, submit };
}
