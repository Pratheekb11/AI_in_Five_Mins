import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { inkClasses } from "@/lib/ink";
import {
  getLesson,
  type Lesson,
  lessonsIn,
  type Track,
  TRACKS,
  TRACK_ORDER,
} from "@/lib/lessons";
import { pageMetadata } from "@/lib/metadata";

const firstChapter = getLesson(lessonsIn("chapter")[0].slug)!;

export const metadata = pageMetadata({
  title: "The full curriculum",
  description:
    "Every module on AIinFive, all four tracks, in the order you would meet them reading straight through.",
  path: "/curriculum",
});

/**
 * The whole syllabus, one page. The homepage leads with one live game and a
 * six-node path; this is where "see everything" actually lands.
 */
export default function Curriculum() {
  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <p className="label text-ink-faint mb-4">The full curriculum</p>
        <h1 className="display-xl mb-5">Everything, on one page.</h1>
        <p className="prose-measure text-ink-soft mb-4 text-xl">
          Four tracks. The six chapters are the point of the site; the rest is
          what you take to work, the craft underneath it, and how deep you want
          to go.
        </p>
        <p className="mb-10">
          <Link
            href={`/lessons/${firstChapter.slug}`}
            className="label underline underline-offset-2"
          >
            Or just play the first game
          </Link>
        </p>

        {TRACK_ORDER.map((track) => (
          <TrackSection key={track} track={track} lessons={lessonsIn(track)} />
        ))}
      </main>
      <SiteFooter />
    </>
  );
}

function TrackSection({ track, lessons }: { track: Track; lessons: Lesson[] }) {
  const meta = TRACKS[track];

  return (
    <section id={track} className="border-ink/25 scroll-mt-20 border-t py-12">
      <p className="label text-ink-faint mb-3">
        {track === "chapter"
          ? "Start here, in order"
          : track === "close"
            ? "Then take it to work"
            : track === "ml"
              ? "Ten modules, one dataset"
              : "Optional depth, reachable from inside a chapter"}
      </p>
      <h2 className="display-lg mb-2">{meta.title}</h2>
      <p className="prose-measure text-ink-soft mb-9">{meta.blurb}</p>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {lessons.map((lesson, i) => {
          const ink = inkClasses[lesson.ink];
          return (
            <li key={lesson.slug} className="flex">
              <Reveal delay={Math.min(i, 5) * 0.05} className="flex w-full">
                <Link
                  href={`/lessons/${lesson.slug}`}
                  className="plate misreg flex h-full flex-col p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span
                      className={`data ${ink.chip} rounded-[2px] border px-1.5 py-0.5 text-xs font-bold`}
                    >
                      {String(lesson.number).padStart(2, "0")}
                    </span>
                    <span className="label text-ink-faint">
                      {lesson.minutes}m
                    </span>
                  </div>

                  <h3 className="font-display mb-2 text-lg leading-tight font-bold">
                    {lesson.title}
                  </h3>
                  <p className="text-ink-soft grow text-sm">
                    {lesson.standfirst}
                  </p>

                  {lesson.nugget ? (
                    <p
                      className={`${ink.chip} mt-3 rounded-[2px] border px-2 py-1 text-xs font-semibold`}
                    >
                      {lesson.nugget}
                    </p>
                  ) : null}

                  <p className="border-ink/20 label text-ink-faint mt-4 flex items-center justify-between gap-2 border-t pt-3">
                    <span className="truncate">{lesson.machine}</span>
                    {lesson.status === "building" ? (
                      <span className="shrink-0 opacity-70">Soon</span>
                    ) : (
                      <span className="text-teal-text shrink-0">Ready</span>
                    )}
                  </p>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
