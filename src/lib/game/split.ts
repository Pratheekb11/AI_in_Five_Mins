/**
 * The rules of The Holdout, as pure functions.
 *
 * Two models, both scored on the messages they were trained on, and both
 * scores on screen. One question: which of them does better on messages
 * neither has ever seen?
 *
 * The training score is the only thing you are given, which is the situation
 * anybody reporting a model's accuracy is quietly putting you in. Sometimes it
 * points the right way. On the two models that score a perfect hundred it
 * points exactly the wrong way, because a hundred per cent on your own
 * training set is what memorising looks like, not what learning looks like.
 *
 * Calling those right is worth extra, since going against the number in front
 * of you is the entire skill.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type Score = {
  caught: number;
  falseAlarms: number;
  missed: number;
  correct: number;
  total: number;
  accuracy: number;
};

export type SplitModel = {
  id: string;
  name: string;
  how: string;
  why: string;
  train: Score;
  test: Score;
  gap: number;
};

export type SplitData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  corpus: {
    total: number;
    spam: number;
    trainSize: number;
    testSize: number;
    split: string;
  };
  models: SplitModel[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUNDS = 6;

const BASE_POINTS = 100;
/** For picking the one whose training score looked worse, and was right. */
const AGAINST_THE_NUMBER = 80;

export type Pair = { left: SplitModel; right: SplitModel };

export function winnerOf(pair: Pair): "left" | "right" {
  return pair.left.test.accuracy >= pair.right.test.accuracy ? "left" : "right";
}

/** True when the model that wins on unseen data looked worse in training. */
export function isTrap(pair: Pair): boolean {
  const winner = winnerOf(pair);
  const won = pair[winner];
  const lost = pair[winner === "left" ? "right" : "left"];
  return won.train.accuracy < lost.train.accuracy;
}

export function pointsFor(pair: Pair, called: "left" | "right"): number {
  if (called !== winnerOf(pair)) return 0;
  return BASE_POINTS + (isTrap(pair) ? AGAINST_THE_NUMBER : 0);
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
 * Deals pairs by walking a shuffled pool two at a time, so no model turns up
 * twice in one round and gets two different verdicts attached to it.
 */
export function deal(data: SplitData, rolls: number[]): Pair[] {
  const pool = shuffledBy(data.models, rolls);
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < pool.length && pairs.length < ROUNDS; i += 2) {
    if (pool[i].test.accuracy === pool[i + 1].test.accuracy) continue;
    pairs.push({ left: pool[i], right: pool[i + 1] });
  }
  return pairs;
}

/* ----------------------------------------------------------------- scene -- */

export type SplitScene = {
  pairs: Pair[];
  at: number;
  called: "left" | "right" | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): SplitScene {
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

export function start(data: SplitData, rolls: number[]): SplitScene {
  return { ...newScene(), pairs: deal(data, rolls) };
}

export function current(scene: SplitScene): Pair | undefined {
  return scene.pairs[scene.at];
}

export function call(scene: SplitScene, called: "left" | "right"): SplitScene {
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

export function next(scene: SplitScene): SplitScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.pairs.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
