"use client";

import { useSyncExternalStore } from "react";

/**
 * A local mirror of this browser's own lesson-interaction signals, so the
 * `/admin` page has something to read without needing Vercel Pro's dashboard
 * or a backend. One row per lesson slug, replaced as the visit progresses,
 * not an event log, and not other visitors' data. Nothing here is sent
 * anywhere; it is `localStorage`, same as the rest of the site's state.
 */

const KEY = "llai-local-telemetry";
const MAX_ROWS = 60;

export type LocalRow = {
  page: string;
  at: string;
  interacted: boolean;
  timeToFirstInteractionMs: number | null;
  gameCompleted: boolean;
  advanced: boolean;
};

/* `useSyncExternalStore` requires a snapshot function that returns the same
   reference when nothing changed, or it re-renders forever. `localStorage`
   has no such notion, so the raw string is cached and compared instead,
   same trick `progress.ts` uses for its own store. */
let cache: LocalRow[] = [];
let cacheRaw: string | null = null;

function readAll(): LocalRow[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache;
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;

  if (!raw) {
    cache = [];
    return cache;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as LocalRow[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function writeAll(rows: LocalRow[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX_ROWS)));
  } catch {
    // Storage unavailable or full. A diagnostic log has nothing to fall back to.
  }
}

/** Merges a patch into this page's row, creating it if this is the first
 *  signal seen for it this visit. */
export function recordLocal(
  page: string,
  patch: Partial<Omit<LocalRow, "page" | "at">>,
) {
  if (typeof window === "undefined") return;
  const rows = readAll();
  const i = rows.findIndex((r) => r.page === page);
  const base: LocalRow = rows[i] ?? {
    page,
    at: new Date().toISOString(),
    interacted: false,
    timeToFirstInteractionMs: null,
    gameCompleted: false,
    advanced: false,
  };
  const next = { ...base, ...patch, at: new Date().toISOString() };
  if (i >= 0) rows[i] = next;
  else rows.push(next);
  writeAll(rows);
}

export function clearLocalRows() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Private browsing or a full quota. Nothing left to clear either way.
  }
  // `storage` only fires in other tabs; this one has to be told directly.
  window.dispatchEvent(new Event("storage"));
}

const NO_ROWS: LocalRow[] = [];

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** The `/admin` page's read of this browser's own log, `useSyncExternalStore`
 *  so the server-rendered pass and the client's first render agree (both see
 *  no rows), and an actual reload elsewhere in the same browser is picked up
 *  via the `storage` event, same as the rest of this site's local stores. */
export function useLocalRows(): LocalRow[] {
  return useSyncExternalStore(subscribe, readAll, () => NO_ROWS);
}
