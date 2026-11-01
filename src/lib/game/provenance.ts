/**
 * The rules of Provenance Detective, as pure functions.
 */

/* ------------------------------------------------------------------ types -- */

export type Verdict = "memory" | "lookup" | "tool";

/** One measurement of the four options, cold or with the source pasted in. */
export type Measured = {
  /** The right answer's share of the four. */
  probability: number;
  /** Index of the option the model rates highest. */
  pick: number;
  /** Every option's share of the four, in `options` order. */
  shares: number[];
};

export type ProvenanceRound = {
  id: string;
  kind: "memory" | "lookup";
  ask: string;
  question: string;
  answerLabel: string;
  /** Four sensible answers, the right one first. */
  options: string[];
  fact: string;
  citation: { title: string; url: string; revision: number | null };
  bare: Measured;
  sourced: Measured;
};

export type Arithmetic = {
  problems: number;
  correct: number;
  accuracy: number;
  description: string;
  examples: {
    prompt: string;
    truth: string;
    got: string;
    raw: string;
    right: boolean;
  }[];
};

export type ProvenanceData = {
  model: { id: string; name: string; url: string; licence: string };
  note: string;
  arithmetic: Arithmetic;
  rounds: ProvenanceRound[];
};

/* ------------------------------------------------------------------ rules -- */

/* Five, not eight. Eight was two minutes of the same decision, and the point
   is made by the third: nobody's attention is the thing being taught here. */
export const ROUND_SIZE = 4;
/** How many of the round are sums. The rest are drawn from the fact pool. */
export const SUM_ROUNDS = 1;

const BASE_POINTS = 100;
/** Calling "it needs the source" on something it ranked 800th is the good one. */
const INSIGHT_POINTS = 80;

export const VERDICTS: Record<Verdict, { label: string; blurb: string }> = {
  memory: {
    label: "It already knows",
    blurb:
      "The answer is in the weights. Handing it a source barely moves the number.",
  },
  lookup: {
    label: "It needs the source",
    blurb:
      "Cold, it does not have this. Put the fact in front of it and it is near-certain.",
  },
  tool: {
    label: "It needs a real tool",
    blurb:
      "No amount of reading fixes this, because the work is not recall. This is why calculators got bolted on.",
  },
};

/* ---------------------------------------------------------------- rounds -- */

/** A sum round carries no probabilities, it is scored on measured accuracy. */
export type SumRound = {
  id: string;
  kind: "tool";
  ask: string;
  prompt: string;
  truth: string;
  raw: string;
};

export type AnyRound = ProvenanceRound | SumRound;

export function isSum(round: AnyRound): round is SumRound {
  return round.kind === "tool";
}

export function answerFor(round: AnyRound): Verdict {
  return round.kind;
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

export function deal(data: ProvenanceData, rolls: number[]): AnyRound[] {
  const sums: SumRound[] = shuffledBy(data.arithmetic.examples, rolls)
    .slice(0, SUM_ROUNDS)
    .map((example, i) => ({
      id: `sum-${i}-${example.prompt}`,
      kind: "tool",
      ask: `What is ${example.prompt.replace(" =", "")}?`,
      prompt: example.prompt,
      truth: example.truth,
      raw: example.raw,
    }));

  /* At least one it knows and one it needs the source for, so every game
     shows both doors open. The rest are random. */
  const shuffled = shuffledBy(data.rounds, rolls.slice(30));
  const firstOf = (kind: ProvenanceRound["kind"]) =>
    shuffled.find((r) => r.kind === kind);
  const anchors = [firstOf("memory"), firstOf("lookup")].filter(
    (r): r is ProvenanceRound => Boolean(r),
  );
  const facts = [
    ...anchors,
    ...shuffled.filter((r) => !anchors.includes(r)),
  ].slice(0, ROUND_SIZE - sums.length);

  return shuffledBy([...facts, ...sums], rolls.slice(60));
}

/* ----------------------------------------------------------------- scene -- */

export type ProvenanceScene = {
  rounds: AnyRound[];
  at: number;
  called: Verdict | null;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): ProvenanceScene {
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

/**
 * Ends the set where the player is standing.
 */
export function finish(scene: ProvenanceScene): ProvenanceScene {
  return scene.done ? scene : { ...scene, done: true };
}

export function start(data: ProvenanceData, rolls: number[]): ProvenanceScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: ProvenanceScene): AnyRound | undefined {
  return scene.rounds[scene.at];
}

export function pointsFor(round: AnyRound, called: Verdict): number {
  if (called !== answerFor(round)) return 0;
  if (isSum(round)) return BASE_POINTS + INSIGHT_POINTS;
  // Spotting a gap the model hides well is worth more than spotting an easy one.
  const buried = round.kind === "lookup" && round.bare.probability < 0.1;
  return BASE_POINTS + (buried ? INSIGHT_POINTS : 0);
}

export function call(
  scene: ProvenanceScene,
  verdict: Verdict,
): ProvenanceScene {
  const round = current(scene);
  if (!round || scene.done || scene.called !== null) return scene;

  const ok = verdict === answerFor(round);
  const streak = ok ? scene.streak + 1 : 0;

  return {
    ...scene,
    called: verdict,
    score: scene.score + pointsFor(round, verdict),
    right: scene.right + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: ProvenanceScene): ProvenanceScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
