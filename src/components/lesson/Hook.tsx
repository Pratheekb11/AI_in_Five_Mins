"use client";

import type { ReactNode } from "react";

/**
 * The first thing on a module, and the only job it has is to make somebody
 * want the next thing.
 *
 * It states one uncomfortable, concrete claim in large type and then gets out
 * of the way. No preamble, no "in this module you will learn", no list of
 * objectives — those are how a page announces that the interesting part is
 * still some distance away.
 *
 * The claim has to be true and checkable, because the whole site's argument is
 * that it does not need to exaggerate.
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
  /** Optional tiny visual — kept small, the type is the hero here. */
  children?: ReactNode;
  cta?: string;
  target?: string;
}) {
  return (
    <section className="border-ink/25 border-b pb-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <div>
          <h2 className="display-lg mb-4">{claim}</h2>
          <p className="prose-measure text-ink-soft text-lg">{sting}</p>

          <a
            href={target}
            className="plate misreg btn-primary font-display mt-7 inline-flex items-center gap-3 px-6 py-3.5 text-lg font-bold"
          >
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
          </a>
        </div>

        {children ? <div>{children}</div> : null}
      </div>
    </section>
  );
}
