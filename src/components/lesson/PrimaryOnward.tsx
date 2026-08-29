"use client";

import Link from "next/link";
import { CERTIFICATES, isEarned } from "@/lib/certificate";
import { type Lesson, TRACKS } from "@/lib/lessons";
import { useProgress } from "@/lib/progress";
import { trackAdvanced } from "@/lib/telemetry";

/**
 * The one thing to do next, at the end of a lesson. Exactly one, everything
 * else on the closing screen (sources, the rabbit hole, "previous") is
 * secondary and stays visibly smaller than this.
 *
 * In order:
 * 1. Finishing this lesson just earned its track's certificate, claim it.
 * 2. Nothing is left, and both certificates are already earned, the daily
 *    puzzle is the one thing on the site that still changes.
 * 3. Otherwise, onward to the next lesson.
 * 4. The very end of the whole reading order, with no certificate to offer,
 *    back to the start.
 */
export function PrimaryOnward({
  lesson,
  next,
}: {
  lesson: Lesson;
  next?: Lesson;
}) {
  const { progress } = useProgress();

  const arrow = (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
      <path
        d="M1 7 H13 M8 2 L13 7 L8 12"
        stroke="currentColor"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const className =
    "plate misreg btn-primary font-display mx-auto inline-flex max-w-full items-center gap-3 px-6 py-4 text-left text-lg font-bold";

  const trackSpec = CERTIFICATES.find((c) => c.id === lesson.track);
  if (trackSpec && isEarned(trackSpec, progress)) {
    return (
      <Link href="/certificate" className={className}>
        <span>
          <span className="label block opacity-80">Get your certificate</span>
          {trackSpec.title}
        </span>
        {arrow}
      </Link>
    );
  }

  if (!next && CERTIFICATES.every((c) => isEarned(c, progress))) {
    return (
      <Link href="/#puzzle" className={className}>
        <span>
          <span className="label block opacity-80">Nothing left to finish</span>
          Play today&rsquo;s puzzle
        </span>
        {arrow}
      </Link>
    );
  }

  if (next) {
    return (
      <Link
        href={`/lessons/${next.slug}`}
        onClick={() => trackAdvanced(lesson.slug)}
        className={className}
      >
        <span>
          <span className="label block opacity-80">
            {next.track !== lesson.track
              ? `Next · ${TRACKS[next.track].title}`
              : lesson.track === "chapter"
                ? "Next chapter"
                : "Next"}
          </span>
          {next.title}
        </span>
        {arrow}
      </Link>
    );
  }

  return (
    <Link href="/" className={className}>
      Back to the start
    </Link>
  );
}
