"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";

/**
 * One headline number, taken apart.
 *
 * The figure opens on the number everybody quotes, a fourteen per cent gain,
 * and then splits that single bar into the two groups it was averaged from.
 * The split is the whole argument of the chapter: fourteen per cent is nobody's
 * result. The newest workers got more than twice it and the most experienced
 * got a result the authors describe as minimal.
 *
 * The average row NEVER leaves. It used to: the headline bar exited and two
 * new bars arrived in its place, which is a slideshow, and a reader who looks
 * away for a second comes back with nothing to compare against. It stays, goes
 * quiet, and from the moment it splits it also prints itself as a dashed rule
 * down every bar underneath — so thirty four per cent is seen overshooting the
 * average and "minimal" is seen falling short of it, rather than being two
 * numbers you are asked to hold in your head.
 *
 * The experienced row deliberately has no bar. The paper reports that group as
 * minimal rather than as a headline percentage, and drawing a bar of some
 * invented length would be putting a number in the reader's head that nobody
 * measured. A dashed rule and the word is the honest rendering.
 *
 * The last bar is a different study on purpose. Fifty five point eight per cent
 * sounds like a contradiction until you see what was measured: one narrow
 * programming task rather than a whole job. Same axis, so the comparison is
 * available; different label, so the comparison is not silently made for you.
 *
 * Every number here is quoted from the two papers cited at the foot of the
 * chapter. Nothing on this page is computed by us.
 *
 * Stages:
 *   0  the headline
 *   1  who it was actually made of
 *   2  a second study, and what changing the scope does
 *   3  none of it is a statement about your Tuesday
 */

type Row = {
  id: string;
  label: string;
  detail: string;
  /** Null where the source reports a direction rather than a figure. */
  percent: number | null;
  ink: "blue" | "pink" | "teal";
};

/** Brynjolfsson, Li & Raymond 2023, NBER 31161: 5,179 support agents. */
const AVERAGE: Row = {
  id: "avg",
  label: "Everyone, averaged",
  detail: "5,179 customer support agents, issues resolved per hour",
  percent: 14,
  ink: "blue",
};

const SPLIT: Row[] = [
  {
    id: "novice",
    label: "Novice and low skilled",
    detail: "The people who had least of it already",
    percent: 34,
    ink: "pink",
  },
  {
    id: "expert",
    label: "Experienced and highly skilled",
    detail: "Reported as minimal, not as a headline figure",
    percent: null,
    ink: "teal",
  },
];

/** Peng, Kalliamvakou, Cihon & Demirer 2023, arXiv:2302.06590. */
const NARROW: Row = {
  id: "narrow",
  label: "One narrow task",
  detail: "Writing an HTTP server in JavaScript, finished faster",
  percent: 55.8,
  ink: "blue",
};

/** Room above the largest bar, so the widest one is not flush to the edge. */
const AXIS = 62;

const FILL: Record<Row["ink"], string> = {
  blue: "bg-blue",
  pink: "bg-pink",
  teal: "bg-teal",
};

const TEXT: Record<Row["ink"], string> = {
  blue: "text-blue-text",
  pink: "text-pink-text",
  teal: "text-teal-text",
};

function rowsFor(stage: number): Row[] {
  if (stage <= 0) return [AVERAGE];
  if (stage === 1) return [AVERAGE, ...SPLIT];
  return [AVERAGE, ...SPLIT, NARROW];
}

export function SkillGapFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const rows = rowsFor(stage);

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 border-b px-4 py-3">
        <p className="label text-ink-faint mb-1">
          What an assistant was measured to be worth
        </p>
        <p className="text-[0.9375rem] font-semibold">
          {stage <= 0
            ? "The number everybody quotes"
            : stage === 1
              ? "The two groups it was averaged from"
              : stage < 4
                ? "And what happens when the task gets narrow"
                : "And where that leaves your own week"}
        </p>
      </div>

      <div className="px-4 py-4">
        <ul className="space-y-4">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((row) => {
              /* Once the average has been taken apart it is context, not the
                 subject. It stays on screen and stops competing. */
              const quiet = row.id === "avg" && stage >= 1;

              return (
              <motion.li
                key={row.id}
                layout={!still}
                initial={still ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: quiet ? 0.5 : 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-[0.9375rem] font-semibold">
                    {row.label}
                  </span>
                  <span
                    className={`data text-sm font-bold tabular-nums ${TEXT[row.ink]}`}
                  >
                    {row.percent === null ? "minimal" : `+${row.percent}%`}
                  </span>
                </div>

                <span className="bg-paper-sunk border-ink/20 relative block h-5 overflow-hidden rounded-[1px] border">
                  {row.percent === null ? (
                    // No bar, because no figure was published for this group.
                    <span className="border-ink/40 ml-1 block h-full w-1 border-r border-dashed" />
                  ) : (
                    <motion.span
                      className={`block h-full ${FILL[row.ink]}`}
                      initial={still ? false : { width: 0 }}
                      animate={{ width: `${(row.percent / AXIS) * 100}%` }}
                      transition={{
                        duration: still ? 0 : 0.7,
                        ease: "easeOut",
                      }}
                    />
                  )}

                  {/* The average, printed straight down every bar under it. */}
                  {stage >= 1 && row.id !== "avg" ? (
                    <motion.span
                      aria-hidden="true"
                      className="border-ink absolute inset-y-0 border-l-2 border-dashed"
                      style={{ left: `${(AVERAGE.percent! / AXIS) * 100}%` }}
                      initial={still ? false : { opacity: 0 }}
                      animate={{ opacity: 0.75 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    />
                  ) : null}
                </span>

                <p className="text-ink-faint mt-1 text-[0.8125rem]">
                  {quiet ? "The line down every bar below is this number." : row.detail}
                </p>
              </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {stage >= 2 ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure text-ink-soft mt-4 text-[0.9375rem]"
          >
            The last bar is a different study and a different kind of thing. One
            programming task, measured on its own, and the gain is larger than
            anything in the first study. Narrow the scope and the number goes
            up. Widen it to a whole job and it comes back down to fourteen, and
            then splits.
          </motion.p>
        ) : null}

        {/* The last beat of the walkthrough is about the reader's own tasks,
            and the figure used to draw nothing for it: stage three and stage
            four were the identical picture. This is the honest shape of what
            is known about them — a range between the two measured ends and no
            number inside it. Yellow, because on this site yellow is the
            learner's own input. */}
        {stage >= 4 ? (
          <motion.div
            className="mt-5"
            initial={still ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-[0.9375rem] font-semibold">
                Your own tasks
              </span>
              <span className="data text-yellow-text text-sm font-bold">
                nobody has measured this
              </span>
            </div>

            <span className="bg-paper-sunk border-ink/20 relative block h-5 overflow-hidden rounded-[1px] border">
              <motion.span
                className="bg-yellow/45 block h-full"
                initial={still ? false : { width: 0 }}
                animate={{ width: `${(34 / AXIS) * 100}%` }}
                transition={{ duration: still ? 0 : 0.7, ease: "easeOut" }}
              />
              <span
                aria-hidden="true"
                className="border-ink absolute inset-y-0 border-l-2 border-dashed opacity-75"
                style={{ left: `${(AVERAGE.percent! / AXIS) * 100}%` }}
              />
            </span>

            <p className="text-ink-faint mt-1 text-[0.8125rem]">
              Somewhere between minimal and thirty-four per cent, and which end
              depends on the task and on you. That is the whole answer anybody
              has.
            </p>
          </motion.div>
        ) : null}

        {stage >= 3 ? (
          <motion.p
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-measure mt-3 text-[0.9375rem] font-semibold"
          >
            None of these three bars is a claim about your week. They are three
            groups of other people doing two specific jobs. Which is why the
            sorting above is not scored, and why nobody else can do it for you.
          </motion.p>
        ) : null}
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        First two rows: Brynjolfsson, Li and Raymond, 2023, 5,179 agents at one
        firm, issues resolved per hour. Last row: Peng and colleagues, 2023, a
        controlled experiment on a single programming task. Both are linked in
        the sources at the foot of this chapter.
      </figcaption>
    </figure>
  );
}
