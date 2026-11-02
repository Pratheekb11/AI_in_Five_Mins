"use client";

import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
import { useNearViewport } from "@/lib/useNearViewport";
import { WalkthroughStepProvider } from "./Walkthrough";

/**
 * A walkthrough figure that plays itself.
 *
 * The machine learning track used to explain each game with six screens of
 * text and a Next button per screen, inside a deck that already had its own
 * Next button. Two sets of controls for one idea, and six presses before the
 * point. This drives the same figure from a clock instead: one short caption
 * per step, held for as long as it takes to read.
 *
 * It plays through once and stops on the last step, because that is where the
 * figures hand over their own controls. It pauses the moment somebody touches
 * the figure, so a reader who wants to poke at a step is never dragged off it,
 * and every step name along the top is a button that jumps there.
 */

export type FigureReelStep = {
  /** One short word, for the strip along the top. Six of them share a phone. */
  label: string;
  /** One or two short sentences. The hold time is worked out from its length. */
  caption: string;
  /** Small print under the caption: where a number comes from, or a definition. */
  note?: string;
};

/** Long enough to read the caption at an unhurried pace, and never a flash. */
function holdFor(caption: string, still: boolean): number {
  const words = caption.split(/\s+/).length;
  const ms = Math.min(11000, Math.max(4500, 1600 + words * 300));
  return still ? Math.max(ms, 8000) : ms;
}

export function FigureReel({
  steps,
  figure,
}: {
  steps: FigureReelStep[];
  /** A figure that reads its step from `useWalkthroughStep`. */
  figure: ReactNode;
}) {
  const still = Boolean(useReducedMotion());
  const [frameRef, near] = useNearViewport("0px");
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = steps.length - 1;
  const done = at === last;

  /* Forward one step at a time while it is on screen and nobody has taken
     over. On the last step it simply stops: that step is the figure's own
     playground, and a loop would pull it away from whoever is using it. */
  useEffect(() => {
    if (!near || !playing || done) return;
    const id = setTimeout(
      () => setAt((n) => Math.min(last, n + 1)),
      holdFor(steps[at].caption, still),
    );
    return () => clearTimeout(id);
  }, [near, playing, done, at, last, steps, still]);

  const jump = useCallback((i: number) => {
    setAt(i);
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (done) {
      setAt(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  }, [done]);

  /* The figure grows and shrinks from step to step. Held at the tallest it
     has been, the caption and the controls stop jumping about under the
     reader's eye, and FitBox (which only ever scales down) sees one height. */
  const body = useRef<HTMLDivElement>(null);
  const tallest = useRef(0);
  useIsomorphicLayoutEffect(() => {
    const el = body.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const inner = el.firstElementChild as HTMLElement | null;
      if (!inner) return;
      const h = inner.getBoundingClientRect().height;
      if (h > tallest.current + 1) {
        tallest.current = h;
        el.style.minHeight = `${h}px`;
      }
    });
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const step = steps[at];
  const state = done ? "Replay" : playing ? "Pause" : "Play";

  return (
    <div ref={frameRef} data-section="reel" className="space-y-3">
      <div className="plate-flush overflow-hidden">
        <div className="border-ink/20 bg-paper-sunk flex items-stretch border-b">
          <ol className="flex min-w-0 flex-1">
            {steps.map((s, i) => (
              <li
                key={s.label}
                className={`flex min-w-0 flex-1 ${i > 0 ? "border-ink/20 border-l" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={i === at ? "step" : undefined}
                  aria-label={`Step ${i + 1} of ${steps.length}: ${s.label}`}
                  className={`tap label w-full min-w-0 px-0.5 py-2 text-center text-[0.625rem] leading-tight break-words transition-colors duration-300 sm:px-1.5 sm:py-2.5 sm:text-[0.6875rem] ${
                    i === at
                      ? "bg-blue-wash text-blue-text"
                      : i < at
                        ? "text-ink-soft"
                        : "text-ink-faint"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={toggle}
            aria-label={state}
            className="tap label border-ink/20 text-ink-soft hover:text-ink shrink-0 border-l px-3"
          >
            <PlayGlyph state={state} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-3 sm:px-5 sm:pt-4">
          {/* Spoken only when the reader is driving. While it plays itself a
              screen reader would otherwise be interrupted every few seconds. */}
          <p
            aria-live={playing && !done ? "off" : "polite"}
            className="text-ink min-h-[4.5rem] text-[1rem] leading-snug font-semibold sm:min-h-[3.25rem] sm:text-[1.0625rem]"
          >
            {step.caption}
          </p>
          <p className="text-ink-faint mt-1 min-h-[1.25rem] text-[0.75rem] leading-snug">
            {step.note ?? ""}
          </p>

          <div className="mt-2 flex items-center gap-3" aria-hidden="true">
            <span className="flex flex-1 gap-1">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className="bg-ink/15 h-1 flex-1 overflow-hidden rounded-[1px]"
                >
                  <span
                    /* Fills over the hold time of the step it belongs to, so
                       the reader can see how long is left. */
                    key={`${i}-${at}-${playing}`}
                    className="bg-pink block h-full origin-left"
                    style={
                      i < at || (i === at && (done || !playing || still))
                        ? { transform: "scaleX(1)" }
                        : i === at
                          ? {
                              animation: `reel-fill ${holdFor(step.caption, still)}ms linear both`,
                            }
                          : { transform: "scaleX(0)" }
                    }
                  />
                </span>
              ))}
            </span>
            <span className="text-ink-faint shrink-0 text-[0.75rem]">
              {done ? "Your turn" : playing ? "Plays by itself" : "Paused"}
            </span>
          </div>
        </div>
      </div>

      {/* Any touch on the figure means somebody wants to look closer, so the
          clock stops rather than moving the figure out from under them. */}
      <div
        ref={body}
        onPointerDown={() => setPlaying(false)}
        onFocusCapture={() => setPlaying(false)}
      >
        <div>
          <WalkthroughStepProvider step={at}>{figure}</WalkthroughStepProvider>
        </div>
      </div>
    </div>
  );
}

function PlayGlyph({ state }: { state: "Play" | "Pause" | "Replay" }) {
  if (state === "Pause")
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="2" y="1.5" width="3.5" height="11" fill="currentColor" />
        <rect x="8.5" y="1.5" width="3.5" height="11" fill="currentColor" />
      </svg>
    );
  if (state === "Play")
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M3 1.5 L12.5 7 L3 12.5 Z" fill="currentColor" />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M11.5 7 A4.5 4.5 0 1 1 9.8 3.5 M9.8 0.8 V3.8 H6.8"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
