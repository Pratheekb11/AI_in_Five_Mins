import type { ReactNode } from "react";

/**
 * Optional depth on the last beat, folded away.
 *
 * The closing screen leads with the next chapter, because that is the thing
 * the numbers say people were never shown. Everything that used to cost a
 * screen of its own — the video, the practice, the check — waits under one of
 * these instead, open only for whoever wants it.
 */
export function Fold({
  title,
  note,
  children,
}: {
  title: string;
  /** One line, visible while closed, enough to decide whether to open. */
  note?: string;
  children: ReactNode;
}) {
  return (
    <details className="plate group overflow-hidden">
      <summary className="hover:bg-paper-sunk cursor-pointer list-none px-5 py-4 transition-colors">
        <span className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="border-ink/40 text-ink-soft mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] border text-sm font-bold transition-transform group-open:rotate-45"
          >
            +
          </span>
          <span className="min-w-0">
            <span className="font-display block text-lg leading-tight font-bold">
              {title}
            </span>
            {note ? (
              <span className="text-ink-soft mt-1 block text-sm group-open:hidden">
                {note}
              </span>
            ) : null}
          </span>
        </span>
      </summary>
      <div className="border-ink/20 border-t px-5 py-5">{children}</div>
    </details>
  );
}
