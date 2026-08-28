"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lessonsIn, TRACKS } from "@/lib/lessons";
import { NimoFlat } from "@/components/nimo/NimoFlat";
import { pickNimoLine } from "@/lib/nimoReactions";
import { useProgress } from "@/lib/progress";

/**
 * The ML path is not a second choice at the top of the page any more. It
 * unlocks visually once chapter one is behind you, the same way the path
 * line itself fills in.
 */
export function MlPathTeaser() {
  const { isComplete, progress, dismissNimo } = useProgress();
  const ml = lessonsIn("ml");
  const minutes = ml.reduce((n, l) => n + l.minutes, 0);
  const unlocked = isComplete("what-an-llm-is");

  /* Only remarks on unlocking within this visit — `null` means "do not know
     yet", not "was locked", so a returning learner who unlocked it last week
     does not get greeted as if it just happened. */
  const wasUnlocked = useRef<boolean | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);

  useEffect(() => {
    const justUnlocked = wasUnlocked.current === false && unlocked;
    wasUnlocked.current = unlocked;
    if (!justUnlocked || progress.nimoDismissed) return;
    setReaction(pickNimoLine("chapterUnlock"));
    const t = setTimeout(() => setReaction(null), 5000);
    return () => clearTimeout(t);
  }, [unlocked, progress.nimoDismissed]);

  if (!unlocked) {
    return (
      <div className="plate flex items-center gap-4 p-5 opacity-70">
        <span
          className="border-ink/30 text-ink-faint flex size-10 shrink-0 items-center justify-center rounded-full border-2"
          aria-hidden="true"
        >
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
            <rect
              x="2"
              y="8"
              width="12"
              height="9"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M4.5 8V5a3.5 3.5 0 0 1 7 0v3"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </span>
        <div>
          <p className="font-display font-bold">{TRACKS.ml.title}</p>
          <p className="text-ink-soft text-sm">
            Unlocks after chapter one. Play the game above first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
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

      {reaction ? (
        <div className="mt-3 flex items-start gap-2.5">
          <NimoFlat mood="curious" height={32} className="shrink-0" />
          <p className="plate-flush text-ink-soft flex-1 px-2.5 py-1.5 text-[0.8125rem] leading-snug">
            {reaction}
          </p>
          <button
            type="button"
            onClick={() => {
              setReaction(null);
              dismissNimo();
            }}
            aria-label="Stop Nimo's reactions"
            title="Stop Nimo's reactions"
            className="text-ink-faint hover:text-ink cursor-pointer px-1 text-xs"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
