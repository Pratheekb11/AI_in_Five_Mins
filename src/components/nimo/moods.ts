/**
 * Nimo's moods.
 *
 * One vocabulary shared by the 3D model and the flat printed version, so a
 * component can ask for a mood without knowing which Nimo it is going to get.
 * Every mood maps to a pose, not to a face swap, the tilt and the wings do
 * most of the work, which is what stops him reading as a sticker.
 */

export type Mood =
  | "idle"
  | "curious"
  | "cheer"
  | "wince"
  | "think"
  | "celebrate";

export type Pose = {
  /** Head tilt in degrees. */
  tilt: number;
  /** Head nod, degrees. Positive looks up. */
  nod: number;
  /** How far the wings lift, 0–1. */
  wings: number;
  /** Eyelid closure, 0 open, 1 shut. */
  lids: number;
  /** Vertical bounce amplitude in model units. */
  bounce: number;
  /** Beak open, 0–1. */
  beak: number;
};

export const POSES: Record<Mood, Pose> = {
  idle: { tilt: 0, nod: 0, wings: 0, lids: 0, bounce: 0.012, beak: 0 },
  curious: { tilt: 14, nod: 4, wings: 0.1, lids: 0, bounce: 0.014, beak: 0 },
  cheer: { tilt: 0, nod: 8, wings: 0.85, lids: 0.15, bounce: 0.05, beak: 0.7 },
  wince: { tilt: -6, nod: -12, wings: -0.2, lids: 0.72, bounce: 0.004, beak: 0 },
  think: { tilt: 9, nod: -5, wings: 0, lids: 0.35, bounce: 0.008, beak: 0 },
  celebrate: { tilt: 0, nod: 12, wings: 1, lids: 0.1, bounce: 0.08, beak: 1 },
};

/** A short line Nimo can say. Kept plain, he is a guide, not a hype man. */
export const NIMO_LINES: Record<Mood, string[]> = {
  idle: ["Ready when you are."],
  curious: ["Have a go.", "Try it and see."],
  cheer: ["That is the one.", "You saw it."],
  wince: ["Not quite.", "It caught you out."],
  think: ["Take your time.", "Working it out?"],
  celebrate: ["Best yet.", "You beat it."],
};
