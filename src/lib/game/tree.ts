/**
 * The rules of Grow the Tree, as pure functions.
 */

/* ------------------------------------------------------------------ types -- */

export type TreeNode = {
  size: number;
  spam: number;
  purity: number;
  says: number;
  entropy: number;
  ask?: string;
  label?: string;
  gain?: number;
  candidates?: { id: string; label: string; gain: number }[];
  yes?: TreeNode;
  no?: TreeNode;
};

export type TreeRound = {
  id: string;
  path: string[];
  size: number;
  spam: number;
  entropy: number;
  answer: string;
  candidates: { id: string; label: string; gain: number }[];
};

export type TreeData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  corpus: {
    total: number;
    trainSize: number;
    testSize: number;
    spamInTrain: number;
  };
  features: { id: string; label: string }[];
  note: string;
  tree: TreeNode;
  depths: {
    depth: number;
    leaves: number;
    trainAccuracy: number;
    testAccuracy: number;
  }[];
  best: { depth: number; testAccuracy: number };
  rounds: TreeRound[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUNDS = 5;

const BASE_POINTS = 100;
/** For picking a question worth nearly as much as the best one. */
const NEAR_POINTS = 50;
const NEAR_SHARE = 0.8;

export function pointsFor(round: TreeRound, called: string): number {
  const chosen = round.candidates.find((c) => c.id === called);
  if (!chosen) return 0;
  if (chosen.id === round.answer) return BASE_POINTS;
  const best = Math.max(...round.candidates.map((c) => c.gain));
  return chosen.gain >= best * NEAR_SHARE ? NEAR_POINTS : 0;
}

/** Walks the shipped tree to the node a round describes. */
export function nodeAt(data: TreeData, path: string[]): TreeNode {
  let node = data.tree;
  for (const step of path) {
    const next = step === "yes" ? node.yes : node.no;
    if (!next) return node;
    node = next;
  }
  return node;
}

/** Every node at a given depth, left to right, for drawing a level at a time. */
export function levelOf(node: TreeNode, depth: number): TreeNode[] {
  if (depth === 0) return [node];
  if (!node.ask || !node.yes || !node.no) return [];
  return [...levelOf(node.yes, depth - 1), ...levelOf(node.no, depth - 1)];
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

export function deal(data: TreeData, rolls: number[]): TreeRound[] {
  return shuffledBy(data.rounds, rolls).slice(0, ROUNDS);
}

/* ----------------------------------------------------------------- scene -- */

export type TreeScene = {
  rounds: TreeRound[];
  at: number;
  called: string | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): TreeScene {
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

export function start(data: TreeData, rolls: number[]): TreeScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: TreeScene): TreeRound | undefined {
  return scene.rounds[scene.at];
}

export function call(scene: TreeScene, called: string): TreeScene {
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

export function next(scene: TreeScene): TreeScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
