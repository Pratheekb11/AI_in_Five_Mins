/**
 * The rules of Context Budget, as pure functions.
 *
 * Five slots, a pile of cards, and one question. You decide what the model gets
 * to see. Then you run it, and the number that comes back is the probability
 * the real model puts on the real answer given exactly the context you built.
 *
 * Every combination was measured offline — see `data/scripts/build-context.mjs`
 * — so pressing Run is a lookup of a real measurement rather than a simulation.
 *
 * What the measurements turned out to say, which is not what most people expect:
 *
 *   - The relevant document is nearly the whole game. Without it the answer sits
 *     at zero however many other cards you add.
 *   - A decoy that looks relevant and says something else roughly halves it.
 *   - The card that does the most damage is the "example of a good answer",
 *     because its placeholder value is what gets copied. The most helpful-
 *     looking card in the pile is the worst one to include.
 *   - Chit-chat is close to harmless. Volume is not the problem; relevance is.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type CardKind = "relevant" | "noise" | "stale" | "decoy" | "example";

export type Card = {
  id: string;
  kind: CardKind;
  label: string;
  text: string;
};

export type Combination = {
  cards: string[];
  /** The model's probability of producing the whole correct answer. */
  probability: number;
  tokens: number;
  rank: number;
  topText: string;
  topProbability: number;
};

export type Scenario = {
  id: string;
  ask: string;
  question: string;
  answer: string;
  answerLabel: string;
  answerTokens: number;
  cards: Card[];
  combinations: Combination[];
};

export type ContextData = {
  model: { id: string; name: string; url: string; licence: string };
  slots: number;
  note: string;
  scenarios: Scenario[];
};

/* ------------------------------------------------------------------ rules -- */

/** Runs per scenario. Few enough that you have to think before pressing it. */
export const RUNS = 4;

export const KIND_NAMES: Record<CardKind, string> = {
  relevant: "Has the answer in it",
  noise: "Harmless chatter",
  stale: "Out of date, and says so",
  decoy: "Looks relevant, says something else",
  example: "A worked example, with a made-up value in it",
};

/** The measured result for a set of cards, or null if it was never measured. */
export function resultFor(
  scenario: Scenario,
  chosen: readonly string[],
): Combination | null {
  const key = [...chosen].sort().join("|");
  return (
    scenario.combinations.find(
      (c) => [...c.cards].sort().join("|") === key,
    ) ?? null
  );
}

/** The best any combination can do, which is what the player is chasing. */
export function ceilingFor(scenario: Scenario): Combination {
  return scenario.combinations.reduce((a, b) =>
    b.probability > a.probability ? b : a,
  );
}

/**
 * What one card does to the context you have already built.
 *
 * Used for the debrief, so the effect of each card is shown as the measured
 * change it makes rather than as a claim about what that kind of card does.
 */
export function effectOf(
  scenario: Scenario,
  chosen: readonly string[],
  card: string,
): { without: number; with: number; delta: number } | null {
  const without = resultFor(
    scenario,
    chosen.filter((c) => c !== card),
  );
  const withIt = resultFor(
    scenario,
    chosen.includes(card) ? chosen : [...chosen, card],
  );
  if (!without || !withIt) return null;
  return {
    without: without.probability,
    with: withIt.probability,
    delta: withIt.probability - without.probability,
  };
}

/* ----------------------------------------------------------------- scene -- */

export type BudgetScene = {
  order: number[];
  at: number;
  chosen: string[];
  /** The measurement showing on the meter, or null before the first run. */
  shown: Combination | null;
  runsLeft: number;
  /** Best probability reached on this scenario. */
  best: number;
  score: number;
  solved: number;
  done: boolean;
};

export function newScene(): BudgetScene {
  return {
    order: [],
    at: 0,
    chosen: [],
    shown: null,
    runsLeft: RUNS,
    best: 0,
    score: 0,
    solved: 0,
    done: false,
  };
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

export function start(data: ContextData, rolls: number[]): BudgetScene {
  return {
    ...newScene(),
    order: shuffledBy(
      data.scenarios.map((_, i) => i),
      rolls,
    ),
  };
}

export function scenarioOf(
  data: ContextData | null,
  scene: BudgetScene,
): Scenario | undefined {
  if (!data || scene.order.length === 0) return undefined;
  return data.scenarios[scene.order[scene.at]];
}

export function toggle(
  scene: BudgetScene,
  slots: number,
  card: string,
): BudgetScene {
  if (scene.done) return scene;
  if (scene.chosen.includes(card)) {
    return { ...scene, chosen: scene.chosen.filter((c) => c !== card) };
  }
  if (scene.chosen.length >= slots) return scene;
  return { ...scene, chosen: [...scene.chosen, card] };
}

export function clear(scene: BudgetScene): BudgetScene {
  return scene.chosen.length === 0 ? scene : { ...scene, chosen: [] };
}

/**
 * Run it.
 *
 * Score is the best probability reached, so a good first guess is worth as much
 * as a lucky fourth — and the runs are there to make you think, not to be spent.
 */
export function run(scene: BudgetScene, scenario: Scenario): BudgetScene {
  if (scene.done || scene.runsLeft <= 0) return scene;
  const result = resultFor(scenario, scene.chosen);
  if (!result) return scene;

  return {
    ...scene,
    shown: result,
    runsLeft: scene.runsLeft - 1,
    best: Math.max(scene.best, result.probability),
  };
}

export function next(scene: BudgetScene, scenario: Scenario): BudgetScene {
  const ceiling = ceilingFor(scenario).probability;
  // Full marks for reaching what the cards can actually do, plus what is left
  // of the run budget. Nobody is scored against a number no combination hits.
  const share = ceiling > 0 ? Math.min(1, scene.best / ceiling) : 0;
  const gained = Math.round(share * 700) + scene.runsLeft * 50;
  const solved = scene.solved + (share >= 0.9 ? 1 : 0);

  const at = scene.at + 1;
  if (at >= scene.order.length) {
    return { ...scene, score: scene.score + gained, solved, done: true };
  }
  return {
    ...scene,
    at,
    chosen: [],
    shown: null,
    runsLeft: RUNS,
    best: 0,
    score: scene.score + gained,
    solved,
  };
}
