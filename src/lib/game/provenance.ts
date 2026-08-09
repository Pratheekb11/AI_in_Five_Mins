/**
 * The rules of Provenance Detective, as pure functions.
 *
 * One question at a time, and one call to make before you see anything: can
 * this thing answer it from memory, does it need the source handing to it, or
 * does it need a tool that can actually do the work?
 *
 * That is the last practical habit the site teaches, and it is the one that
 * survives contact with a real job. You do not need to know how attention
 * works to use these tools well. You do need to know which of those three
 * situations you are in, because the failure looks identical in all three.
 *
 * Every round is measured. `bare` is the model asked cold; `sourced` is the
 * same question with the fact placed in front of it, which is what a search
 * tool or a document upload actually does. Which bucket a question belongs in
 * was decided by that measurement, not chosen in advance, guessing which facts
 * a model happens to know is precisely the mistake being taught.
 *
 * The arithmetic round is separate and is not a probability. It is an accuracy:
 * the model was given 200 seeded two-digit sums and read greedily, and what it
 * got right was counted.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type Verdict = "memory" | "lookup" | "tool";

export type Measured = {
  probability: number;
  rank: number;
  topText: string;
};

export type ProvenanceRound = {
  id: string;
  kind: "memory" | "lookup";
  ask: string;
  question: string;
  answerLabel: string;
  answerTokens: number;
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
export const ROUND_SIZE = 5;
/** How many of the round are sums. The rest are drawn from the fact pool. */
export const SUM_ROUNDS = 2;

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

  const facts = shuffledBy(data.rounds, rolls.slice(30)).slice(
    0,
    ROUND_SIZE - sums.length,
  );

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
 *
 * The rounds after the point has landed are practice, not teaching, and a
 * fixed count of them reads as homework. Stopping early keeps the score
 * earned so far and goes straight to the summary, so leaving is a finish
 * rather than an abandonment.
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
  const buried = round.kind === "lookup" && round.bare.rank > 20;
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
