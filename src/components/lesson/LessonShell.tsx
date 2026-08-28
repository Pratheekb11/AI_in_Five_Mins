import Link from "next/link";
import type { ReactNode } from "react";
import { Engagement } from "@/components/Engagement";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { inkClasses } from "@/lib/ink";
import { type Lesson, neighbours, TRACKS } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { PrimaryOnward } from "./PrimaryOnward";
import { Sources } from "./Sources";
import { TrackCelebration } from "./TrackCelebration";
import { TrackComplete } from "./TrackComplete";
import { TrackGaps } from "./TrackGaps";

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
      {/* Counts visible time and how far down the page a reader got. Reports
          once, on the way out, with nothing in it but this slug and a number. */}
      <Engagement page={lesson.slug} />
      <SiteHeader />

      <main id="content" className="mx-auto max-w-6xl px-5">
        <div className="py-10 md:py-14">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span
              className={`data ${ink.chip} rounded-[2px] border px-2 py-1 text-xs font-bold`}
            >
              {TRACKS[lesson.track].title} ·{" "}
              {String(lesson.number).padStart(2, "0")}
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

        {/* Which of this track's modules they have gone past, once they have
            finished this one and so are deciding what to do next. */}
        <TrackGaps lesson={lesson} />

        {/* Only ever on show once the whole track is behind them. */}
        <TrackComplete track={lesson.track} />

        <Sources sources={sources} />

        {/* One primary action, not a menu: the way onward is decided by
            PrimaryOnward (certificate just earned, the daily puzzle once
            there is truly nothing left, or the next lesson). "Previous"
            stays reachable but visibly smaller. */}
        <nav className="border-ink/20 border-t py-10 text-center">
          <PrimaryOnward lesson={lesson} next={next} />
          <div className="mt-4">
            {previous ? (
              <Link
                href={`/lessons/${previous.slug}`}
                className="label text-ink-faint hover:text-ink underline underline-offset-2"
              >
                ← {previous.title}
              </Link>
            ) : (
              <Link
                href="/"
                className="label text-ink-faint hover:text-ink underline underline-offset-2"
              >
                ← Back to all the chapters
              </Link>
            )}
          </div>
        </nav>
      </main>

      {/* Finishing a track is the one thing here worth interrupting for. */}
      <TrackCelebration />

      <SiteFooter />
    </>
  );
}
