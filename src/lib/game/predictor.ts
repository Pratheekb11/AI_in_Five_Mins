/**
 * The rules of Beat the Predictor, as pure functions.
 */

/* ------------------------------------------------------------------ types -- */

export type Option = { text: string; probability: number };

export type PredictorRound = {
  id: string;
  kind: "phrase" | "corpus" | "fact";
  prefix: string;
  options: Option[];
  /** Index of the true continuation. */
  truth: number;
  /** Index the model would take, its highest-probability option. */
  modelPick: number;
  /** Where the truth sat in the model's whole 50,257-token ranking. */
  answerRank: number;
  because: string;
  /** Fact rounds only. */
  fact?: string;
  citation?: { title: string; url: string; revision: number | null };
  trapped?: boolean;
};

export type PredictorData = {
  model: {
    id: string;
    name: string;
    url: string;
    licence: string;
    note: string;
  };
  corpus: { name: string; author: string; url: string; licence: string };
  optionCount: number;
  measuredSentences: number;
  rounds: PredictorRound[];
};

/* ------------------------------------------------------------------ rules -- */

/** Rounds per act. Three acts, nine rounds, well under five minutes. */
/*
  The acts, and how many rounds each one gets.
*/
export const ACT_SIZE = { phrase: 1, corpus: 1, fact: 2 } as const;
export const ROUND_SIZE = ACT_SIZE.phrase + ACT_SIZE.corpus + ACT_SIZE.fact;

const BASE_POINTS = 100;
/** Beating the machine on a round it was confident about is worth more. */
const UPSET_POINTS = 150;

export type Scored = {
  you: boolean;
  model: boolean;
  /** You were right and it was wrong. */
  upset: boolean;
};

export function scoreOf(round: PredictorRound, picked: number): Scored {
  const you = picked === round.truth;
  const model = round.modelPick === round.truth;
  return { you, model, upset: you && !model };
}

export function pointsFor(round: PredictorRound, picked: number): number {
  const { you, upset } = scoreOf(round, picked);
  if (!you) return 0;
  if (!upset) return BASE_POINTS;
  // The more sure the machine was of its wrong answer, the better the upset.
  const confidence = round.options[round.modelPick].probability;
  return UPSET_POINTS + Math.round(confidence * 200);
}

/* ----------------------------------------------------------------- scene -- */

export type PredictorScene = {
  rounds: PredictorRound[];
  at: number;
  /** Null until you commit. */
  picked: number | null;
  score: number;
  youRight: number;
  modelRight: number;
  upsets: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): PredictorScene {
  return {
    rounds: [],
    at: 0,
    picked: null,
    score: 0,
    youRight: 0,
    modelRight: 0,
    upsets: 0,
    streak: 0,
    bestStreak: 0,
    done: false,
  };
}

/**
 * Ends the set where the player is standing.
 */
export function finish(scene: PredictorScene): PredictorScene {
  return scene.done ? scene : { ...scene, done: true };
}

/** A shuffled copy, from one roll per position in [0, 1). */
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
 * Deals a round: three of each act, in act order.
 *
 * If an act is short of material the round is shorter rather than padded from
 * a neighbouring act, the three-act shape is the teaching, so a round that
 * cannot hold it should be visibly wrong rather than quietly reshuffled.
 */
export function deal(data: PredictorData, rolls: number[]): PredictorRound[] {
  const take = (kind: PredictorRound["kind"], n: number, offset: number) =>
    shuffledBy(
      data.rounds.filter((r) => r.kind === kind),
      rolls.slice(offset),
    ).slice(0, n);

  return [
    ...take("phrase", ACT_SIZE.phrase, 0),
    ...take("corpus", ACT_SIZE.corpus, 40),
    ...take("fact", ACT_SIZE.fact, 80),
  ];
}

export function start(data: PredictorData, rolls: number[]): PredictorScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: PredictorScene): PredictorRound | undefined {
  return scene.rounds[scene.at];
}

export function pick(scene: PredictorScene, choice: number): PredictorScene {
  const round = current(scene);
  if (!round || scene.done || scene.picked !== null) return scene;
  if (choice < 0 || choice >= round.options.length) return scene;

  const { you, model, upset } = scoreOf(round, choice);
  const streak = you ? scene.streak + 1 : 0;

  return {
    ...scene,
    picked: choice,
    score: scene.score + pointsFor(round, choice),
    youRight: scene.youRight + (you ? 1 : 0),
    modelRight: scene.modelRight + (model ? 1 : 0),
    upsets: scene.upsets + (upset ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: PredictorScene): PredictorScene {
  if (scene.picked === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, picked: null };
}

/** Which act a round index falls in, for the label above the board. */
export function actOf(index: number): {
  kind: PredictorRound["kind"];
  name: string;
} {
  if (index < ACT_SIZE.phrase) {
    return { kind: "phrase", name: "Act one · ordinary sentences" };
  }
  if (index < ACT_SIZE.phrase + ACT_SIZE.corpus) {
    return { kind: "corpus", name: "Act two · a real book" };
  }
  return { kind: "fact", name: "Act three · things that are true" };
}
