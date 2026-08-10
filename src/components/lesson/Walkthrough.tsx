"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Nimo } from "@/components/nimo/Nimo";
import { SpeechButton } from "./SpeechButton";
import { StageAdvance, useStage } from "./stage/LessonStage";

/**
 * A lesson, one idea at a time.
 */

/**
 * Which step the walkthrough is on, published to whatever figure it is hosting.
 */
const StepContext = createContext(0);

/** Read by a figure so it can animate itself from one step to the next. */
export function useWalkthroughStep(): number {
  return useContext(StepContext);
}

export type Step = {
  /** Two or three sentences. This is also what gets spoken. */
  say: string;
  /** Optional visual for this step. */
  show?: React.ReactNode;
  /** A short printed caption under the visual. */
  caption?: string;
};

export function Walkthrough({
  steps,
  figure,
}: {
  steps: Step[];
  /**
   * One figure for the whole walkthrough, which reads the current step out of
   * `useWalkthroughStep`.
   */
  figure?: ReactNode;
}) {
  const [at, setAt] = useState(0);
  const still = useReducedMotion();
  const stage = useStage();
  const step = steps[at];
  const last = at === steps.length - 1;

  return (
    <div
      className={`plate ${stage ? "" : "overflow-hidden"}`}
      data-section="walkthrough"
    >
      {/* progress ticks, printed, countable, and short enough to count */}
      <div className="border-ink/25 bg-paper-sunk flex items-center gap-3 border-b px-4 py-2 sm:py-3">
        <span className="label text-ink-faint shrink-0">
          {at + 1} / {steps.length}
        </span>
        <span className="flex flex-1 gap-1" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className="bg-ink/15 h-1.5 flex-1 overflow-hidden rounded-[1px]"
            >
              <motion.span
                className="bg-pink block h-full origin-left"
                initial={false}
                animate={{ scaleX: i <= at ? 1 : 0 }}
                transition={{ duration: still ? 0 : 0.3, ease: "easeOut" }}
              />
            </span>
          ))}
        </span>
        <SpeechButton key={at} text={step.say} />
      </div>

      <div className="p-4 sm:p-5 md:p-6">
        {/* Nimo does the explaining, so the walkthrough has a voice rather
            than being an anonymous block of text. */}
        <div className="mb-4 flex items-start gap-4 sm:mb-5">
          <Nimo
            mood={last ? "cheer" : "curious"}
            follow={false}
            height={110}
            className="hidden w-[110px] shrink-0 sm:block"
          />
          <div className="prose-measure grow" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p
                key={at}
                className="text-[1.0625rem] leading-relaxed sm:text-lg"
                initial={still ? false : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={still ? undefined : { opacity: 0, x: -18 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                {step.say}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* The persistent figure sits outside AnimatePresence on purpose. It
            must survive the step change in order to animate through it. */}
        {figure ? (
          <StepContext.Provider value={at}>
            <div className="mb-3 sm:mb-4">{figure}</div>
          </StepContext.Provider>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={at}
            initial={still ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={still ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, delay: still ? 0 : 0.06 }}
          >
            {!figure && step.show ? (
              <div className="mb-4">{step.show}</div>
            ) : null}

            {step.caption ? (
              <p className="text-ink-faint mb-3 text-[0.8125rem] sm:mb-4 sm:text-sm">
                {step.caption}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div
          className={`border-ink/20 flex items-center justify-between gap-3 border-t pt-3 sm:pt-4 ${
            stage ? "bg-paper-raised sticky bottom-0 -mx-4 -mb-4 px-4 pb-4 sm:-mx-5 sm:-mb-5 sm:px-5 sm:pb-5 md:-mx-6 md:-mb-6 md:px-6 md:pb-6" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setAt((n) => Math.max(0, n - 1))}
            disabled={at === 0}
            className="tap label border-ink/40 hover:border-ink rounded-[2px] border px-3 py-2.5 disabled:opacity-30"
          >
            Back
          </button>

          {!last ? (
            <button
              type="button"
              onClick={() => setAt((n) => Math.min(steps.length - 1, n + 1))}
              data-walkthrough-next=""
              className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
            >
              Next
            </button>
          ) : stage ? (
            /* Out of steps, so the walkthrough's own Next becomes the deck's. */
            <StageAdvance label="That is the idea" />
          ) : (
            <span className="label text-teal-text">That is the idea</span>
          )}
        </div>
      </div>
    </div>
  );
}
