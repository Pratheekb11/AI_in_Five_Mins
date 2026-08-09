/**
 * The rules of Show, Don't Ask, as pure functions.
 */

/* ------------------------------------------------------------------ types -- */

export type Style = "bare" | "request" | "role" | "pattern";

export type Variant = {
  id: string;
  style: Style;
  prompt: string;
  probability: number;
  rank: number;
  topText: string;
  /** The words it actually produces, greedily decoded. Optional so a data
   *  file built before this existed still reads. */
  says?: string;
};

export type ListenRound = {
  id: string;
  goal: string;
  target: string;
  variants: Variant[];
  best: string;
  bestStyle: Style;
};

export type ListenData = {
  model: {
    id: string;
    name: string;
    url: string;
    licence: string;
    note: string;
  };
  styles: Record<Style, string>;
  summary: {
    style: Style;
    label: string;
    medianTimesBare: number;
    wins: number;
  }[];
  rounds: ListenRound[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUND_SIZE = 5;
const BASE_POINTS = 120;
/** Picking the winner when it is a long way ahead is the easy case. */
const MARGIN_POINTS = 120;

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

/** The bare phrasing, which every other one is measured against. */
export function bareOf(round: ListenRound): Variant | undefined {
  return round.variants.find((v) => v.style === "bare");
}

/** How many times better than just asking, or null when there is no baseline. */
export function timesBare(round: ListenRound, variant: Variant): number | null {
  const bare = bareOf(round);
  if (!bare || bare.probability <= 0) return null;
  return variant.probability / bare.probability;
}

export function winnerOf(round: ListenRound): Variant {
  return round.variants.reduce((a, b) =>
    b.probability > a.probability ? b : a,
  );
}

export function pointsFor(round: ListenRound, picked: string): number {
  const winner = winnerOf(round);
  if (picked !== winner.id) return 0;
  const others = round.variants.filter((v) => v.id !== winner.id);
  const runnerUp = others.reduce(
    (a, b) => (b.probability > a.probability ? b : a),
    others[0],
  );
  // A close call is worth more than an obvious one.
  const close =
    runnerUp && winner.probability > 0
      ? runnerUp.probability / winner.probability
      : 0;
  return BASE_POINTS + Math.round(close * MARGIN_POINTS);
}

/* ----------------------------------------------------------------- scene -- */

export type ListenScene = {
  rounds: ListenRound[];
  /** The order the phrasings are shown in, per round, so it is not learnable. */
  layout: string[][];
  at: number;
  picked: string | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): ListenScene {
  return {
    rounds: [],
    layout: [],
    at: 0,
    picked: null,
    score: 0,
    right: 0,
    streak: 0,
    bestStreak: 0,
    done: false,
  };
}

export function start(data: ListenData, rolls: number[]): ListenScene {
  const rounds = shuffledBy(data.rounds, rolls).slice(0, ROUND_SIZE);
  return {
    ...newScene(),
    rounds,
    layout: rounds.map((round, i) =>
      shuffledBy(
        round.variants.map((v) => v.id),
        rolls.slice(20 + i * 10),
      ),
    ),
  };
}

export function current(scene: ListenScene): ListenRound | undefined {
  return scene.rounds[scene.at];
}

/** The phrasings in the order this round shows them. */
export function shownVariants(scene: ListenScene): Variant[] {
  const round = current(scene);
  if (!round) return [];
  const order = scene.layout[scene.at] ?? round.variants.map((v) => v.id);
  return order
    .map((id) => round.variants.find((v) => v.id === id))
    .filter((v): v is Variant => Boolean(v));
}

export function pick(scene: ListenScene, id: string): ListenScene {
  const round = current(scene);
  if (!round || scene.done || scene.picked !== null) return scene;
  if (!round.variants.some((v) => v.id === id)) return scene;

  const ok = id === winnerOf(round).id;
  const streak = ok ? scene.streak + 1 : 0;

  return {
    ...scene,
    picked: id,
    score: scene.score + pointsFor(round, id),
    right: scene.right + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: ListenScene): ListenScene {
  if (scene.picked === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, picked: null };
}
