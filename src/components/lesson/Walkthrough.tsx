"use client";

import { useState } from "react";
import { Nimo } from "@/components/nimo/Nimo";
import { SpeechButton } from "./SpeechButton";

/**
 * A lesson, one idea at a time.
 *
 * Replaces the wall of prose the first version of this site shipped. Each step
 * is a couple of sentences and, usually, something to look at; the learner
 * advances when they are ready. Nothing scrolls out of reach and nothing has to
 * be read before the interesting part.
 *
 * Every step can be read aloud, so the text is written to be heard as well as
 * seen — short sentences, no parentheticals, no bullet fragments.
 */

export type Step = {
  /** Two or three sentences. This is also what gets spoken. */
  say: string;
  /** Optional visual for this step. */
  show?: React.ReactNode;
  /** A short printed caption under the visual. */
  caption?: string;
};

export function Walkthrough({ steps }: { steps: Step[] }) {
  const [at, setAt] = useState(0);
  const step = steps[at];
  const last = at === steps.length - 1;

  return (
    <div className="plate overflow-hidden">
      {/* progress ticks — printed, countable, and short enough to count */}
      <div className="border-ink/25 bg-paper-sunk flex items-center gap-3 border-b px-4 py-3">
        <span className="label text-ink-faint shrink-0">
          {at + 1} / {steps.length}
        </span>
        <span className="flex flex-1 gap-1" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-[1px] ${
                i <= at ? "bg-pink" : "bg-ink/15"
              }`}
            />
          ))}
        </span>
        <SpeechButton key={at} text={step.say} />
      </div>

      <div className="p-5 md:p-6">
        {/* Nimo does the explaining, so the walkthrough has a voice rather
            than being an anonymous block of text. */}
        <div className="mb-5 flex items-start gap-4">
          <Nimo
            mood={last ? "cheer" : "curious"}
            follow={false}
            height={110}
            className="hidden w-[110px] shrink-0 sm:block"
          />
          <p
            className="prose-measure text-lg leading-relaxed"
            aria-live="polite"
          >
            {step.say}
          </p>
        </div>

        {step.show ? <div className="mb-4">{step.show}</div> : null}

        {step.caption ? (
          <p className="text-ink-faint mb-4 text-sm">{step.caption}</p>
        ) : null}

        <div className="border-ink/20 flex items-center justify-between gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => setAt((n) => Math.max(0, n - 1))}
            disabled={at === 0}
            className="label border-ink/40 hover:border-ink rounded-[2px] border px-3 py-2.5 disabled:opacity-30"
          >
            Back
          </button>

          {!last ? (
            <button
              type="button"
              onClick={() => setAt((n) => Math.min(steps.length - 1, n + 1))}
              className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
            >
              Next
            </button>
          ) : (
            <span className="label text-teal-text">That&rsquo;s the idea</span>
          )}
        </div>
      </div>
    </div>
  );
}
