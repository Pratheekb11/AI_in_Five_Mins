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
  /** Full-strength ink, as a background. */
  solid: string;
  /** Full-strength ink, as a border. */
  border: string;
  /** Contrast-corrected ink, for text on paper. */
  text: string;
  /** Text colour that sits legibly on `solid`. */
  onSolid: string;
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
    onSolid: "text-paper",
  },
  pink: {
    wash: "bg-pink-wash",
    solid: "bg-pink",
    border: "border-pink",
    text: "text-pink-text",
    onSolid: "text-paper",
  },
  yellow: {
    wash: "bg-yellow-wash",
    solid: "bg-yellow",
    border: "border-yellow",
    text: "text-yellow-text",
    onSolid: "text-[#17171f]",
  },
  teal: {
    wash: "bg-teal-wash",
    solid: "bg-teal",
    border: "border-teal",
    text: "text-teal-text",
    onSolid: "text-paper",
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
