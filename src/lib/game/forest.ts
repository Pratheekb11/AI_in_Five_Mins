/**
 * The rules of Worth the Crowd, as pure functions.
 */

/* ------------------------------------------------------------------ types -- */

export type Forest = {
  id: string;
  name: string;
  how: string;
  depth: number;
  tryFeatures: number;
  bagged: boolean;
  trees: number;
  alone: number[];
  meanAlone: number;
  bestAlone: number;
  worstAlone: number;
  together: number;
  running: number[];
  disagreement: number;
  gain: number;
};

export type ForestExample = {
  index: number;
  text: string;
  votesForSpam: number;
  spam: number;
};

export type ForestData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  corpus: { total: number; trainSize: number; testSize: number };
  note: string;
  treesPerForest: number;
  forests: Forest[];
  examples: ForestExample[];
};

/* ------------------------------------------------------------------ rules -- */

export const CALLS = [
  {
    id: "none",
    label: "Nothing at all",
    means: "the vote lands where a single tree lands",
  },
  {
    id: "some",
    label: "A little",
    means: "under a point better",
  },
  {
    id: "lots",
    label: "A lot",
    means: "more than a point better",
  },
] as const;

export type CallId = (typeof CALLS)[number]["id"];

export const ROUNDS = 4;

const BASE_POINTS = 120;
const NEAR_POINTS = 40;

/** What the vote was actually worth, in the game's three bands. */
export function bandOf(forest: Forest): CallId {
  if (forest.gain < 0.002) return "none";
  return forest.gain < 0.01 ? "some" : "lots";
}

export function pointsFor(forest: Forest, called: CallId): number {
  const truth = bandOf(forest);
  if (called === truth) return BASE_POINTS;
  const gap = Math.abs(
    CALLS.findIndex((c) => c.id === called) -
      CALLS.findIndex((c) => c.id === truth),
  );
  return gap === 1 ? NEAR_POINTS : 0;
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

export function deal(data: ForestData, rolls: number[]): Forest[] {
  return shuffledBy(data.forests, rolls).slice(0, ROUNDS);
}

/* ----------------------------------------------------------------- scene -- */

export type ForestScene = {
  rounds: Forest[];
  at: number;
  called: CallId | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): ForestScene {
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

export function start(data: ForestData, rolls: number[]): ForestScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: ForestScene): Forest | undefined {
  return scene.rounds[scene.at];
}

export function call(scene: ForestScene, called: CallId): ForestScene {
  const forest = current(scene);
  if (!forest || scene.done || scene.called !== null) return scene;

  const points = pointsFor(forest, called);
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

export function next(scene: ForestScene): ForestScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
