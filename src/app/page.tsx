import { Engagement } from "@/components/Engagement";
import Link from "next/link";
import { HeroReel } from "@/components/HeroReel";
import {
  PathChooser,
  type PathAside,
  type PathSummary,
} from "@/components/PathChooser";
import { Reveal } from "@/components/Reveal";
import { TheLoop } from "@/components/TheLoop";
import { SiteFooter } from "@/components/SiteFooter";
import { NimoSays } from "@/components/nimo/NimoSays";
import { SiteHeader } from "@/components/SiteHeader";
import { inkClasses } from "@/lib/ink";
import { type Lesson, lessonsIn, type Track, TRACKS } from "@/lib/lessons";

export default function Home() {
  const chapters = lessonsIn("chapter");
  const close = lessonsIn("close");
  const how = lessonsIn("how");
  const ml = lessonsIn("ml");
  const chapterMinutes = chapters.reduce((n, l) => n + l.minutes, 0);
  const mlMinutes = ml.reduce((n, l) => n + l.minutes, 0);

  /* The two ways through the site, built from the syllabus rather than typed
     out, so a module added anywhere lands here without anybody remembering to
     come and update a number. The takeaways are the modules' own nuggets. */
  const nuggets = (lessons: Lesson[]) =>
    lessons.map((lesson) => lesson.nugget).filter((n) => n !== undefined);

  const paths: PathSummary[] = [
    {
      id: "ai",
      anchor: "#chapters",
      eyebrow: "If you use these tools",
      title: "The AI path",
      promise:
        "What the machine is doing while it answers you, so you can tell the moments it is reliable from the moments it is only fluent. Then three more modules to take to work.",
      takeaways: nuggets(chapters).slice(0, 3),
      moduleCount: chapters.length,
      minutes: chapterMinutes,
      href: `/lessons/${chapters[0].slug}`,
      firstGame: chapters[0].machine,
      certificate: "The Basics of AI",
      ink: "blue",
    },
    {
      id: "ml",
      anchor: "#ml",
      eyebrow: "If you want to build them",
      title: "The ML path",
      promise:
        "How a machine learns anything at all, from the first idea to the mistakes that cost people money. One real dataset the whole way, and no maths past arithmetic.",
      takeaways: nuggets(ml).slice(0, 3),
      moduleCount: ml.length,
      minutes: mlMinutes,
      href: `/lessons/${ml[0].slug}`,
      firstGame: ml[0].machine,
      certificate: "The Basics of Machine Learning",
      ink: "teal",
    },
  ];

  /* Not a path. The rabbit hole hangs under both of them, which is why it is
     drawn as a rung between the two roads rather than as a third road. */
  const aside: PathAside = {
    title: TRACKS.how.title,
    blurb:
      "Tokens, vectors, attention, and why it gets things wrong. Every one is linked from the moment inside a module where you would actually want it, so you never have to start here.",
    moduleCount: how.length,
    anchor: "#how",
  };

  return (
    <>
      {/* Visible time on the landing page, and how far down it held them. */}
      <Engagement page="home" />
      <SiteHeader />

      <main id="content">
        {/* Hero. The claim is made by a machine you can poke, not by a
            paragraph asserting it. */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 md:pt-20">
          {/* The first thing anybody does here really is about five minutes:
              one game, four rounds. The whole set is longer and the chapter
              cards say so, which is the point of leading with the honest small
              number rather than the honest large one. */}
          {/* Each clause holds together on its own line. Left to wrap
              freely the tracked-out label broke mid-clause on a phone, which
              read as three unrelated fragments rather than one promise. */}
          <p className="label text-ink-faint mb-5">
            <span className="whitespace-nowrap">
              One game, about five minutes
            </span>{" "}
            ·{" "}
            <span className="whitespace-nowrap">
              {chapters.length} chapters in all
            </span>{" "}
            · <span className="whitespace-nowrap">nothing to sign up for</span>
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
                  You are probably already using one of these things. Nobody
                  ever showed you what it is doing while it answers, so you are
                  left guessing about when to trust it. Start with one game,
                  about five minutes, against a real model. Six short chapters
                  follow if you want them, about{" "}
                  {/* The space after the count is explicit: written as plain
                  text it was eaten at the line break and rendered as
                  "44minutes". */}
                  {chapterMinutes} minutes in all, and you play first and read
                  afterwards.
                </p>
              </div>

              <div className="mt-8">
                <Link
                  href={`/lessons/${chapters[0].slug}`}
                  className="plate misreg btn-primary font-display inline-block px-5 py-3 font-bold"
                >
                  Play the first game
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {/* One otter, and he introduces himself. NimoSays draws its own
                  Nimo, so a separate hero mascot above it put two on the page. */}
              <NimoSays mood="curious" size={200} follow>
                I am Nimo. Before anyone explains anything to you, play one
                round against a real model and see how you do.
              </NimoSays>
              <HeroReel />
            </div>
          </div>
        </section>

        {/* The fork, high up. Two different undertakings, said plainly, before
            anybody has to scroll past four sections to find the second one. */}
        <section className="border-ink/25 bg-paper-sunk border-t">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <Reveal>
              <p className="label text-ink-faint mb-3">Two paths from here</p>
              <h2 className="display-lg mb-2">
                Use one well, or build one yourself.
              </h2>
              <p className="prose-measure text-ink-soft mb-9">
                Both start from the same place and neither assumes the other.
                Take whichever is the reason you came, and every module on it
                is a game first and an explanation second. Underneath both
                there is a third set on how the machine actually works, which
                nothing requires you to read.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <PathChooser paths={paths} aside={aside} />
            </Reveal>
          </div>
        </section>

        {/* Why anyone should care, said once, quietly, after they have already
            poked the demo. Stating the problem beats stating the product. */}
        <section className="border-ink/25 border-t">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <Reveal>
              <p className="label text-ink-faint mb-3">Why this exists</p>
              <h2 className="display-lg prose-measure mb-4">
                Everyone is using these tools. Almost nobody was shown how they
                work.
              </h2>
              <div className="prose-measure text-ink-soft space-y-3">
                <p>
                  So most of the advice going around is guesswork. A magic
                  phrase that is meant to unlock better answers. A rule that you
                  should never trust it with anything that matters. A vague
                  sense that it thinks the way a colleague does. All of it falls
                  apart the moment you watch one of these models work.
                </p>
                <p>
                  What holds up is a plain picture of what the model is doing
                  while it answers. That is what tells you when to lean on it
                  and when to check it. It takes about an hour to pick up, and
                  there is no maths and no jargon.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* The site's central claim, running, before anyone is asked to read
            a word of it. */}
        <section className="border-ink/25 bg-paper-sunk border-t">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <Reveal>
              <p className="label text-ink-faint mb-3">
                What it is actually doing
              </p>
              <h2 className="display-lg mb-2">
                Watch it write a sentence, one word at a time.
              </h2>
              <p className="prose-measure text-ink-soft mb-9">
                It reads what it has written, picks the next word, adds it, and
                reads again. That is the whole machine, and every strange thing
                these tools do comes out of it.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <TheLoop />
            </Reveal>
          </div>
        </section>

        <TrackSection
          id="chapters"
          track="chapter"
          lessons={chapters}
          eyebrow="The AI path · start here, in order"
        />
        <TrackSection
          id="close"
          track="close"
          lessons={close}
          eyebrow="The AI path · then take it to work"
          sunk
        />
        <TrackSection
          id="ml"
          track="ml"
          lessons={ml}
          eyebrow="The ML path · ten modules, one dataset"
        />
        <TrackSection
          id="how"
          track="how"
          lessons={how}
          eyebrow="Either path · optional depth, reachable from inside a module"
          sunk
        />

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="display-md mb-3">Where the numbers come from</h2>
          <p className="prose-measure text-ink-soft">
            Every token, vector and probability here is computed from a real
            model or a published dataset, and every page ends with the sources
            it drew on. If a number cannot be traced, it does not ship.
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
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
