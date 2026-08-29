"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * How many times the visual "tap a choice" hint has been shown, per game.
 * Once did not stick, so it repeats on someone's first several rounds of a
 * given game — but the count is per game, not site-wide: knowing the
 * gesture on Beat the Predictor does not mean anyone has seen it on Grow
 * the Tree yet.
 */

const KEY = "llai-tap-hint-count";
const EVENT = "llai-tap-hint-change";

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
  window.addEventListener(EVENT, onChange);
  // Keeps a second tab in step, and catches Reset.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const EMPTY: Record<string, number> = {};

function bump(gameId: string) {
  const current = read();
  const next = { ...current, [gameId]: (current[gameId] ?? 0) + 1 };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // No storage. The hint just keeps showing, a small harm.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useTapHintCount(gameId: string): [number, () => void] {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);
  const count = all[gameId] ?? 0;
  /* useCallback, not a bare closure: GameShell puts this in a useEffect
     dependency array, and a reference that changed every render used to
     cancel the effect's own show/hide timers before they ever fired. gameId
     is stable for the life of a mounted GameShell, so this is too. */
  const bumpThis = useCallback(() => bump(gameId), [gameId]);
  return [count, bumpThis];
}
