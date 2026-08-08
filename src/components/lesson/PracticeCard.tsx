import type { ReactNode } from "react";

/**
 * Something to go and do with a real AI tool, away from this site.
 *
 * The practical track only works if the ideas get tested against a real
 * assistant. These are written as a single concrete instruction rather than a
 * suggestion, because "try experimenting with prompts" is advice nobody has
 * ever acted on.
 */
export function PracticeCard({
  title,
  children,
  watchFor,
}: {
  title: string;
  children: ReactNode;
  /** What they should notice when they do it. */
  watchFor: string;
}) {
  return (
    <section className="plate bg-yellow-wash p-5 md:p-6">
      <p className="label text-yellow-text mb-3">Go and try this</p>
      <h3 className="display-md mb-3">{title}</h3>
      <div className="prose-measure text-[0.9375rem]">{children}</div>
      <p className="border-ink/20 mt-4 border-t pt-3 text-[0.9375rem]">
        <strong className="font-semibold">What to watch for:</strong> {watchFor}
      </p>
    </section>
  );
}
