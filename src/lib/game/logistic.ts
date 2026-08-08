/**
 * The rules of Read the Score, as pure functions.
 *
 * A real held-out message, its two features, and one question: what does the
 * model think the chances are? Not spam or not spam, a number.
 *
 * The bands are wide on purpose. Nobody can name a probability to the decimal
 * from two features, and asking them to would be a game about arithmetic. What
 * a person can learn to do, and what this drills, is to look at a message and
 * say whether the model will be nearly sure, roughly torn, or nearly sure the
 * other way. That is the skill that stops somebody reading a 55% as a verdict.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type Snapshot = {
  step: number;
  bias: number;
  length: number;
  digits: number;
  trainLoss: number;
  trainAccuracy: number;
  testAccuracy: number;
};

export type LogisticRound = {
  index: number;
  target: number;
  text: string;
  length: number;
  digits: number;
  spam: number;
  probability: number;
};

export type LogisticData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  model: {
    name: string;
    features: string[];
    steps: number;
    learningRate: number;
    note: string;
  };
  scaling: {
    length: { mean: number; sd: number };
    digits: { mean: number; sd: number };
    note: string;
  };
  corpus: {
    total: number;
    trainSize: number;
    testSize: number;
    spamInTest: number;
  };
  snapshots: Snapshot[];
  final: {
    bias: number;
    length: number;
    digits: number;
    trainAccuracy: number;
    testAccuracy: number;
  };
  /** [length, digits, spam, probability] for every held-out message. */
  points: [number, number, number, number][];
  rounds: LogisticRound[];
};

/* ------------------------------------------------------------------ rules -- */

export const BANDS = [
  {
    id: "no",
    label: "Almost certainly not",
    means: "under one in ten",
    max: 0.1,
  },
  {
    id: "lean-no",
    label: "Probably not",
    means: "one in ten to four in ten",
    max: 0.4,
  },
  {
    id: "torn",
    label: "Genuinely torn",
    means: "four to six in ten",
    max: 0.6,
  },
  {
    id: "lean-yes",
    label: "Probably spam",
    means: "six to nine in ten",
    max: 0.9,
  },
  {
    id: "yes",
    label: "Almost certainly spam",
    means: "over nine in ten",
    max: 1.01,
  },
] as const;

export type BandId = (typeof BANDS)[number]["id"];

export const ROUNDS = 6;

const BASE_POINTS = 100;
/** For the bands either side of the right one. Close is worth something. */
const NEAR_POINTS = 40;

export function bandOf(probability: number): BandId {
  for (const band of BANDS) {
    if (probability < band.max) return band.id;
  }
  return "yes";
}

export function pointsFor(round: LogisticRound, called: BandId): number {
  const truth = bandOf(round.probability);
  if (called === truth) return BASE_POINTS;
  const gap = Math.abs(
    BANDS.findIndex((b) => b.id === called) -
      BANDS.findIndex((b) => b.id === truth),
  );
  return gap === 1 ? NEAR_POINTS : 0;
}

/** The model's own arithmetic, so the figure and the game cannot disagree. */
export function scoreOf(
  data: LogisticData,
  weights: { bias: number; length: number; digits: number },
  length: number,
  digits: number,
): number {
  const x = (length - data.scaling.length.mean) / data.scaling.length.sd;
  const y = (digits - data.scaling.digits.mean) / data.scaling.digits.sd;
  const z = weights.bias + weights.length * x + weights.digits * y;
  return 1 / (1 + Math.exp(-z));
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

export function deal(data: LogisticData, rolls: number[]): LogisticRound[] {
  return shuffledBy(data.rounds, rolls).slice(0, ROUNDS);
}

/* ----------------------------------------------------------------- scene -- */

export type LogisticScene = {
  rounds: LogisticRound[];
  at: number;
  called: BandId | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): LogisticScene {
  return {
    rounds: [],
    at: 0,
    called: null,
    score: 0,
    right: 0,
    streak: 0,
    bestStreak: 0,
    done: false,
  };
}

export function start(data: LogisticData, rolls: number[]): LogisticScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: LogisticScene): LogisticRound | undefined {
  return scene.rounds[scene.at];
}

export function call(scene: LogisticScene, called: BandId): LogisticScene {
  const round = current(scene);
  if (!round || scene.done || scene.called !== null) return scene;

  const points = pointsFor(round, called);
  const exact = points === BASE_POINTS;
  const streak = exact ? scene.streak + 1 : 0;

  return {
    ...scene,
    called,
    score: scene.score + points,
    right: scene.right + (exact ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: LogisticScene): LogisticScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
