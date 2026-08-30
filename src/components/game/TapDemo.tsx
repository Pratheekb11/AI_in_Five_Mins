"use client";

import { useReducedMotion } from "motion/react";

/**
 * A generic "tap one of these" demo standing in for the actual game, which
 * nobody has seen yet. Every game on the site shares one verb, tap or
 * click a choice, see it answered, so one small animated mock-up teaches
 * the gesture for all of them, instead of a sentence explaining it that
 * people skim past.
 *
 * It loops for as long as the ready screen is up, which is why the loop is two
 * CSS classes (`tap-demo-press`, `tap-demo-finger` in globals.css) rather than
 * the animation library: a JS animation that repeats for ever holds that
 * library's frame loop open for ever, and this one was doing it on the home
 * page of a site whose first screen is a game. The reduced-motion branches
 * below are unchanged, and still render the same still frame.
 */
export function TapDemo() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      aria-hidden="true"
      className="border-ink/15 bg-paper relative mx-auto mb-3 flex h-20 w-full max-w-[220px] flex-col justify-center gap-1.5 rounded-[2px] border p-2.5"
    >
      {[0, 1, 2].map((row) => (
        <div key={row} className="relative h-3.5" style={{ width: "100%" }}>
          <div
            className="border-ink/25 absolute inset-y-0 left-0 rounded-[2px] border"
            style={{ width: row === 1 ? "70%" : "100%" }}
          />
          {row === 1 ? (
            <div
              className={`bg-pink-wash border-pink absolute inset-y-0 left-0 rounded-[2px] border ${
                reduced ? "" : "tap-demo-press"
              }`}
              style={{ width: "70%" }}
            />
          ) : null}
        </div>
      ))}

      {reduced ? (
        <span
          className="border-ink bg-ink text-paper absolute top-[30px] left-[10%] flex size-3.5 items-center justify-center rounded-full"
          style={{ transform: "translateY(-50%)" }}
        />
      ) : (
        <span
          className="bg-ink tap-demo-finger absolute top-1 left-[10%] size-3 rounded-full"
          style={{ boxShadow: "0 0 0 3px var(--paper)" }}
        />
      )}
    </div>
  );
}
