"use client";

import { useSyncExternalStore } from "react";

/**
 * Which finishes have already been made a fuss of.
 */

const KEY = "llai-celebrated";
const EVENT = "llai-celebrated-change";

let cache: string[] = [];
let cacheRaw: string | null = null;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache;
  }

  /* Snapshots are compared by identity, so the parsed value is cached and only
     replaced when the stored string actually changes. */
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;

  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    cache = [];
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

export function useCelebrated(): [string[], (id: string) => void] {
  const seen = useSyncExternalStore(subscribe, read, () => cache);

  return [
    seen,
    (id: string) => {
      const next = read().includes(id) ? read() : [...read(), id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // No storage. It will be celebrated again, which is a small harm.
      }
      window.dispatchEvent(new Event(EVENT));
    },
  ];
}
