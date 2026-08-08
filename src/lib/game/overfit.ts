/**
 * The rules of Pick the Model, as pure functions.
 *
 * Six rounds, one question each: given these examples and nothing else, which
 * of these curves would you ship? The curves are real least-squares fits to the
 * examples on screen, and the answer is whichever one does best on everything
 * that was held back.
 *
 * What changes between rounds is not the data but how much of it there is. With
 * eight sentences even a cubic is nonsense. With a hundred and ten it costs
 * almost nothing. Nobody who has only ever seen the textbook picture expects
 * the answer to depend on the sample size, and it is the most useful thing on
 * the page.
 *
 * Scoring is by how much worse than the best available choice you did, not by
 * matching an exact degree, because at a hundred and ten examples two of the
 * choices are within a hair of each other and pretending otherwise would be
 * teaching false precision.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type Sentence = { chars: number; tokens: number; text?: string };

export type Candidate = {
  degree: number;
  coefficients: number[];
  trainError: number;
  testError: number;
};

export type OverfitRound = {
  id: string;
  trainSize: number;
  testSize: number;
  train: Sentence[];
  candidates: Candidate[];
  bestDegree: number;
  bestError: number;
};

export type OverfitData = {
  generatedBy: string;
  source: { title: string; author: string; via: string; note?: string };
  note: string;
  maxChars: number;
  trainSize: number;
  testSize: number;
  offered: number[];
  train: Sentence[];
  test: Sentence[];
  degrees: Candidate[];
  best: { degree: number; testError: number };
  worst: Candidate;
  rounds: OverfitRound[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUNDS = 4;

const BASE_POINTS = 120;
/** Within this much of the best available answer counts as getting it right. */
const CLOSE_ENOUGH = 1.05;

/** The fitted value at a given character count. */
export function predict(
  candidate: Candidate,
  chars: number,
  maxChars: number,
): number {
  const x = chars / maxChars;
  let out = 0;
  for (let i = 0; i < candidate.coefficients.length; i++) {
    out += candidate.coefficients[i] * x ** i;
  }
  return out;
}

export function pointsFor(round: OverfitRound, degree: number): number {
  const chosen = round.candidates.find((c) => c.degree === degree);
  if (!chosen) return 0;

  const best = round.bestError;
  const worst = Math.max(...round.candidates.map((c) => c.testError));

  if (chosen.testError <= best * CLOSE_ENOUGH) return BASE_POINTS;
  const room = worst - best;
  if (room <= 0) return BASE_POINTS;
  return Math.max(
    0,
    Math.round(BASE_POINTS * (1 - (chosen.testError - best) / room)),
  );
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

export function deal(data: OverfitData, rolls: number[]): OverfitRound[] {
  return shuffledBy(data.rounds, rolls).slice(0, ROUNDS);
}

/* ----------------------------------------------------------------- scene -- */

export type OverfitScene = {
  rounds: OverfitRound[];
  at: number;
  called: number | null;
  score: number;
  perfect: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): OverfitScene {
  return {
    rounds: [],
    at: 0,
    called: null,
    score: 0,
    perfect: 0,
    streak: 0,
    bestStreak: 0,
    done: false,
  };
}

export function start(data: OverfitData, rolls: number[]): OverfitScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: OverfitScene): OverfitRound | undefined {
  return scene.rounds[scene.at];
}

export function call(scene: OverfitScene, degree: number): OverfitScene {
  const round = current(scene);
  if (!round || scene.done || scene.called !== null) return scene;

  const points = pointsFor(round, degree);
  const nailed = points === BASE_POINTS;
  const streak = nailed ? scene.streak + 1 : 0;

  return {
    ...scene,
    called: degree,
    score: scene.score + points,
    perfect: scene.perfect + (nailed ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: OverfitScene): OverfitScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
