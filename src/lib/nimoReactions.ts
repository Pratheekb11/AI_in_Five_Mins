/**
 * What Nimo says, and when. Edit this file to change his voice; nothing else
 * needs to change.
 *
 * Four to eight words. Dry. No exclamation marks, no encouragement that was
 * not earned by something the reader actually just did.
 */
export type NimoEvent = "beatModel" | "fooled" | "streak" | "chapterUnlock";

export const NIMO_LINES: Record<NimoEvent, string[]> = {
  /** The reader was right and the model, confidently, was not. */
  beatModel: [
    "It was confident. You were right.",
    "The model missed that one badly.",
    "That upset was not luck.",
    "You caught it being sure and wrong.",
    "It sounded certain. It was not right.",
  ],
  /** The reader believed the fluent, wrong answer. */
  fooled: [
    "It sounded right. It was not.",
    "Fluent and wrong, same as always.",
    "That is the whole trap, right there.",
    "Confidence is not the same as true.",
    "Smooth sentence. Wrong word.",
  ],
  /** A run of correct calls inside one game. */
  streak: [
    "Three in a row. Noted.",
    "You are reading it well today.",
    "A streak. Do not trust it either.",
    "Keep going. Still check your work.",
  ],
  /** A track or chapter becomes reachable. */
  chapterUnlock: [
    "New ground, if you want it.",
    "One chapter down. More underneath.",
    "That path is open now.",
    "Unlocked. No rush to start it.",
  ],
};

/** Deterministic when a seed is given, random otherwise. */
export function pickNimoLine(event: NimoEvent, seed = Math.random()): string {
  const lines = NIMO_LINES[event];
  const i = Math.min(lines.length - 1, Math.floor(seed * lines.length));
  return lines[i] ?? lines[0];
}
