import Link from "next/link";
import type { ReactNode } from "react";
import { getLesson } from "@/lib/lessons";

/**
 * The mechanism, delivered just in time.
 */
export function MechanismPanel({
  question,
  summary,
  children,
  deeper,
}: {
  /** Phrased as the question the learner is asking right now. */
  question: string;
  /** One line, visible while closed, enough to decide whether to open. */
  summary: string;
  children: ReactNode;
  /** Slug of the module that takes this apart properly, if there is one. */
  deeper?: string;
}) {
  const target = deeper ? getLesson(deeper) : undefined;

  return (
    <details className="plate group overflow-hidden">
      <summary className="hover:bg-paper-sunk cursor-pointer list-none px-5 py-4 transition-colors md:px-6">
        <span className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="border-ink/40 text-ink-soft mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] border text-sm font-bold transition-transform group-open:rotate-45"
          >
            +
          </span>
          <span className="min-w-0">
            <span className="label text-pink-text mb-1.5 block">
              What is actually going on
            </span>
            <span className="font-display block text-lg leading-tight font-bold">
              {question}
            </span>
            <span className="text-ink-soft mt-1 block text-sm group-open:hidden">
              {summary}
            </span>
          </span>
        </span>
      </summary>

      <div className="border-ink/20 border-t px-5 py-5 md:px-6">
        <div className="prose-measure text-[0.9375rem]">{children}</div>

        {target ? (
          <p className="border-ink/20 mt-5 border-t pt-4">
            <Link
              href={`/lessons/${target.slug}`}
              className="font-display decoration-ink/30 hover:decoration-ink font-bold underline underline-offset-4"
            >
              Take it apart yourself: {target.title}
            </Link>
            <span className="text-ink-faint mt-1 block text-sm">
              {target.machine} · {target.minutes} min. Optional.
            </span>
          </p>
        ) : null}
      </div>
    </details>
  );
}
