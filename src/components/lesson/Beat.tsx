import type { ReactNode } from "react";

/**
 * One movement of a lesson.
 */

export type BeatKind = "look" | "try" | "check" | "use" | "sources";

const BEAT_LABELS: Record<BeatKind, string> = {
  look: "Look",
  try: "Try it",
  check: "Check yourself",
  use: "Use it",
  sources: "Sources",
};

export type BeatProps = {
  kind: BeatKind;
  title?: string;
  /** Sits under the title, in the reading measure. */
  standfirst?: ReactNode;
  children: ReactNode;
};

export function Beat({ kind, title, standfirst, children }: BeatProps) {
  return (
    <section
      id={kind}
      className="border-ink/20 scroll-mt-20 border-t py-10 md:py-14"
    >
      <div className="grid gap-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-10">
        <p className="label text-ink-faint lg:sticky lg:top-20 lg:self-start lg:pt-1.5">
          {BEAT_LABELS[kind]}
        </p>

        <div className="min-w-0">
          {title ? <h2 className="display-lg mb-3">{title}</h2> : null}
          {standfirst ? (
            <div className="prose-measure text-ink-soft mb-7 text-lg">
              {standfirst}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}
