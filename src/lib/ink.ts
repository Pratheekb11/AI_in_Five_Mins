/**
 * The four spot inks, and the fixed meaning each one carries across every
 * lesson. Components take an `Ink` rather than a colour so that meaning stays
 * attached to the mark: a pink thing is always about where the model is
 * looking, a yellow thing is always something the learner did.
 */
export type Ink = "blue" | "pink" | "yellow" | "teal";

export const INKS: readonly Ink[] = ["blue", "pink", "yellow", "teal"] as const;

type InkClasses = {
  /** Flat tint fill, for the body of a mark. */
  wash: string;
  /** Full-strength ink, as a background. Marks only — see `chip`. */
  solid: string;
  /** Full-strength ink, as a border. */
  border: string;
  /** Contrast-corrected ink, for text on paper or on its own wash. */
  text: string;
  /**
   * A small label in this ink: tint behind, corrected ink in front. Solid ink
   * is deliberately not used behind text — only blue clears 4.5:1 against
   * paper-coloured type, so a wash-and-ink chip is the one pairing that stays
   * legible in all four colours.
   */
  chip: string;
};

/**
 * Static class strings rather than interpolated ones — Tailwind only ships
 * classes it can see written out in full.
 */
export const inkClasses: Record<Ink, InkClasses> = {
  blue: {
    wash: "bg-blue-wash",
    solid: "bg-blue",
    border: "border-blue",
    text: "text-blue-text",
    chip: "bg-blue-wash text-blue-text border-blue/40",
  },
  pink: {
    wash: "bg-pink-wash",
    solid: "bg-pink",
    border: "border-pink",
    text: "text-pink-text",
    chip: "bg-pink-wash text-pink-text border-pink/40",
  },
  yellow: {
    wash: "bg-yellow-wash",
    solid: "bg-yellow",
    border: "border-yellow",
    text: "text-yellow-text",
    chip: "bg-yellow-wash text-yellow-text border-yellow/40",
  },
  teal: {
    wash: "bg-teal-wash",
    solid: "bg-teal",
    border: "border-teal",
    text: "text-teal-text",
    chip: "bg-teal-wash text-teal-text border-teal/40",
  },
};

/** CSS custom property holding an ink, for SVG fills and inline styles. */
export function inkVar(ink: Ink): string {
  return `var(--${ink})`;
}

export function inkWashVar(ink: Ink): string {
  return `var(--${ink}-wash)`;
}

/**
 * Cycles inks by position. Used to colour adjacent tokens differently so the
 * boundaries between them are the thing you actually see.
 */
export function cycleInk(index: number): Ink {
  return INKS[index % INKS.length];
}
