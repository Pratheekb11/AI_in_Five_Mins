"use client";

import { track } from "@vercel/analytics";

/**
 * The small amount of measurement this site does about its readers.
 */

/** Seconds are bucketed. A reader is not a stopwatch and the buckets are what
 *  the question actually needs: did they bounce, skim, play, or stay. */
export function bucketSeconds(seconds: number): string {
  if (seconds < 10) return "0-10s";
  if (seconds < 30) return "10-30s";
  if (seconds < 60) return "30-60s";
  if (seconds < 180) return "1-3m";
  if (seconds < 300) return "3-5m";
  if (seconds < 600) return "5-10m";
  return "10m+";
}

function send(name: string, properties: Record<string, string | number>) {
  // Development runs would otherwise fill the dashboard with the author's own
  // clicking about. The Vercel client already guards this; the check is here
  // so the intent is visible where the events are defined. Logging instead of
  // silently dropping means the events can be watched while building, which is
  // the only way to find out that one never fires.
  if (process.env.NODE_ENV !== "production") {
    console.debug("[telemetry]", name, properties);
    return;
  }
  try {
    track(name, properties);
  } catch {
    // Analytics is never allowed to break a page. If the beacon is blocked,
    // by an extension or by the reader's own settings, that is their business.
  }
}

/** How long somebody actually spent on a page, with the tab in front of them. */
export function trackTimeOnPage(
  page: string,
  seconds: number,
  reached: string,
) {
  if (seconds < 3) return; // A bounce is a page view, not a visit.
  send("time_on_page", {
    page,
    seconds: Math.round(seconds),
    minutes: bucketSeconds(seconds),
    reached,
  });
}

/** Somebody pressed start on a game. */
export function trackGameStarted(game: string, page: string) {
  send("game_started", { game, page });
}

/** Somebody played one to the end, with what it scored them. */
export function trackGameFinished(game: string, page: string, score: number) {
  send("game_finished", { game, page, score: Math.round(score) });
}

/** Somebody answered every beat of a module's check. */
export function trackCheckCompleted(page: string, score: number) {
  send("check_completed", { page, score: Math.round(score * 100) });
}
