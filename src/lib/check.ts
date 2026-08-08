/**
 * The shapes a post-lesson check can take.
 *
 * Three multiple-choice questions per module was the whole check for every one
 * of the fifteen lessons, and a learner told us plainly that answering them got
 * annoying. They were right, and the fault was not the questions: it was that
 * after a module built on doing something, the check asked you to sit still and
 * pick A, B or C for the fifteenth time.
 *
 * So a check is now a short sequence of *beats* of different kinds. At most one
 * of them is multiple choice. The rest ask for something with your hands,
 * sorting, pairing, flagging, filling a gap, and every one of them is judged
 * against the same measured facts the module just showed you.
 */

export type CheckBeat = ChoiceBeat | SortBeat | MatchBeat | FlagBeat | FillBeat;

type Common = {
  /** The question, in the learner's words. */
  prompt: string;
  /** Why the answer is what it is. Shown once the beat is checked. */
  because: string;
};

/** The survivor: one multiple-choice question, where one is genuinely apt. */
export type ChoiceBeat = Common & {
  kind: "choice";
  options: string[];
  /** Index into `options` as authored. Presentation order is dealt. */
  answer: number;
};

/** Items into labelled buckets. */
export type SortBeat = Common & {
  kind: "sort";
  buckets: { id: string; label: string; hint?: string }[];
  items: { id: string; text: string; bucket: string }[];
};

/** Left column pinned to right column. */
export type MatchBeat = Common & {
  kind: "match";
  /** Rendered in the order given; the right-hand options are dealt. */
  pairs: { left: string; right: string }[];
};

/** A passage where some parts are false. Tap the ones that are. */
export type FlagBeat = Common & {
  kind: "flag";
  /** How many wrong parts there are, told up front, this is not a hunt. */
  instruction: string;
  parts: { text: string; wrong?: boolean }[];
};

/** Drag the right option into each gap. */
export type FillBeat = Common & {
  kind: "fill";
  /**
   * The sentence, split up. A string is literal text; an object is a gap that
   * takes the option with that id.
   */
  segments: (string | { blank: string })[];
  options: { id: string; text: string }[];
};

/**
 * A small stable hash, so a dealt order is the same on the server, in the
 * browser, and on a reload. Lifted from the quiz, where the requirement is
 * identical and the reason is hydration.
 */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deal a list into a fixed but unguessable order.
 *
 * Deterministic rather than random on purpose. `Math.random()` during render is
 * both a hydration mismatch and a React Compiler error, and an order that moved
 * on every reload would make a learner think they had misremembered.
 */
export function dealBy<T>(items: readonly T[], key: string): T[] {
  const order = items.map((_, i) => i);
  let seed = seedOf(key) || 1;

  for (let i = order.length - 1; i > 0; i--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    const j = seed % (i + 1);
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }

  return order.map((i) => items[i]);
}
