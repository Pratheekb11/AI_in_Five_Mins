import type { Source } from "@/lib/sources";
import { Beat } from "./Beat";

/**
 * The closing beat of every lesson. Each entry says what this lesson actually
 * took from the source, not just that the source exists, a citation the reader
 * can check is worth more than one they can only admire.
 */
export function Sources({ sources }: { sources: Source[] }) {
  return (
    <Beat
      kind="sources"
      standfirst="Everything above traces back to one of these."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {sources.map((source) => (
          <li key={source.url} className="plate-flush p-4">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="font-display decoration-ink/30 hover:decoration-ink font-bold underline underline-offset-4"
            >
              {source.title}
            </a>
            <p className="label text-ink-faint mt-1.5">{source.publisher}</p>
            <p className="text-ink-soft mt-2.5 text-sm">{source.used}</p>
            {source.licence ? (
              <p className="data text-ink-faint mt-2 text-xs">
                {source.licence}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Beat>
  );
}
