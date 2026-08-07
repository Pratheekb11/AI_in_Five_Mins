import type { MultilingualRow } from "@/lib/tokenExamples";

/**
 * The same sentence, five scripts, one measure: how many tokens it costs.
 *
 * One series, so one ink and no legend, the heading names what the bars are.
 * Every bar is directly labelled, which doubles as the table view: there are
 * five rows, so the numbers are simply present rather than hidden in tooltips.
 *
 * Character counts are annotations, not a second scale. Tokens are what gets
 * paid for and what fills a context window, so tokens are what the bars encode.
 */
export function TokenCostChart({ rows }: { rows: MultilingualRow[] }) {
  const max = Math.max(...rows.map((r) => r.tokenCount));

  return (
    <figure className="plate p-5 md:p-6">
      <figcaption className="mb-1">
        <h3 className="font-display text-lg font-bold">
          Tokens needed for one sentence
        </h3>
        <p className="text-ink-soft mt-1 text-sm">
          &ldquo;Artificial intelligence is changing how we work.&rdquo; and its
          translations. Same meaning every time.
        </p>
      </figcaption>

      <div className="mt-5 space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.language}
            className="group grid grid-cols-[5.5rem_minmax(0,1fr)_2.25rem] items-center gap-3"
          >
            <span className="data text-ink-soft truncate text-xs">
              {row.language}
            </span>

            {/* Bars sit on a shared baseline at the left and grow right, with a
                softened data-end so the measured edge stays readable. */}
            <span className="bg-paper-sunk relative block h-3.5 w-full">
              <span
                className="bg-blue absolute inset-y-0 left-0 rounded-r-[4px]"
                style={{ width: `${(row.tokenCount / max) * 100}%` }}
              />
            </span>

            <span className="data text-right text-sm font-semibold tabular-nums">
              {row.tokenCount}
            </span>

            <span
              aria-hidden="true"
              className="text-ink-faint col-start-2 col-end-4 -mt-1 text-[0.6875rem] opacity-0 transition-opacity group-hover:opacity-100"
            >
              {row.chars} characters · {row.charsPerToken} characters per token
            </span>
          </div>
        ))}
      </div>

      <p className="border-ink/20 text-ink-soft mt-5 border-t pt-4 text-sm">
        English is the cheapest language to talk to an AI in. The same sentence
        in Hindi costs{" "}
        <strong className="text-ink font-semibold">
          {(
            (rows.find((r) => r.language === "Hindi")?.tokenCount ?? 0) /
            (rows.find((r) => r.language === "English")?.tokenCount ?? 1)
          ).toFixed(1)}
          &times; as many tokens
        </strong>
      , because the merge table was built mostly from English text and never
        learned long Devanagari chunks worth reusing.
      </p>
    </figure>
  );
}
