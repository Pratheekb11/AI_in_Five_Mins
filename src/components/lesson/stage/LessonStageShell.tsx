import type { ReactNode } from "react";
import { Engagement } from "@/components/Engagement";
import { SiteHeader } from "@/components/SiteHeader";
import { inkClasses } from "@/lib/ink";
import { type Lesson, neighbours, TRACKS } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { Sources } from "../Sources";
import { TrackCelebration } from "../TrackCelebration";
import { TrackComplete } from "../TrackComplete";
import { TrackGaps } from "../TrackGaps";
import { PrimaryOnward } from "../PrimaryOnward";
import { LessonStage, type Beat } from "./LessonStage";
import { StageComplete } from "./StageComplete";

/**
 * The frame for a lesson played as a deck. Same masthead and telemetry as the
 * scrolling shell, but the beats the page hands over are dealt one screen at a
 * time and the way onward is the last of them rather than the page's basement.
 */
export function LessonStageShell({
  lesson,
  sources,
  beats,
  tail,
}: {
  lesson: Lesson;
  sources: Source[];
  beats: Beat[];
  /** Everything optional, folded under the way onward on the last screen. */
  tail?: ReactNode;
}) {
  const { next } = neighbours(lesson.slug);
  const ink = inkClasses[lesson.ink];

  /* The closer is part of the frame, not of any lesson, so every deck ends the
     same way: what you just did, then one door out of it. */
  const closer: Beat = {
    id: "onward",
    node: (
      <div className="text-center">
        <StageComplete slug={lesson.slug} />
        <span
          className={`data ${ink.chip} mb-5 inline-block rounded-[2px] border px-2 py-1 text-xs font-bold`}
        >
          {TRACKS[lesson.track].title} ·{" "}
          {String(lesson.number).padStart(2, "0")} done
        </span>
        <h2 className="display-lg mb-6">{lesson.nugget ?? lesson.title}</h2>

        <PrimaryOnward lesson={lesson} next={next} />

        {/* Both of these draw nothing until they have something to say, and
            the closing screen is where somebody is deciding what to do next —
            which is the whole reason they exist. */}
        <div className="text-left">
          <TrackComplete track={lesson.track} />
          <TrackGaps lesson={lesson} />
        </div>

        {tail ? <div className="mt-10 space-y-4 text-left">{tail}</div> : null}

        <div className="mt-8 text-left">
          <Sources sources={sources} />
        </div>
      </div>
    ),
    selfAdvance: true,
    /* The closing screen carries every fold on the page. It is meant to be
       read down, so it is the one beat that is not squeezed into a screen. */
    fit: false,
  };

  return (
    <>
      <Engagement page={lesson.slug} />
      {/* A fixed-height column, so the deck occupies exactly what the masthead
          leaves and the document itself never scrolls. */}
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <SiteHeader />
        <main id="content" className="min-h-0 grow">
          <LessonStage beats={[...beats, closer]} />
        </main>
      </div>
      <TrackCelebration />
    </>
  );
}
