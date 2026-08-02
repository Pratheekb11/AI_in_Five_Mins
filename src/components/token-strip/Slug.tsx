"use client";

import { type Ink, inkClasses } from "@/lib/ink";

/**
 * A single piece of letterpress type.
 *
 * This is the atom the whole site is built from. A slug is a token in lesson 3,
 * a point on the star chart in lesson 4, a node in the attention wiring in
 * lesson 5, a bar in lesson 6 and a shelved message in lesson 8 — always the
 * same object, wearing a different job. Keeping it literally the same component
 * is the pedagogical claim: the learner watches one thing become each concept.
 */

export type SlugSize = "sm" | "md" | "lg";

const sizeClasses: Record<SlugSize, string> = {
  sm: "px-1.5 py-0.5 text-[0.8125rem]",
  md: "px-2 py-1 text-[0.9375rem]",
  lg: "px-2.5 py-1.5 text-base",
};

export type SlugProps = {
  /** The raw text this slug covers. Whitespace is made visible, not trimmed. */
  text: string;
  ink: Ink;
  size?: SlugSize;
  /** Shown small and tucked under the text — a token id, an index, a score. */
  caption?: string;
  /** 0–1. Fades the fill so a strip can carry a weight without changing hue. */
  weight?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  title?: string;
};

const WHITESPACE_MARKS: Record<string, string> = {
  " ": "·",
  "\n": "¶",
  "\t": "→",
};

/**
 * Whitespace has to be visible or tokenization looks like it silently loses
 * characters — a leading space really is part of the token. The replacements
 * are printer's marks, in keeping with the rest of the system.
 *
 * Text is split into runs rather than per character so a token stays one node,
 * which keeps assistive tech reading words instead of spelling them out.
 */
function renderText(text: string) {
  const runs = text.match(/[ \n\t]+|[^ \n\t]+/g) ?? [];
  return runs.map((run, i) => {
    const mark = WHITESPACE_MARKS[run[0]];
    if (mark) {
      return (
        <span key={i} className="opacity-40" aria-hidden="true">
          {mark.repeat(run.length)}
        </span>
      );
    }
    return <span key={i}>{run}</span>;
  });
}

export function Slug({
  text,
  ink,
  size = "md",
  caption,
  weight,
  selected = false,
  dimmed = false,
  onClick,
  onHover,
  title,
}: SlugProps) {
  const c = inkClasses[ink];
  const interactive = Boolean(onClick);

  const style: React.CSSProperties = {};
  if (weight !== undefined) {
    // Flat fill at partial opacity rather than a lighter hue — the press only
    // has the one ink, it just lays down less of it.
    style.backgroundColor = `color-mix(in srgb, var(--${ink}) ${Math.round(
      weight * 100,
    )}%, var(--paper-raised))`;
  }

  const body = (
    <>
      <span className="font-data whitespace-pre leading-none">
        {renderText(text)}
      </span>
      {caption ? (
        // Hidden from assistive tech: read aloud, a wall of vocabulary ids
        // drowns out the tokens themselves. The full detail stays in `title`.
        <span
          className="data mt-0.5 block text-[0.5625rem] leading-none opacity-55"
          aria-hidden="true"
        >
          {caption}
        </span>
      ) : null}
    </>
  );

  const className = [
    "inline-block rounded-[2px] border text-center align-top",
    "border-ink/35",
    weight === undefined ? c.wash : "",
    sizeClasses[size],
    dimmed ? "opacity-30" : "",
    selected ? "ring-2 ring-offset-1 ring-offset-paper-raised" : "",
    selected ? c.border : "",
    interactive
      ? "misreg cursor-pointer hover:z-10 hover:border-ink"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        onFocus={() => onHover?.(true)}
        onBlur={() => onHover?.(false)}
        className={className}
        style={style}
        title={title}
        aria-pressed={selected}
      >
        {body}
      </button>
    );
  }

  return (
    <span className={className} style={style} title={title}>
      {body}
    </span>
  );
}
