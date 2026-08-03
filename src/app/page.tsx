import Link from "next/link";
import { HeroDemo } from "@/components/HeroDemo";
import { SiteFooter } from "@/components/SiteFooter";
import { NimoSays } from "@/components/nimo/NimoSays";
import { SiteHeader } from "@/components/SiteHeader";
import { inkClasses } from "@/lib/ink";
import { type Lesson, lessonsIn, type Track, TRACKS } from "@/lib/lessons";

export default function Home() {
  const worlds = lessonsIn("world");
  const close = lessonsIn("close");
  const how = lessonsIn("how");
  const worldMinutes = worlds.reduce((n, l) => n + l.minutes, 0);

  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero. The claim is made by a machine you can poke, not by a
            paragraph asserting it. */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 md:pt-20">
          <p className="label text-ink-faint mb-5">
            {worlds.length} worlds · about {worldMinutes} minutes · nothing to
            sign up for
          </p>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div>
              <h1 className="display-xl">
                Stop guessing
                <br />
                what AI is
                <br />
                <span className="text-pink-text">actually doing.</span>
              </h1>

              <div className="prose-measure text-ink-soft mt-7 text-lg">
                <p>
                  Short modules you play rather than read. You watch the thing
                  fail, and only then does anyone explain the machinery behind
                  it &mdash; while you are still annoyed about it. Every game
                  runs on real data, never a mock-up.
                </p>
                <p>
                  Six worlds, one idea each, about {worldMinutes} minutes end to
                  end. There is no theory to get through first &mdash; the round
                  on the right is a real model and it is already playing.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/lessons/${worlds[0].slug}`}
                  className="plate misreg btn-primary font-display inline-block px-5 py-3 font-bold"
                >
                  Start world 1
                </Link>
                <Link
                  href="/lessons/tokens"
                  className="plate misreg font-display inline-block px-5 py-3 font-bold"
                >
                  Or open the machine
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {/* One owl, and he introduces himself. NimoSays draws its own
                  Nimo, so a separate hero owl above it put two on the page. */}
              <NimoSays mood="curious" size={170}>
                I am Nimo. Before anyone explains anything to you &mdash; play
                one round against a real model and see how you do.
              </NimoSays>
              <HeroDemo />
            </div>
          </div>
        </section>

        <TrackSection
          id="worlds"
          track="world"
          lessons={worlds}
          eyebrow="Start here — in order"
          sunk
        />
        <TrackSection
          id="close"
          track="close"
          lessons={close}
          eyebrow="Then take it to work"
        />
        <TrackSection
          id="how"
          track="how"
          lessons={how}
          eyebrow="Optional depth — reachable from inside the worlds"
          sunk
        />

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="display-md mb-3">Where the numbers come from</h2>
          <p className="prose-measure text-ink-soft">
            Every token, vector and probability here is computed from a real
            model or a published dataset, and every module ends with the sources
            it drew on. Where a figure is precomputed rather than run in your
            browser, the script that produced it is in the repository. If a
            number cannot be traced, it does not ship.
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function TrackSection({
  id,
  track,
  lessons,
  eyebrow,
  sunk = false,
}: {
  id: string;
  track: Track;
  lessons: Lesson[];
  eyebrow: string;
  sunk?: boolean;
}) {
  const meta = TRACKS[track];

  return (
    <section
      id={id}
      className={`border-ink/25 border-t ${sunk ? "bg-paper-sunk" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-5 py-14">
        <p className="label text-ink-faint mb-3">{eyebrow}</p>
        <h2 className="display-lg mb-2">{meta.title}</h2>
        <p className="prose-measure text-ink-soft mb-9">{meta.blurb}</p>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lessons.map((lesson) => {
            const ink = inkClasses[lesson.ink];
            return (
              <li key={lesson.slug}>
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

                  {/* The one line you should still have a month later. */}
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
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
