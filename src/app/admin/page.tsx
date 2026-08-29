"use client";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { clearLocalRows, useLocalRows } from "@/lib/localTelemetry";
import { READING_ORDER } from "@/lib/lessons";

/**
 * A local, single-browser diagnostic view of the interaction signals, not
 * an aggregate-traffic dashboard. That would need Vercel Analytics' own
 * dashboard (Pro, for custom events) or a backend to query; neither exists
 * for this site. What this CAN honestly show: whether the instrumentation is
 * actually firing, read back from the same `localStorage` every other
 * per-browser preference on this site already uses. Ranked worst first,
 * lessons this browser never touched, then the rest by how long the first
 * tap took.
 */
export default function Admin() {
  const rows = useLocalRows();

  const bySlug = new Map(rows.map((r) => [r.page, r]));
  const ranked = READING_ORDER.map((lesson) => ({
    lesson,
    row: bySlug.get(lesson.slug) ?? null,
  })).sort((a, b) => {
    const aBad = !a.row || !a.row.interacted;
    const bBad = !b.row || !b.row.interacted;
    if (aBad !== bBad) return aBad ? -1 : 1;
    const aMs = a.row?.timeToFirstInteractionMs ?? Infinity;
    const bMs = b.row?.timeToFirstInteractionMs ?? Infinity;
    return bMs - aMs;
  });

  const visited = ranked.filter((r) => r.row).length;
  const neverInteracted = ranked.filter((r) => !r.row || !r.row.interacted).length;

  return (
    <>
      <SiteHeader showProgress={false} />
      <main id="content" className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <p className="label text-ink-faint mb-3">Local diagnostic, not a dashboard</p>
        <h1 className="display-lg mb-4">This browser&rsquo;s own interaction log.</h1>
        <p className="prose-measure text-ink-soft mb-6">
          This reads back the four signals below from this browser&rsquo;s own{" "}
          <span className="data text-sm">localStorage</span>, the same place
          every other per-browser preference on this site lives. It is not
          aggregate visitor traffic. That lives in Vercel Analytics&rsquo;
          own dashboard once custom events are on a paid plan, or would need a
          backend this site does not have. What it is good for: checking the
          instrumentation actually fires, by using the site yourself.
        </p>

        <div className="mb-6 flex flex-wrap gap-4">
          <p className="label text-ink-faint">
            {visited} of {ranked.length} lessons visited this browser
          </p>
          <p className="label text-pink-text">
            {neverInteracted} never interacted with
          </p>
          <button
            type="button"
            onClick={clearLocalRows}
            className="label text-ink-faint hover:text-ink cursor-pointer underline underline-offset-2"
          >
            Clear this log
          </button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-ink/20 border-b">
                  <th className="py-2 pr-3 font-semibold">Lesson</th>
                  <th className="py-2 pr-3 font-semibold">Visited</th>
                  <th className="py-2 pr-3 font-semibold">Interacted</th>
                  <th className="py-2 pr-3 font-semibold">
                    Time to first action
                  </th>
                  <th className="py-2 pr-3 font-semibold">Game completed</th>
                  <th className="py-2 font-semibold">Advanced onward</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ lesson, row }) => (
                  <tr key={lesson.slug} className="border-ink/10 border-b">
                    <td className="py-2 pr-3">{lesson.title}</td>
                    <td className="py-2 pr-3">{row ? "yes" : "n/a"}</td>
                    <td
                      className={`py-2 pr-3 ${
                        row?.interacted ? "" : "text-pink-text font-semibold"
                      }`}
                    >
                      {row ? (row.interacted ? "yes" : "no") : "n/a"}
                    </td>
                    <td className="data py-2 pr-3 tabular-nums">
                      {row?.timeToFirstInteractionMs != null
                        ? `${(row.timeToFirstInteractionMs / 1000).toFixed(1)}s`
                        : "n/a"}
                    </td>
                    <td className="py-2 pr-3">
                      {row ? (row.gameCompleted ? "yes" : "no") : "n/a"}
                    </td>
                    <td className="py-2">
                      {row ? (row.advanced ? "yes" : "no") : "n/a"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
