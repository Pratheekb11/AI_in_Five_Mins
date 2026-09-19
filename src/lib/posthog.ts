"use client";

import type { PostHog } from "posthog-js";

/**
 * PostHog, loaded late and asked for nothing it does not need.
 *
 * The question this exists to answer is where somebody stops: which chapter,
 * which beat, how long before they left. Vercel's own analytics gives page
 * views and visitors; this gives the funnel through a deck, which is the only
 * way to see a drop-off that happens three screens inside a route that never
 * changes its URL.
 *
 * Two rules it keeps, both of which cost something elsewhere on this site
 * already and are not worth relearning:
 *
 * 1. The library is imported DYNAMICALLY and only once the page is idle. A
 *    static import would put ~60 KB of it in the first chunk every route
 *    parses, which is the same mistake the tokenizer and the mascot both made
 *    before they were gated. Anything captured before it lands is queued here
 *    and replayed, so a caller never has to know.
 * 2. It is never allowed to throw into a page. Every entry point swallows.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/** Development would otherwise fill the dashboard with the author's own
 *  clicking about. Set NEXT_PUBLIC_POSTHOG_IN_DEV=1 to watch events land
 *  while building, which is the only way to find one that never fires. */
const IN_DEV = process.env.NEXT_PUBLIC_POSTHOG_IN_DEV === "1";

/** Session replay is the best tool there is for "why did they leave", and it
 *  is also the heaviest thing PostHog can load. Off unless asked for, and it
 *  additionally has to be switched on in the project's own settings. */
const REPLAY = process.env.NEXT_PUBLIC_POSTHOG_REPLAY === "1";

export function posthogConfigured(): boolean {
  return Boolean(KEY) && (process.env.NODE_ENV === "production" || IN_DEV);
}

let client: PostHog | null = null;
let starting = false;
/** Events fired before the library finished loading. Bounded, because a page
 *  that never loads it must not grow an array for ever. */
const queued: { name: string; properties: Record<string, string | number> }[] =
  [];
const MAX_QUEUED = 40;

/** Loads and initialises PostHog. Safe to call more than once. */
export async function startPostHog(): Promise<void> {
  if (!posthogConfigured() || client || starting) return;
  starting = true;
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(KEY as string, {
      api_host: HOST,
      /* The dated preset PostHog's own snippet hands out. Among other things
         it is what sets `capture_pageview: "history_change"`, which is what
         makes an App Router navigation count as a page view at all. */
      defaults: "2026-05-30",
      /* Nobody signs in here, so there is no person to profile. Anonymous
         events only: no identity to join a visit up with. */
      person_profiles: "identified_only",
      disable_session_recording: !REPLAY,
      /* Clicks and rage-clicks on their own, which is most of the "what are
         they actually pressing" question without writing an event per button. */
      autocapture: true,
      capture_exceptions: false,
      /* Remote config asks the browser for three more scripts on top of the
         library. Surveys is the one nothing here uses, so it is refused
         outright; the rest stay switchable from the PostHog project itself
         rather than needing a deploy. */
      disable_surveys: true,
      debug: IN_DEV,
    });
    client = posthog;
    for (const event of queued.splice(0, queued.length)) {
      posthog.capture(event.name, event.properties);
    }
  } catch {
    // Blocked by an extension, refused by the network, whatever it was: the
    // site does not care and the reader must not see it.
    starting = false;
  }
}

/** One event. Queued if the library has not landed yet. */
export function capturePostHog(
  name: string,
  properties: Record<string, string | number>,
) {
  if (!posthogConfigured()) return;
  try {
    if (client) {
      client.capture(name, properties);
      return;
    }
    if (queued.length < MAX_QUEUED) queued.push({ name, properties });
  } catch {
    // Same contract as above.
  }
}
