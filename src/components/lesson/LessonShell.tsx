import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { inkClasses } from "@/lib/ink";
import { type Lesson, neighbours, TRACKS } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { Sources } from "./Sources";

/**
 * The frame every lesson is printed in: masthead, the beats the caller passes
 * in, then the sources and the way onward.
 */
export function LessonShell({
  lesson,
  sources,
  children,
}: {
  lesson: Lesson;
  sources: Source[];
  children: ReactNode;
}) {
  const { previous, next } = neighbours(lesson.slug);
  const ink = inkClasses[lesson.ink];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5">
        <div className="py-10 md:py-14">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span
              className={`data ${ink.chip} rounded-[2px] border px-2 py-1 text-xs font-bold`}
            >
              {TRACKS[lesson.track].title} · {String(lesson.number).padStart(2, "0")}
            </span>
            <span className="label text-ink-faint">{lesson.machine}</span>
            <span className="label text-ink-faint">{lesson.minutes} min</span>
          </div>

          <h1 className="display-xl mb-5">{lesson.title}</h1>
          <p className="prose-measure text-ink-soft text-xl">
            {lesson.standfirst}
          </p>
        </div>

        {children}

        <Sources sources={sources} />

        <nav className="border-ink/20 grid gap-3 border-t py-10 sm:grid-cols-2">
          {previous ? (
            <Link href={`/lessons/${previous.slug}`} className="plate misreg p-4">
              <span className="label text-ink-faint">Previous</span>
              <span className="font-display mt-1.5 block font-bold">
                {previous.title}
              </span>
            </Link>
          ) : (
            <Link href="/" className="plate misreg p-4">
              <span className="label text-ink-faint">Back to</span>
              <span className="font-display mt-1.5 block font-bold">
                All the chapters
              </span>
            </Link>
          )}

          {next ? (
            <Link
              href={`/lessons/${next.slug}`}
              className="plate misreg p-4 sm:text-right"
            >
              {/* Crossing into the closers or the rabbit hole is a change of
                  register, not just the next page, so it gets named. */}
              <span className="label text-ink-faint">
                {next.track === lesson.track
                  ? "Next"
                  : `Next · ${TRACKS[next.track].title}`}
              </span>
              <span className="font-display mt-1.5 block font-bold">
                {next.title}
              </span>
              {next.track === lesson.track ? null : (
                <span className="text-ink-soft mt-1.5 block text-[0.9375rem]">
                  {TRACKS[next.track].blurb}
                </span>
              )}
            </Link>
          ) : (
            <Link href="/" className="plate misreg p-4 sm:text-right">
              <span className="label text-ink-faint">That is the set</span>
              <span className="font-display mt-1.5 block font-bold">
                Back to the start
              </span>
            </Link>
          )}
        </nav>
      </main>

      <SiteFooter />
    </>
  );
}
