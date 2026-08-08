"use client";

import { useSyncExternalStore } from "react";

/**
 * The learner's name, asked for exactly once, when there is finally a reason.
 *
 * Nothing on this site needs to know who anybody is, so nothing asks until
 * somebody wants their name printed on something. It stays in this browser: it
 * is never sent anywhere, never attached to a telemetry event, and it goes
 * when they press Reset.
 */

const KEY = "llai-name";
const EVENT = "llai-name-change";

/** Long enough for a full name, short enough to stay on the plate. */
export const NAME_LIMIT = 34;

let cache = "";
let cacheRaw: string | null = null;

function read(): string {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return "";
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = (raw ?? "").slice(0, NAME_LIMIT);
  return cache;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function serverSnapshot(): string {
  return "";
}

export function useLearnerName(): [string, (next: string) => void] {
  const name = useSyncExternalStore(subscribe, read, serverSnapshot);

  return [
    name,
    (next: string) => {
      const trimmed = next.trim().slice(0, NAME_LIMIT);
      try {
        if (trimmed) localStorage.setItem(KEY, trimmed);
        else localStorage.removeItem(KEY);
      } catch {
        // No storage. The name lives for this page and no longer.
      }
      window.dispatchEvent(new Event(EVENT));
    },
  ];
}
