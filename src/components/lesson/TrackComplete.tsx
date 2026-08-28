"use client";

import Link from "next/link";
import { NimoSays } from "@/components/nimo/NimoSays";
import { CERTIFICATES, isEarned } from "@/lib/certificate";
import type { Track } from "@/lib/lessons";
import { useProgress } from "@/lib/progress";

/**
 * The end of a track, said once, on the pages of that track.
 */
export function TrackComplete({ track }: { track: Track }) {
  const { progress } = useProgress();
  const spec = CERTIFICATES.find((c) => c.id === track);

  if (!spec || !isEarned(spec, progress)) return null;

  return (
    <div className="plate misreg mt-10 p-5 md:p-6">
      <NimoSays mood="celebrate" size={130}>
        That is all of {spec.title.toLowerCase()}. Put your name on it and take
        it with you.
      </NimoSays>
      {/* Not `btn-primary`: on the lesson that just earned this, the closing
          screen's own primary button already says exactly this. This stays
          for every OTHER lesson in the track, as a quieter reminder. */}
      <Link
        href="/certificate"
        className="label mt-4 inline-block underline underline-offset-2"
      >
        Get your certificate
      </Link>
    </div>
  );
}
