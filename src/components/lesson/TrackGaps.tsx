"use client";

import Link from "next/link";
import { CERTIFICATES, lessonsFor } from "@/lib/certificate";
import { inkClasses } from "@/lib/ink";
import { type Lesson, lessonsIn, TRACKS } from "@/lib/lessons";
import { useProgress } from "@/lib/progress";

/**
 * The modules you went past.
 */
export function TrackGaps({ lesson }: { lesson: Lesson }) {
  const { progress, isComplete } = useProgress();

  /* The rabbit hole is meant to be dipped into from inside a chapter. Nobody
     has skipped anything there. */
  if (lesson.track === "how") return null;
  if (!isComplete(lesson.slug)) return null;

  const siblings = lessonsIn(lesson.track).filter((l) => l.status === "ready");
  const missing = siblings.filter(
    (l) => l.slug !== lesson.slug && !progress.completed.includes(l.slug),
  );

  if (missing.length === 0) return null;

  const named = missing.slice(0, 3);
  const rest = missing.length - named.length;
  const minutes = missing.reduce((n, l) => n + l.minutes, 0);

  /* Only worth mentioning the certificate where finishing earns one. */
  const spec = CERTIFICATES.find((c) => c.id === lesson.track);
  const total = spec ? lessonsFor(spec).length : siblings.length;
  const done = total - missing.length;

  return (
    <aside className="plate misreg mt-10 p-5 md:p-6">
      <p className="label text-ink-faint mb-2">
        {done} of {total} in {TRACKS[lesson.track].title.toLowerCase()}
      </p>
      <h2 className="display-md mb-2">
        {missing.length === 1
          ? "One you went past."
          : `${missing.length} you went past.`}
      </h2>
      <p className="prose-measure text-ink-soft mb-5">
        {minutes} minutes of playing, in any order you like
        {spec ? `, and then ${spec.title} is yours` : ""}.
      </p>

      <ul className="grid gap-3 sm:grid-cols-3">
        {named.map((l) => {
          const ink = inkClasses[l.ink];
          return (
            <li key={l.slug} className="flex">
              <Link
                href={`/lessons/${l.slug}`}
                className="plate flex h-full w-full flex-col p-3"
              >
                <span className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`data ${ink.chip} rounded-[2px] border px-1.5 py-0.5 text-xs font-bold`}
                  >
                    {String(l.number).padStart(2, "0")}
                  </span>
                  <span className="label text-ink-faint">{l.minutes}m</span>
                </span>
                <span className="font-display leading-tight font-bold">
                  {l.title}
                </span>
                <span className="label text-ink-faint mt-2">{l.machine}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {rest > 0 ? (
        <p className="text-ink-faint mt-3 text-sm">
          And {rest} more, listed on the{" "}
          <Link
            href={`/curriculum#${lesson.track}`}
            className="underline underline-offset-2"
          >
            full curriculum
          </Link>
          .
        </p>
      ) : null}
    </aside>
  );
}
