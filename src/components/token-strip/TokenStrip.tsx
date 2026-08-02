"use client";

import { cycleInk, type Ink } from "@/lib/ink";
import { Slug, type SlugSize } from "./Slug";

/**
 * A run of slugs — the site's spine element.
 *
 * Adjacent items are inked differently on purpose. The colours carry no
 * meaning here; the *boundaries* are the information, and alternating ink is
 * the cheapest way to make a boundary impossible to miss.
 */

export type StripItem = {
  text: string;
  caption?: string;
  /** Overrides the alternating ink when a specific meaning applies. */
  ink?: Ink;
  weight?: number;
  title?: string;
};

export type TokenStripProps = {
  items: StripItem[];
  size?: SlugSize;
  /** Wrap onto multiple lines, or keep one scrolling rail. */
  wrap?: boolean;
  selectedIndex?: number | null;
  dimmedIndices?: Set<number>;
  onSelect?: (index: number) => void;
  onHover?: (index: number | null) => void;
  /** Read out to screen readers in place of the individual slugs. */
  summary?: string;
  emptyMessage?: string;
};

export function TokenStrip({
  items,
  size = "md",
  wrap = true,
  selectedIndex = null,
  dimmedIndices,
  onSelect,
  onHover,
  summary,
  emptyMessage = "Nothing to show yet.",
}: TokenStripProps) {
  if (items.length === 0) {
    return (
      <p className="text-ink-faint py-6 text-center text-sm italic">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={
        wrap
          ? "flex flex-wrap items-start gap-1"
          : "rail flex items-start gap-1 pb-2"
      }
      role="group"
      aria-label={summary}
    >
      {items.map((item, i) => (
        <Slug
          key={i}
          text={item.text}
          ink={item.ink ?? cycleInk(i)}
          size={size}
          caption={item.caption}
          weight={item.weight}
          selected={selectedIndex === i}
          dimmed={dimmedIndices?.has(i)}
          title={item.title}
          onClick={onSelect ? () => onSelect(i) : undefined}
          onHover={
            onHover ? (hovering) => onHover(hovering ? i : null) : undefined
          }
        />
      ))}
    </div>
  );
}
