"use client";

import { type Ink, inkClasses } from "@/lib/ink";

/**
 * A single piece of letterpress type.
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
  /** Shown small and tucked under the text, a token id, an index, a score. */
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
 * characters, a leading space really is part of the token. The replacements
 * are printer's marks, in keeping with the rest of the system.
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
    // Flat fill at partial strength rather than a lighter hue, the press only
    // has the one ink, it just lays down less of it.
    //
    // The fill is capped well short of solid: at full strength the darkest inks
    // drop `--ink` text to about 2.4:1, which is the slug erasing its own
    // label. The ceiling is the worst passing case across all four inks in both
    // themes, so weight is always readable rather than sometimes readable. The
    // range that gets lost is made up by the border, which thickens with
    // weight, two channels for one quantity, which also survives greyscale.
    const clamped = Math.min(Math.max(weight, 0), 1);
    style.backgroundColor = `color-mix(in srgb, var(--${ink}) calc(${clamped} * var(--weight-ceiling) * 100%), var(--paper-raised))`;
    style.borderColor = `var(--${ink})`;
    style.borderWidth = clamped > 0.55 ? "2px" : "1px";
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
    interactive ? "misreg cursor-pointer hover:z-10 hover:border-ink" : "",
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
