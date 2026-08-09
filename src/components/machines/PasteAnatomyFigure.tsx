"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";

/**
 * One thing you were about to paste, taken apart in place.
 */

type Piece = {
  text: string;
  /** Identifying, and replaceable by the placeholder without loss. */
  person?: string;
};

/** Authored for this figure. Not anybody's real complaint. */
const MESSAGE: Piece[] = [
  { text: "Subject: order " },
  { text: "GB-40182", person: "[order ref]" },
  { text: " arrived damaged\n\nFrom: " },
  { text: "Marta Vieira", person: "[customer]" },
  { text: ", " },
  { text: "14 Bell Row, Leeds LS2 7HT", person: "[address]" },
  { text: "\nPhone: " },
  { text: "07700 900412", person: "[phone]" },
  {
    text: "\n\nThe box was crushed on one corner and the screen has a crack across it. I have had it four days. I would like a replacement rather than a refund, and I would like it before the weekend.",
  },
];

const ASK =
  "Draft a reply that apologises, offers the replacement, and sets a realistic delivery date.";

/** The two that do not become safe by having the names taken out. */
const UNFIXABLE = [
  {
    label: "Special category data",
    line: "Sick note: signed off four weeks, recurring depressive disorder.",
    why: "Taking the name off a diagnosis does not make it yours to hand over. Article 9 sets a higher bar, and it does not move.",
  },
  {
    label: "Somebody else's secret",
    line: "PAYMENTS_API_KEY=sk_live_… (from the production config)",
    why: "There is nothing here to anonymise. The string is the whole of the sensitive thing, and it is still a live key afterwards.",
  },
];

export function PasteAnatomyFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();

  const marked = stage === 1;
  const stripped = stage >= 2;
  const closing = stage >= 4;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 border-b px-4 py-3">
        <p className="label text-ink-faint mb-1">
          {closing
            ? "What is left when the message goes"
            : "In your clipboard, about to go into a chat window"}
        </p>
        <p className="text-[0.9375rem] font-semibold">
          {closing
            ? "One question, before every paste"
            : marked
              ? "Four pieces of it belong to somebody else"
              : stripped
                ? "The same paste, without them"
                : "A customer complaint, and what you want doing with it"}
        </p>
      </div>

      <div className="px-4 py-4">
        <AnimatePresence initial={false} mode="wait">
          {closing ? (
            <motion.div
              key="rule"
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="display-md mb-2">
                Is any of this somebody else&rsquo;s to give away?
              </p>
              <p className="prose-measure text-ink-soft text-[0.9375rem]">
                It is a smaller habit than a policy, and it fits in the second
                before you press paste. Most of the time the honest answer is
                no, and the thing goes straight in. When the answer is yes, the
                identifiers usually were not the part you needed anyway.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="message"
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* The message. Same words, same place, all the way through. */}
              <p className="font-data text-[0.8125rem] leading-[1.9] whitespace-pre-wrap">
                {MESSAGE.map((piece) =>
                  piece.person ? (
                    <motion.span
                      key={piece.text}
                      layout={!still}
                      className={
                        marked
                          ? "bg-pink-wash text-pink-text rounded-[2px] px-1"
                          : stripped
                            ? "bg-teal-wash text-teal-text rounded-[2px] px-1"
                            : ""
                      }
                    >
                      {stripped ? piece.person : piece.text}
                    </motion.span>
                  ) : (
                    piece.text
                  ),
                )}
              </p>

              <p className="border-ink/20 text-ink-soft mt-3 border-t pt-3 text-[0.9375rem]">
                <span className="label text-ink-faint mr-2">And you ask</span>
                {ASK}
              </p>

              {stripped && stage < 3 ? (
                <motion.p
                  initial={still ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose-measure mt-3 text-[0.9375rem] font-semibold"
                >
                  The request underneath has not changed, and neither has the
                  reply you are going to get. Ten seconds bought you the same
                  answer without making a disclosure on a stranger&rsquo;s
                  behalf.
                </motion.p>
              ) : null}

              {stage >= 3 ? (
                <motion.ul
                  initial={still ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-3"
                >
                  {UNFIXABLE.map((item) => (
                    <li
                      key={item.label}
                      className="border-pink border-l-2 pl-3"
                    >
                      <p className="label text-pink-text mb-1">{item.label}</p>
                      <p className="font-data text-[0.8125rem]">{item.line}</p>
                      <p className="text-ink-soft mt-1 text-[0.875rem]">
                        {item.why}
                      </p>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        The example is written for this figure and is nobody&rsquo;s real data.
        The categories are the legal ones, cited at the foot of the chapter.
        What to do about them is this chapter&rsquo;s rule and a sensible
        default, not legal advice.
      </figcaption>
    </figure>
  );
}
