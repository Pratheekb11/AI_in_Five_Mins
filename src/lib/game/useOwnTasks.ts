"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Exposure } from "@/lib/game/sort";

/**
 * What is stored is only what the reader typed. The evidence tags a sorting
 * card carries are attached when the round is dealt, not saved here — they are
 * ours to change without invalidating somebody's saved list.
 */
export type OwnTask = { text: string; exposure: Exposure; mine: true };

/**
 * The tasks you typed in yourself, kept in localStorage.
 *
 * The deck that ships with the module is generic on purpose, and generic is
 * exactly what a personal audit must not be. These are the ones that make the
 * round about your week — so they survive a reload, and they come back the
 * next time you play.
 *
 * Nothing is sent anywhere. It is your list, on your machine.
 */

const KEY = "llai-own-tasks";
const EVENT = "llai-own-tasks-change";
const LIMIT = 24;
const MAX_LENGTH = 64;

let cache: OwnTask[] = [];
let cacheRaw: string | null = null;

const EMPTY: OwnTask[] = [];

function parse(raw: string | null): OwnTask[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is { text: string; exposure: Exposure } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { text?: unknown }).text === "string" &&
          ((item as { exposure?: unknown }).exposure === "inside" ||
            (item as { exposure?: unknown }).exposure === "outside"),
      )
      .slice(0, LIMIT)
      .map((item) => ({
        text: item.text.slice(0, MAX_LENGTH),
        exposure: item.exposure,
        mine: true,
      }));
  } catch {
    return [];
  }
}

function read(): OwnTask[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache;
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = parse(raw);
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

function write(next: OwnTask[]) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(next.map(({ text, exposure }) => ({ text, exposure }))),
    );
  } catch {
    // Private browsing — the list just will not survive a reload.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useOwnTasks() {
  const tasks = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((text: string, exposure: Exposure) => {
    const trimmed = text.trim().slice(0, MAX_LENGTH);
    if (!trimmed) return;
    const current = read();
    if (current.length >= LIMIT) return;
    if (current.some((t) => t.text.toLowerCase() === trimmed.toLowerCase())) return;
    write([...current, { text: trimmed, exposure, mine: true }]);
  }, []);

  const remove = useCallback((text: string) => {
    write(read().filter((t) => t.text !== text));
  }, []);

  return { tasks, add, remove, limit: LIMIT, maxLength: MAX_LENGTH };
}
