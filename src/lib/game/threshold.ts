/**
 * The rules of Where's the Line, as pure functions.
 *
 * A classifier does not classify. It produces a number, and somebody chooses
 * the point at which that number becomes a decision. The game hands the
 * learner that choice, five times, under five different sets of consequences,
 * and then charges them for it in the units the scenario cares about.
 *
 * The cost of every choice is real: the counts come from the same 1,115
 * held-out messages, and the best achievable cost is found by evaluating every
 * threshold on the swept curve rather than by argument. Scoring against that
 * best is what stops the game being about guessing a number.
 *
 * PURITY. Draws are made by the caller and passed in as numbers.
 */

/* ------------------------------------------------------------------ types -- */

export type Point = {
  threshold: number;
  caught: number;
  falseAlarms: number;
  missed: number;
  leftAlone: number;
  accuracy: number;
  precision: number;
  recall: number;
};

export type Stop = Point & { id: string; label: string; at: number };

export type Scenario = {
  id: string;
  title: string;
  says: string;
  missedCost: number;
  falseAlarmCost: number;
  best: Point & { cost: number };
  worstCost: number;
};

export type ThresholdData = {
  generatedBy: string;
  source: { name: string; authors: string; url: string; licence: string };
  model: { name: string; note: string };
  corpus: {
    total: number;
    trainSize: number;
    testSize: number;
    spamInTest: number;
    hamInTest: number;
  };
  curve: Point[];
  stops: Stop[];
  scenarios: Scenario[];
  /** [probability, 1 for spam] for every held-out message. */
  points: [number, number][];
};

/* ------------------------------------------------------------------ rules -- */

/**
 * The five places a person would actually consider putting the line, in words
 * rather than numbers.
 *
 * Numbers would make this a game about reading a scale. The choice a team
 * really makes is this one: how sure do we insist on being before we act?
 */
export const DIALS = [
  {
    id: "anything",
    label: "Flag anything suspicious",
    means: "The faintest hint is enough.",
    threshold: 1e-6,
  },
  {
    id: "lean-flag",
    label: "Lean towards flagging",
    means: "A one in twenty chance of spam is enough to act on.",
    threshold: 0.05,
  },
  {
    id: "half",
    label: "Whichever is likelier",
    means: "The line nobody chooses on purpose.",
    threshold: 0.5,
  },
  {
    id: "lean-leave",
    label: "Lean towards leaving alone",
    means: "Only when it is nineteen times out of twenty.",
    threshold: 0.95,
  },
  {
    id: "certain",
    label: "Only when it is certain",
    means: "Practically no doubt at all.",
    threshold: 0.999999,
  },
] as const;

export type DialId = (typeof DIALS)[number]["id"];

export const ROUNDS = 4;

/** Points for landing within this much of the best achievable cost. */
const PERFECT_MARGIN = 1.05;
const BASE_POINTS = 120;

/** The swept point closest to a chosen threshold. */
export function pointAt(data: ThresholdData, threshold: number): Point {
  let best = data.curve[0];
  for (const point of data.curve) {
    if (
      Math.abs(point.threshold - threshold) < Math.abs(best.threshold - threshold)
    ) {
      best = point;
    }
  }
  return best;
}

export function costOf(scenario: Scenario, point: Point): number {
  return (
    point.missed * scenario.missedCost +
    point.falseAlarms * scenario.falseAlarmCost
  );
}

/** What each of the five offered choices would cost in a given scenario. */
export function dialCosts(
  data: ThresholdData,
  scenario: Scenario,
): { id: DialId; cost: number }[] {
  return DIALS.map((dial) => ({
    id: dial.id,
    cost: costOf(scenario, pointAt(data, dial.threshold)),
  }));
}

/**
 * Score for a choice, judged against the other four.
 *
 * Deliberately not judged against the cheapest point on the whole swept curve.
 * The player is offered five places to stand, and marking them against a
 * threshold they were never offered would be scoring them for not having a
 * slider. The curve's own optimum is still shown in the reveal, as the thing
 * a real team could have tuned their way to.
 */
export function pointsFor(
  data: ThresholdData,
  scenario: Scenario,
  dial: DialId,
): number {
  const costs = dialCosts(data, scenario);
  const mine = costs.find((c) => c.id === dial);
  if (!mine) return 0;

  const best = Math.min(...costs.map((c) => c.cost));
  const worst = Math.max(...costs.map((c) => c.cost));

  if (mine.cost <= best * PERFECT_MARGIN) return BASE_POINTS;
  // Linear from full marks at the cheapest offered choice down to nothing at
  // the most expensive, so a merely poor answer still beats a catastrophic one.
  const room = worst - best;
  if (room <= 0) return BASE_POINTS;
  return Math.max(0, Math.round(BASE_POINTS * (1 - (mine.cost - best) / room)));
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

export function deal(data: ThresholdData, rolls: number[]): Scenario[] {
  return shuffledBy(data.scenarios, rolls).slice(0, ROUNDS);
}

/* ----------------------------------------------------------------- scene -- */

export type ThresholdScene = {
  rounds: Scenario[];
  at: number;
  called: DialId | null;
  score: number;
  perfect: number;
  streak: number;
  bestStreak: number;
  done: boolean;
};

export function newScene(): ThresholdScene {
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

export function start(data: ThresholdData, rolls: number[]): ThresholdScene {
  return { ...newScene(), rounds: deal(data, rolls) };
}

export function current(scene: ThresholdScene): Scenario | undefined {
  return scene.rounds[scene.at];
}

export function call(
  data: ThresholdData,
  scene: ThresholdScene,
  dial: DialId,
): ThresholdScene {
  const scenario = current(scene);
  if (!scenario || scene.done || scene.called !== null) return scene;

  const points = pointsFor(data, scenario, dial);
  const nailed = points === BASE_POINTS;
  const streak = nailed ? scene.streak + 1 : 0;

  return {
    ...scene,
    called: dial,
    score: scene.score + points,
    perfect: scene.perfect + (nailed ? 1 : 0),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

export function next(scene: ThresholdScene): ThresholdScene {
  if (scene.called === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.rounds.length) return { ...scene, done: true };
  return { ...scene, at, called: null };
}
