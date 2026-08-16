"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { arrowKeysClaimed } from "@/lib/arrowKeys";
import { FitBox } from "./FitBox";

/**
 * A lesson as a deck of beats: one on screen at a time, no scrolling between
 * them. Every beat is rendered into the DOM and the inactive ones are hidden
 * with `display: none`, so the whole lesson text still ships in the HTML and
 * the reveal stays honest to a scraper and to the section observer.
 */

type Stage = {
  at: number;
  count: number;
  next: () => void;
  back: () => void;
  /** True on the last beat, where the advance control changes its wording. */
  last: boolean;
};

const StageContext = createContext<Stage | null>(null);

/**
 * The deck a beat is sitting in, or null when the same component is used on a
 * page that is not a deck. Anything interactive can advance the lesson with
 * this, which is the point: the tap that answers is the tap that moves on.
 */
export function useStage(): Stage | null {
  return useContext(StageContext);
}

export type Beat = {
  /** Stable, and used for the key. */
  id: string;
  node: ReactNode;
  /**
   * Beats that hold their own advance control — a game that has to end, a
   * walkthrough that steps through itself. The deck draws no button of its own.
   */
  selfAdvance?: boolean;
  /** Wording for this beat's advance control when the deck draws it. */
  cta?: string;
  /**
   * Off for a beat that is meant to be read down rather than taken in at a
   * glance. Everything else is scaled to the screen it is on.
   */
  fit?: boolean;
};

export function LessonStage({ beats }: { beats: Beat[] }) {
  const [at, setAt] = useState(0);
  const still = useReducedMotion();
  const count = beats.length;

  const next = useCallback(() => {
    setAt((i) => (i < count - 1 ? i + 1 : i));
  }, [count]);

  const back = useCallback(() => {
    setAt((i) => (i > 0 ? i - 1 : i));
  }, []);

  /* Arrow keys and space, the way a deck is expected to behave. Typing into a
     game's own input must not turn the page. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      )
        return;
      if (arrowKeysClaimed()) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back]);

  const stage = useMemo<Stage>(
    () => ({ at, count, next, back, last: at === count - 1 }),
    [at, count, next, back],
  );

  return (
    <StageContext.Provider value={stage}>
      <div
        className="relative flex h-full flex-col"
        data-stage-at={at}
        data-stage-beats={count}
      >
        {/* min-h-0 is load-bearing: without it this flex child refuses to
            shrink, the container grows past the viewport, the document scrolls
            instead of this box, and `sticky` inside a beat has no scrollport to
            pin against. */}
        <div
          data-stage-port=""
          className="min-h-0 grow overflow-x-hidden overflow-y-auto"
        >
          <div
            data-stage-pad=""
            className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-6"
          >
            {beats.map((beat, i) => (
              <div
                key={beat.id}
                className={i === at ? "my-auto block" : "hidden"}
              >
                <motion.div
                  /* Keyed on the index so re-entering a beat replays its
                     arrival, and so the deck reads as a page turn.
                     Opacity only, and deliberately: a transform here made the
                     beat wider than the viewport for the length of the
                     animation, and a transformed ancestor stops `sticky`
                     working for anything inside it, which is what pins a tall
                     beat's own controls on a phone. */
                  key={`${beat.id}-${at}`}
                  initial={still ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: still ? 0 : 0.24,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <FitBox active={i === at} enabled={beat.fit !== false}>
                    {beat.node}
                  </FitBox>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* The advance control lives in the rail, not in the flow. Under a beat
            that overflows a phone it would sit below the fold, which is the
            exact thing this deck exists to stop. */}
        <StageRail
          beats={beats}
          at={at}
          onBack={back}
          onJump={setAt}
          cta={beats[at]?.selfAdvance ? undefined : (beats[at]?.cta ?? "Next")}
        />
      </div>
    </StageContext.Provider>
  );
}

/**
 * The advance control. Exported so a beat that owns its own flow can print the
 * same button in its own layout instead of under it.
 */
export function StageAdvance({ label }: { label?: string }) {
  const stage = useStage();
  if (!stage || stage.last) return null;

  return (
    <button
      type="button"
      onClick={stage.next}
      data-stage-next=""
      className="plate misreg btn-primary font-display inline-flex min-w-0 items-center gap-2 px-4 py-2.5 font-bold"
    >
      <span className="truncate">{label ?? "Next"}</span>
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M1 7 H13 M8 2 L13 7 L8 12"
          stroke="currentColor"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Where you are in the deck, countable, and a way back one beat. */
function StageRail({
  beats,
  at,
  onBack,
  onJump,
  cta,
}: {
  beats: Beat[];
  at: number;
  onBack: () => void;
  onJump: (i: number) => void;
  /** Undefined on a beat that draws its own way onward. */
  cta?: string;
}) {
  const still = useReducedMotion();

  return (
    <div className="border-ink/25 bg-paper-sunk sticky bottom-0 border-t">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-2.5">
        <button
          type="button"
          onClick={onBack}
          disabled={at === 0}
          className="tap label text-ink-faint shrink-0 rounded-[2px] px-3 py-2.5 disabled:opacity-35"
        >
          &larr; Back
        </button>

        <span className="flex min-w-0 flex-1 gap-1" aria-hidden="true">
          {beats.map((beat, i) => (
            <button
              key={beat.id}
              type="button"
              tabIndex={-1}
              /* Only backwards. Jumping ahead would hand over the answer to a
                 beat that has not been played yet. */
              onClick={i < at ? () => onJump(i) : undefined}
              className="-my-2 flex h-1.5 flex-1 items-center py-2"
            >
              <span className="bg-ink/15 block h-1.5 w-full overflow-hidden rounded-[1px]">
                <motion.span
                  className="bg-pink block h-full origin-left"
                  initial={false}
                  animate={{ scaleX: i <= at ? 1 : 0 }}
                  transition={{ duration: still ? 0 : 0.3, ease: "easeOut" }}
                />
              </span>
            </button>
          ))}
        </span>

        <span className="label text-ink-faint hidden shrink-0 tabular-nums sm:inline">
          {at + 1} / {beats.length}
        </span>

        {cta ? <StageAdvance label={cta} /> : null}
      </div>
    </div>
  );
}
