/**
 * The rules of Pushback, as pure functions.
 */

/* ------------------------------------------------------------------ types -- */

export type PushStyle = "neutral" | "leading" | "insistent" | "corrected";

export type Side = { probability: number; rank: number };

export type Phrasing = {
  id: string;
  style: PushStyle;
  prompt: string;
  right: Side;
  wrong: Side;
  topText: string;
  /** The words it actually produces, greedily decoded. Optional so a data
   *  file built before this existed still reads. */
  says?: string;
};

export type PushRound = {
  id: string;
  subject: string;
  right: string;
  wrong: string;
  fact: string;
  citation: { title: string; url: string; revision: number | null };
  phrasings: Phrasing[];
  cavedTimes: number | null;
};

export type PushData = {
  model: {
    id: string;
    name: string;
    url: string;
    licence: string;
    note: string;
  };
  literature: { title: string; authors: string; url: string; note: string };
  styles: Record<PushStyle, string>;
  medianCavedTimes: number | null;
  rounds: PushRound[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUND_SIZE = 4;
const BASE_POINTS = 120;
const SWING_POINTS = 100;

/** What the player is asked to predict. */
export type Guess = "holds" | "flips";

export const GUESSES: Record<Guess, { label: string; blurb: string }> = {
  holds: {
    label: "It holds its answer",
    blurb: "The true answer stays ahead despite what was said before it.",
  },
  flips: {
    label: "It goes with what it was told",
    blurb: "The asserted answer comes out on top, true or not.",
  },
};

export function phrasingOf(
  round: PushRound,
  style: PushStyle,
): Phrasing | undefined {
  return round.phrasings.find((p) => p.style === style);
}

/** The honest outcome: did the false answer end up ahead of the true one? */
export function outcomeOf(round: PushRound): Guess {
  const insistent = phrasingOf(round, "insistent");
  if (!insistent) return "holds";
  return insistent.wrong.probability > insistent.right.probability
    ? "flips"
    : "holds";
}

export function swingOf(round: PushRound): number {
  const insistent = phrasingOf(round, "insistent");
  const corrected = phrasingOf(round, "corrected");
  if (!insistent || !corrected) return 0;
  return corrected.right.probability - insistent.right.probability;
}

export function pointsFor(round: PushRound, guess: Guess): number {
  if (guess !== outcomeOf(round)) return 0;
  return BASE_POINTS + Math.round(Math.abs(swingOf(round)) * SWING_POINTS);
}

export function shuffledBy<T>(items: readonly T[], rolls: number[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor((rolls[i] ?? 0) * (i + 1)));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/* ----------------------------------------------------------------- scene -- */

export type PushScene = {
  rounds: PushRound[];
  at: number;
  guessed: Guess | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): PushScene {
  return {
    rounds: [],
    at: 0,
    guessed: null,
    score: 0,
    right: 0,
    streak: 0,
    bestStreak: 0,
    done: false,
  };
}

export function start(data: PushData, rolls: number[]): PushScene {
  return {
    ...newScene(),
    rounds: shuffledBy(data.rounds, rolls).slice(0, ROUND_SIZE),
  };
}

export function current(scene: PushScene): PushRound | undefined {
  return scene.rounds[scene.at];
}

export function guess(scene: PushScene, choice: Guess): PushScene {
  const round = current(scene);
  if (!round || scene.done || scene.guessed !== null) return scene;

  const ok = choice === outcomeOf(round);
  const streak = ok ? scene.streak + 1 : 0;

  return {
    ...scene,
    guessed: choice,
    score: scene.score + pointsFor(round, choice),
    right: scene.right + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: PushScene): PushScene {
  if (scene.guessed === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, guessed: null };
}
