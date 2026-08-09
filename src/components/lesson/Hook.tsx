"use client";

import type { ReactNode } from "react";
import { useStage } from "./stage/LessonStage";

/**
 * The first thing on a module, and the only job it has is to make somebody
 * want the next thing.
 */
export function Hook({
  claim,
  sting,
  children,
  cta = "Play it",
  target = "#game",
}: {
  /** The arresting line. Short. Set in the largest type on the page. */
  claim: ReactNode;
  /** One sentence that lands the claim and points at the game. */
  sting: string;
  /** Optional tiny visual, kept small, the type is the hero here. */
  children?: ReactNode;
  cta?: string;
  target?: string;
}) {
  const stage = useStage();

  return (
    <section className="border-ink/25 border-b pb-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <div>
          <h2 className="display-lg hook-arrive mb-4">{claim}</h2>
          <p className="prose-measure text-ink-soft hook-arrive hook-arrive-1 text-lg">
            {sting}
          </p>

          {/* In a deck there is no anchor to jump to: the game is the next
              beat, so the same button turns the page. */}
          <CtaButton target={target} onAdvance={stage?.next}>
            {cta}
            <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
              <path
                d="M1 7 H13 M8 2 L13 7 L8 12"
                stroke="currentColor"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </CtaButton>
        </div>

        {children ? <div>{children}</div> : null}
      </div>
    </section>
  );
}

/** One control, drawn as a link on a scrolling page and a button in a deck. */
function CtaButton({
  target,
  onAdvance,
  children,
}: {
  target: string;
  onAdvance?: () => void;
  children: ReactNode;
}) {
  const className =
    "plate misreg btn-primary font-display hook-arrive hook-arrive-2 mt-7 inline-flex items-center gap-3 px-6 py-3.5 text-lg font-bold";

  if (onAdvance)
    return (
      <button
        type="button"
        onClick={onAdvance}
        data-stage-next=""
        className={className}
      >
        {children}
      </button>
    );

  return (
    <a href={target} className={className}>
      {children}
    </a>
  );
}
