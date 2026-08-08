/**
 * The rules of Odd One In, as pure functions.
 *
 * Six words that the algorithm put in one group, and four candidates. Which of
 * the four did it also put there?
 *
 * Nobody told it what any of these words mean. The groups fell out of counting
 * which words appear near which other words, so a player who gets this right is
 * reading a pattern in the geometry rather than recalling a category anybody
 * defined. Some rounds are obvious, because some clusters really are months or
 * colours. Some are not, and those are the honest ones.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type Cluster = { id: number; size: number; nearest: string[] };

export type ClusterRound = {
  cluster: number;
  shows: string[];
  answer: string;
  options: string[];
};

export type ClusterData = {
  generatedBy: string;
  source: { name: string; trainedOn: string; url: string; licence: string };
  note: string;
  dims: number;
  words: string[];
  points: [number, number][];
  k: number;
  iterations: number;
  settled: boolean;
  /** Which cluster each word was in, at each pass. */
  history: number[][];
  assignment: number[];
  clusters: Cluster[];
  sweep: { k: number; inertia: number }[];
  rounds: ClusterRound[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUNDS = 5;

const BASE_POINTS = 100;

export function pointsFor(round: ClusterRound, called: string): number {
  return called === round.answer ? BASE_POINTS : 0;
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

export function deal(data: ClusterData, rolls: number[]): ClusterRound[] {
  return shuffledBy(data.rounds, rolls)
    .slice(0, ROUNDS)
    .map((round, i) => ({
      ...round,
      // The answer is always first in the file, so the options are dealt too.
      options: shuffledBy(round.options, rolls.slice(i + 1)),
    }));
}

/* ----------------------------------------------------------------- scene -- */

export type ClusterScene = {
  rounds: ClusterRound[];
  at: number;
  called: string | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): ClusterScene {
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

export function start(data: ClusterData, rolls: number[]): ClusterScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: ClusterScene): ClusterRound | undefined {
  return scene.rounds[scene.at];
}

export function call(scene: ClusterScene, called: string): ClusterScene {
  const round = current(scene);
  if (!round || scene.done || scene.called !== null) return scene;

  const ok = called === round.answer;
  const streak = ok ? scene.streak + 1 : 0;

  return {
    ...scene,
    called,
    score: scene.score + pointsFor(round, called),
    right: scene.right + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: ClusterScene): ClusterScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
