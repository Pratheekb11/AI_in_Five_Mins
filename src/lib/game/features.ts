/**
 * The rules of The Feature Bench, as pure functions.
 *
 * Two candidate features, one question: which of these tells you more about
 * whether a message is spam? Commit, then the corpus answers.
 *
 * "Tells you more" is not a matter of taste here. It is information gain, in
 * bits, measured on the 4,459 training messages: how much of the uncertainty
 * about the label disappears once you know the answer to that one yes-or-no
 * question. A feature that fires on everything tells you nothing, and so does
 * one that fires on nothing.
 *
 * The pairs are dealt from the pool rather than scripted, so the round is
 * different every time, and the interesting ones are interesting because of
 * what the data says and not because they were arranged. "Uses the word free"
 * loses to "longer than 120 characters", which is the sort of result that only
 * lands if the learner has already put money on the answer.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type FeatureMeasure = {
  fires: number;
  firesSpam: number;
  quiet: number;
  quietSpam: number;
  purity: number;
  leftoverRate: number;
  recall: number;
  gain: number;
};

export type Feature = {
  id: string;
  label: string;
  plain: string;
  train: FeatureMeasure;
  test: FeatureMeasure;
  aloneAccuracy: number;
};

export type FeatureData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  corpus: {
    total: number;
    spam: number;
    ham: number;
    trainSize: number;
    testSize: number;
    split: string;
    baseEntropy: number;
  };
  features: Feature[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUNDS = 6;

const BASE_POINTS = 100;
/** Calling a close one right is worth more than calling an obvious one. */
const CLOSE_BONUS = 60;
/** Two features within this many bits count as a close call. */
const CLOSE_BITS = 0.06;

export type Pair = { left: Feature; right: Feature };

export function winnerOf(pair: Pair): "left" | "right" {
  return pair.left.train.gain >= pair.right.train.gain ? "left" : "right";
}

export function isClose(pair: Pair): boolean {
  return Math.abs(pair.left.train.gain - pair.right.train.gain) < CLOSE_BITS;
}

export function pointsFor(pair: Pair, called: "left" | "right"): number {
  if (called !== winnerOf(pair)) return 0;
  return BASE_POINTS + (isClose(pair) ? CLOSE_BONUS : 0);
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

/**
 * Deals pairs by walking a shuffled pool two at a time.
 *
 * Pairing neighbours in a shuffled list rather than picking at random keeps
 * every feature to at most one appearance per round, so nobody is asked about
 * the same feature twice and then told two different things about it.
 */
export function deal(data: FeatureData, rolls: number[]): Pair[] {
  const pool = shuffledBy(data.features, rolls);
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < pool.length && pairs.length < ROUNDS; i += 2) {
    if (pool[i].train.gain === pool[i + 1].train.gain) continue;
    pairs.push({ left: pool[i], right: pool[i + 1] });
  }
  return pairs;
}

/* ----------------------------------------------------------------- scene -- */

export type FeatureScene = {
  pairs: Pair[];
  at: number;
  called: "left" | "right" | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): FeatureScene {
  return {
    pairs: [],
    at: 0,
    called: null,
    score: 0,
    right: 0,
    streak: 0,
    bestStreak: 0,
    done: false,
  };
}

export function start(data: FeatureData, rolls: number[]): FeatureScene {
  return { ...newScene(), pairs: deal(data, rolls) };
}

export function current(scene: FeatureScene): Pair | undefined {
  return scene.pairs[scene.at];
}

export function call(
  scene: FeatureScene,
  called: "left" | "right",
): FeatureScene {
  const pair = current(scene);
  if (!pair || scene.done || scene.called !== null) return scene;

  const ok = called === winnerOf(pair);
  const streak = ok ? scene.streak + 1 : 0;

  return {
    ...scene,
    called,
    score: scene.score + pointsFor(pair, called),
    right: scene.right + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: FeatureScene): FeatureScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.pairs.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
