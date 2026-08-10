"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import {
  puzzleForDay,
  type HuntData,
  type Puzzle,
  type Span,
} from "@/lib/game/hunt";
import { useToday } from "@/lib/game/useToday";

/**
 * One paragraph, read four times over, and it is never reprinted.
 */

type Piece =
  | { kind: "words"; key: string; text: string }
  | { kind: "span"; key: string; span: Span };

/**
 * Cut the paragraph into plain runs and altered runs.
 *
 * Spans are inclusive word indices, so the join has to put the spacing back
 * exactly where it was, or the corrected paragraph reflows and the whole point
 * of holding it still is lost.
 */
function piecesOf(puzzle: Puzzle): Piece[] {
  const words = puzzle.text.split(/\s+/);
  const spans = [...puzzle.spans].sort((a, b) => a.first - b.first);
  const out: Piece[] = [];
  let at = 0;

  for (const span of spans) {
    if (span.first > at) {
      out.push({
        kind: "words",
        key: `w${at}`,
        text: words.slice(at, span.first).join(" "),
      });
    }
    out.push({ kind: "span", key: `s${span.first}`, span });
    at = span.last + 1;
  }

  if (at < words.length) {
    out.push({ kind: "words", key: `w${at}`, text: words.slice(at).join(" ") });
  }
  return out;
}

/** The altered words as they sit in the paragraph, spacing included. */
function alteredWords(puzzle: Puzzle, span: Span): string {
  return puzzle.text
    .split(/\s+/)
    .slice(span.first, span.last + 1)
    .join(" ");
}

function hardestOf(puzzle: Puzzle): Span {
  const order = { hard: 0, medium: 1, obvious: 2 } as const;
  return [...puzzle.spans].sort(
    (a, b) => order[a.difficulty] - order[b.difficulty],
  )[0];
}

const DIFFICULTY: Record<Span["difficulty"], string> = {
  obvious: "most people catch this one",
  medium: "reads perfectly, and is wrong",
  hard: "almost nobody catches this one",
};

export function ParagraphCheckFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const day = useToday();
  const [data, setData] = useState<HuntData | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<{ stage: number; id: string }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/hunt.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<HuntData>;
      })
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="plate-flush p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          The paragraphs did not load. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[10rem] p-3 sm:min-h-[18rem] sm:p-4">
        <p className="text-ink-soft text-[0.9375rem]">Loading the paragraph…</p>
      </div>
    );
  }

  const playing = puzzleForDay(data, day);
  const pool = data.puzzles.filter((p) => p.id !== playing.id);
  const puzzle =
    (picked && picked.stage === stage
      ? pool.find((p) => p.id === picked.id)
      : undefined) ?? pool[0];

  const marked = stage >= 1;
  const hardest = hardestOf(puzzle);
  const fixed: Span[] =
    stage === 2 ? [hardest] : stage >= 3 ? [...puzzle.spans] : [];
  const isFixed = (span: Span) => fixed.some((s) => s.first === span.first);
  const explained = stage === 2 ? [hardest] : stage >= 3 ? puzzle.spans : [];
  const errors = pool.reduce((n, p) => n + p.spans.length, 0);

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {marked ? "Three things in here are wrong" : "Handed to you to read"}
        </p>
        <p className="label text-ink-faint">
          {puzzle.title} · {puzzle.words} words
        </p>
      </div>

      <div className="px-4 py-4">
        {/* The paragraph. Same words, same place, all the way through. */}
        <p className="prose-measure text-[1.0625rem] leading-[1.7]">
          {piecesOf(puzzle).map((piece) => {
            if (piece.kind === "words") return `${piece.text} `;
            const { span } = piece;
            const done = isFixed(span);
            return (
              <motion.span
                key={piece.key}
                layout={!still}
                // Unmarked, it carries no padding at all. A highlight's worth
                // of space around three phrases is enough to make the clean
                // read look subtly typeset, which gives the game away.
                className={`transition-colors ${
                  !marked
                    ? ""
                    : done
                      ? "bg-teal-wash text-teal-text rounded-[2px] px-1"
                      : "bg-pink-wash text-pink-text rounded-[2px] px-1"
                }`}
              >
                {done ? span.original : alteredWords(puzzle, span)}
              </motion.span>
            );
          })}
        </p>

        <AnimatePresence initial={false}>
          {explained.length ? (
            <motion.ul
              key={stage === 2 ? "one" : "all"}
              initial={still ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 space-y-2.5"
            >
              {explained.map((span) => (
                <li key={span.first} className="border-ink/20 border-l-2 pl-3">
                  <p className="label text-ink-faint mb-1">
                    {DIFFICULTY[span.difficulty]}
                  </p>
                  <p className="text-[0.9375rem]">
                    <span className="text-pink-text line-through">
                      {alteredWords(puzzle, span)}
                    </span>{" "}
                    <span className="text-teal-text font-semibold">
                      {span.original}
                    </span>
                  </p>
                  <p className="text-ink-soft mt-0.5 text-[0.875rem]">
                    {span.why}
                  </p>
                </li>
              ))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>

      {stage >= 4 ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <p className="label text-ink-faint mb-2">
            {errors} planted errors across {pool.length}
            &nbsp;real paragraphs. Try another. Today&rsquo;s hunt is not in
            here.
          </p>
          <div className="flex flex-wrap gap-2">
            {pool.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPicked({ stage, id: option.id })}
                className={`tap rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                  option.id === puzzle.id
                    ? "border-ink bg-paper-sunk font-semibold"
                    : "border-ink/25 hover:border-ink"
                }`}
              >
                {option.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        The opening of{" "}
        <a
          className="underline"
          href={
            puzzle.revision
              ? `${puzzle.url}?oldid=${puzzle.revision}`
              : puzzle.url
          }
          target="_blank"
          rel="noreferrer noopener"
        >
          {puzzle.title} on {data.source.name}
        </a>
        {puzzle.revision ? `, revision ${puzzle.revision}` : ""},{" "}
        {data.source.licence}. Every alteration was checked against that exact
        revision before this figure shipped.
      </figcaption>
    </figure>
  );
}
