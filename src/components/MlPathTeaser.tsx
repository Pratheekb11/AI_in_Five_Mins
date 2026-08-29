"use client";

import Link from "next/link";
import { lessonsIn, TRACKS } from "@/lib/lessons";

/**
 * The ML path, always reachable. It used to stay locked behind finishing
 * chapter one, on the theory that it should unlock the way the path line
 * fills in, but "If you want to build them" is its own reason to be here,
 * not a reward for finishing the other track first.
 */
export function MlPathTeaser() {
  const ml = lessonsIn("ml");
  const minutes = ml.reduce((n, l) => n + l.minutes, 0);

  return (
    <Link
      href={`/lessons/${ml[0].slug}`}
      className="plate misreg flex items-center gap-4 p-5"
    >
      <span
        className="bg-teal-wash text-teal-text flex size-10 shrink-0 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 13 L2 3 M2 13 L14 13 M4.5 10 L7 6.5 L9.5 8.5 L13 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold">{TRACKS.ml.title}</p>
        <p className="text-ink-soft text-sm">
          {ml.length} modules, about {minutes} minutes. One real dataset the
          whole way.
        </p>
      </div>
      <span className="label text-ink-faint shrink-0">Start →</span>
    </Link>
  );
}
