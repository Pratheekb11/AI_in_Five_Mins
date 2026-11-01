"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useNearViewport } from "@/lib/useNearViewport";

/**
 * A short explainer that plays by itself, for readers who would rather watch
 * than read. One object on screen changes from step to step; the step names
 * light up along the top and one short caption says what just moved.
 *
 * Nothing is pressed. It starts when it first comes into view and loops.
 */

export type ReelStep = {
  /** One or two words, for the strip along the top. */
  label: string;
  /** One short sentence. */
  caption: string;
  /** How long this step holds, in milliseconds. */
  ms: number;
};

/** Steps the reel forward once it is visible. Reduced motion holds each step
 *  longer rather than skipping any, so the order stays the same. */
export function useReel(steps: ReelStep[]) {
  const still = useReducedMotion();
  const [ref, near] = useNearViewport("0px");
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (!near) return;
    const ms = Math.max(steps[at].ms, still ? 6000 : 0);
    const id = setTimeout(() => setAt((n) => (n + 1) % steps.length), ms);
    return () => clearTimeout(id);
  }, [near, at, still, steps]);

  return { ref, at, still: Boolean(still) };
}

export function Reel({
  steps,
  at,
  frameRef,
  children,
  footnote,
  tone,
}: {
  steps: ReelStep[];
  at: number;
  frameRef: (node: HTMLElement | null) => void;
  children: ReactNode;
  /** Where the numbers come from, in small print under the reel. */
  footnote?: ReactNode;
  /** Colours the caption: "good" for a resolved step, "bad" for a failure. */
  tone?: "good" | "bad";
}) {
  return (
    <figure
      ref={frameRef}
      className="plate-flush mx-auto max-w-2xl overflow-hidden"
    >
      <ol className="border-ink/20 bg-paper-sunk flex border-b">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={`label flex-1 px-1.5 py-2 text-center transition-colors duration-300 sm:py-2.5 ${
              i === at
                ? "bg-blue-wash text-blue-text"
                : i < at
                  ? "text-ink-soft"
                  : "text-ink-faint"
            } ${i > 0 ? "border-ink/20 border-l" : ""}`}
          >
            {s.label}
          </li>
        ))}
      </ol>

      <div className="p-4 sm:p-5">
        {children}

        <p
          aria-live="off"
          className={`mt-4 min-h-[3rem] text-[0.9375rem] leading-snug font-semibold ${
            tone === "good"
              ? "text-teal-text"
              : tone === "bad"
                ? "text-pink-text"
                : "text-ink"
          }`}
        >
          {steps[at].caption}
        </p>

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-[1px] transition-colors ${
                  i === at ? "bg-pink" : "bg-ink/20"
                }`}
              />
            ))}
          </span>
          <span className="text-ink-faint text-[0.75rem]">Plays by itself</span>
        </div>
      </div>

      {footnote ? (
        <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2 text-[0.75rem] leading-snug">
          {footnote}
        </figcaption>
      ) : null}
    </figure>
  );
}
