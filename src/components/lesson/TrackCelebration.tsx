"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { Nimo } from "@/components/nimo/Nimo";
import { earned, lessonsFor, scoreFor } from "@/lib/certificate";
import { useCelebrated } from "@/lib/celebrated";
import { playCue } from "@/lib/game/sound";
import { useProgress } from "@/lib/progress";

/**
 * The one moment on this site worth interrupting somebody for.
 */

/** Flat spot inks, hard edges. Print, not glitter. */
const PAPER_INKS = ["bg-blue", "bg-pink", "bg-yellow", "bg-teal"];
const PIECES = 44;

/** Deterministic 0..1 from an index and a salt. Pure, so it may run in render. */
function noise(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {Array.from({ length: PIECES }, (_, i) => {
        const left = noise(i, 1) * 100;
        const drift = (noise(i, 2) - 0.5) * 26;
        const delay = noise(i, 3) * 0.9;
        const duration = 2.4 + noise(i, 4) * 1.8;
        const spin = 180 + noise(i, 5) * 900;
        const width = 6 + noise(i, 6) * 9;
        const height = 9 + noise(i, 7) * 8;
        const ink = PAPER_INKS[i % PAPER_INKS.length];

        return (
          <motion.span
            key={i}
            className={`absolute block ${ink}`}
            style={{ left: `${left}%`, width, height }}
            initial={{ top: "-8%", rotate: 0, opacity: 1 }}
            animate={{
              top: "108%",
              rotate: spin,
              x: drift,
              opacity: [1, 1, 0.85, 0],
            }}
            transition={{ duration, delay, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

export function TrackCelebration() {
  const { progress } = useProgress();
  const [seen, remember] = useCelebrated();
  const still = useReducedMotion();
  const claim = useRef<HTMLAnchorElement>(null);

  /* Pure: the first finished certificate this browser has never acknowledged.
     Both halves come from stores, so this settles on its own after a check. */
  const pending = earned(progress).find((spec) => !seen.includes(spec.id));

  const dismiss = useCallback(() => {
    if (pending) remember(pending.id);
  }, [pending, remember]);

  useEffect(() => {
    if (!pending) return;

    playCue("best");
    claim.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);

    /* The page behind must not scroll under the dialog. */
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [pending, dismiss]);

  const score = pending ? scoreFor(pending, progress) : null;
  /* The track's own modules, not everything this browser has ever finished. */
  const count = pending ? lessonsFor(pending).length : 0;

  return (
    <AnimatePresence>
      {pending ? (
        <>
          {still ? null : <Confetti />}

          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-5"
            style={{ background: "var(--scrim)" }}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            /* A press anywhere off the plate is a dismissal, same as Escape. */
            onClick={dismiss}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="celebration-title"
              className="plate misreg bg-paper-raised w-full max-w-lg p-6 md:p-8"
              initial={still ? false : { opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <Nimo
                  mood="celebrate"
                  follow={false}
                  height={120}
                  interactive={false}
                  className="hidden w-[120px] shrink-0 sm:block"
                />
                <div className="min-w-0">
                  <p className="label text-ink-faint mb-2">
                    That is the whole track
                  </p>
                  <h2 id="celebration-title" className="display-md mb-3">
                    You finished {pending.title}.
                  </h2>
                  <p className="text-ink-soft">
                    {count} modules, every one of them played before it was
                    explained
                    {score !== null ? `, and ${score}% across the checks` : ""}.
                    There is a plate with your name on it waiting.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  ref={claim}
                  href="/certificate"
                  onClick={dismiss}
                  className="plate misreg btn-primary font-display inline-block px-5 py-2.5 font-bold"
                >
                  Claim your certificate
                </Link>
                <button
                  type="button"
                  onClick={dismiss}
                  className="label border-ink/40 hover:border-ink cursor-pointer rounded-[2px] border px-4 py-2.5"
                >
                  Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
