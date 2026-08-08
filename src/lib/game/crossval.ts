/**
 * The rules of One Fold or Ten, as pure functions.
 *
 * Two models, and the evidence a report usually gives you: what each of them
 * scored on one held-out slice of the data. Which is the better model?
 *
 * On most pairs the slice tells the truth. On the close ones it does not, and
 * the ones where it does not were found by measurement rather than written: the
 * build script checks every pair on every fold and records which folds point
 * the wrong way. Backing the model that lost on the fold in front of you, and
 * being right, is the skill this module is about.
 *
 * PURITY. The fold shown in each round is chosen by the caller and passed in.
 */

/* ------------------------------------------------------------------ types -- */

export type Fold = {
  fold: number;
  trainSize: number;
  testSize: number;
  accuracy: number;
};

export type CvModel = {
  id: string;
  name: string;
  how: string;
  folds: Fold[];
  mean: number;
  sd: number;
  worstFold: number;
  bestFold: number;
};

export type CvPair = {
  id: string;
  left: string;
  right: string;
  truth: string;
  gap: number;
  misleadingFolds: number[];
  folds: { fold: number; left: number; right: number }[];
};

export type CrossvalData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  corpus: {
    total: number;
    spam: number;
    folds: number;
    blockSize: number;
    note: string;
  };
  models: CvModel[];
  pairs: CvPair[];
};

/* ------------------------------------------------------------------ rules -- */

export const ROUNDS = 5;

const BASE_POINTS = 100;
/** For backing the model that lost on the fold you were shown. */
const AGAINST_THE_FOLD = 100;

/** Pairs close enough that one fold is genuinely poor evidence. */
export function closePairs(data: CrossvalData): CvPair[] {
  return data.pairs.filter((p) => p.misleadingFolds.length > 0);
}

export function modelOf(data: CrossvalData, id: string): CvModel {
  const found = data.models.find((m) => m.id === id);
  if (!found) throw new Error(`no model ${id}`);
  return found;
}

export type Round = { pair: CvPair; fold: number };

/** True when the fold on screen disagrees with all ten together. */
export function isMisleading(round: Round): boolean {
  return round.pair.misleadingFolds.includes(round.fold);
}

export function pointsFor(round: Round, called: string): number {
  if (called !== round.pair.truth) return 0;
  return BASE_POINTS + (isMisleading(round) ? AGAINST_THE_FOLD : 0);
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
 * Deals rounds, and makes sure a fair share of them are the misleading ones.
 *
 * Dealing folds uniformly would make the interesting case turn up about twice
 * in ten rounds, which is too rare to teach anything. Every other round is
 * therefore drawn from the folds that point the wrong way, and the module says
 * so out loud rather than letting the player conclude that single folds lie
 * most of the time. They do not. They lie often enough to matter.
 */
export function deal(data: CrossvalData, rolls: number[]): Round[] {
  const pool = shuffledBy(closePairs(data), rolls);
  const rounds: Round[] = [];

  pool.forEach((pair, i) => {
    if (rounds.length >= ROUNDS) return;
    const roll = rolls[(i * 7) % rolls.length] ?? 0;

    if (i % 2 === 0 && pair.misleadingFolds.length > 0) {
      const at = Math.min(
        pair.misleadingFolds.length - 1,
        Math.floor(roll * pair.misleadingFolds.length),
      );
      rounds.push({ pair, fold: pair.misleadingFolds[at] });
      return;
    }

    const honest = pair.folds
      .map((f) => f.fold)
      .filter((f) => !pair.misleadingFolds.includes(f));
    const at = Math.min(
      honest.length - 1,
      Math.floor(roll * Math.max(1, honest.length)),
    );
    rounds.push({ pair, fold: honest[at] ?? pair.folds[0].fold });
  });

  return rounds;
}

/* ----------------------------------------------------------------- scene -- */

export type CvScene = {
  rounds: Round[];
  at: number;
  called: string | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): CvScene {
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

export function start(data: CrossvalData, rolls: number[]): CvScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: CvScene): Round | undefined {
  return scene.rounds[scene.at];
}

export function call(scene: CvScene, called: string): CvScene {
  const round = current(scene);
  if (!round || scene.done || scene.called !== null) return scene;

  const ok = called === round.pair.truth;
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

export function next(scene: CvScene): CvScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
