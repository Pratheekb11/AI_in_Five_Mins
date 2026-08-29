"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * A generic "tap one of these" demo standing in for the actual game, which
 * nobody has seen yet. Every game on the site shares one verb — tap or
 * click a choice, see it answered — so one small animated mock-up teaches
 * the gesture for all of them, instead of a sentence explaining it that
 * people skim past.
 */
const DURATION = 2.4;
const TIMES = [0, 0.28, 0.42, 0.56, 0.8, 1];

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
            <motion.div
              className="bg-pink-wash border-pink absolute inset-y-0 left-0 rounded-[2px] border"
              style={{ width: "70%" }}
              animate={
                reduced
                  ? { opacity: 1 }
                  : { opacity: [0, 0, 1, 1, 0, 0], scale: [1, 1, 0.94, 1, 1, 1] }
              }
              transition={
                reduced
                  ? undefined
                  : {
                      duration: DURATION,
                      repeat: Infinity,
                      times: TIMES,
                      ease: "easeInOut",
                    }
              }
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
        <motion.span
          className="bg-ink absolute top-1 left-[10%] size-3 rounded-full"
          style={{ boxShadow: "0 0 0 3px var(--paper)" }}
          animate={{
            y: [0, 0, 30, 30, 56, 56],
            opacity: [0, 1, 1, 1, 1, 0],
          }}
          transition={{
            duration: DURATION,
            repeat: Infinity,
            times: TIMES,
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
}
