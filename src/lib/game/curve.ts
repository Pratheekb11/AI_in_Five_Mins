/**
 * The rules of Buy the Upgrade, as pure functions.
 */

/* ------------------------------------------------------------------ types -- */

export type CurvePoint = {
  size: number;
  accuracy: number;
  spread: number;
  draws: number;
};

export type Curve = {
  id: string;
  name: string;
  how: string;
  points: CurvePoint[];
  atSmallest: number;
  atLargest: number;
};

export type CurveRound = {
  id: string;
  size: number;
  startModel: string;
  startAccuracy: number;
  moreData: { size: number; times: number; accuracy: number; gain: number };
  betterModel: { id: string; name: string; accuracy: number; gain: number };
};

export type CurveData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  corpus: { total: number; trainSize: number; testSize: number };
  note: string;
  sizes: number[];
  repeats: number;
  curves: Curve[];
  rounds: CurveRound[];
};

/* ------------------------------------------------------------------ rules -- */

export type Buy = "data" | "model";

export const ROUNDS = 4;

const BASE_POINTS = 100;
/** When the two are within this, either answer is defensible and both pay. */
const TIE = 0.002;

export function truthOf(round: CurveRound): Buy | "either" {
  const gap = round.moreData.gain - round.betterModel.gain;
  if (Math.abs(gap) < TIE) return "either";
  return gap > 0 ? "data" : "model";
}

export function pointsFor(round: CurveRound, called: Buy): number {
  const truth = truthOf(round);
  if (truth === "either") return BASE_POINTS;
  return called === truth ? BASE_POINTS : 0;
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

export function deal(data: CurveData, rolls: number[]): CurveRound[] {
  return shuffledBy(data.rounds, rolls).slice(0, ROUNDS);
}

export function curveOf(data: CurveData, id: string): Curve {
  const found = data.curves.find((c) => c.id === id);
  if (!found) throw new Error(`no curve ${id}`);
  return found;
}

/* ----------------------------------------------------------------- scene -- */

export type CurveScene = {
  rounds: CurveRound[];
  at: number;
  called: Buy | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): CurveScene {
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

export function start(data: CurveData, rolls: number[]): CurveScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: CurveScene): CurveRound | undefined {
  return scene.rounds[scene.at];
}

export function call(scene: CurveScene, called: Buy): CurveScene {
  const round = current(scene);
  if (!round || scene.done || scene.called !== null) return scene;

  const points = pointsFor(round, called);
  const ok = points > 0;
  const streak = ok ? scene.streak + 1 : 0;

  return {
    ...scene,
    called,
    score: scene.score + points,
    right: scene.right + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: CurveScene): CurveScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
