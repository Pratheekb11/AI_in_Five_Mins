/**
 * The small pieces of real maths the lessons run.
 *
 * Everything here is pure and unit-testable, and the lessons import it rather
 * than reimplementing it inline, when a learner drags a slider and watches an
 * error move, that is these functions running, not an animation of them.
 */

export type Point = { chars: number; tokens: number };

/**
 * Mean squared error for the one-parameter model `tokens ≈ slope × chars`.
 *
 * Squared rather than absolute error because squaring is what makes the error
 * curve a smooth bowl with a single lowest point, which is the thing lesson 2
 * is really about.
 */
export function meanSquaredError(points: Point[], slope: number): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const p of points) {
    const error = slope * p.chars - p.tokens;
    sum += error * error;
  }
  return sum / points.length;
}

/**
 * The slope of the error curve at `slope`, which way is downhill, and how
 * steeply. This is the derivative of `meanSquaredError` with respect to slope.
 */
export function gradient(points: Point[], slope: number): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const p of points) {
    sum += 2 * p.chars * (slope * p.chars - p.tokens);
  }
  return sum / points.length;
}

/**
 * One step downhill.
 */
export function gradientStep(
  points: Point[],
  slope: number,
  learningRate: number,
): number {
  return slope - learningRate * gradient(points, slope);
}

/** The slope least squares settles on, for a line through the origin. */
export function bestSlope(points: Point[]): number {
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += p.chars * p.tokens;
    sxx += p.chars * p.chars;
  }
  return sxx === 0 ? 0 : sxy / sxx;
}

// ------------------------------------------------------------ rule scoring ---

export type Scorecard = {
  caught: number;
  missed: number;
  falseAlarms: number;
  correct: number;
  total: number;
  accuracy: number;
};

/**
 * Scores a set of hand-written rules over the packed held-out messages.
 *
 * Each entry holds the rule bitmask in the low bits and the true label above
 * them. A message is flagged when *any* selected rule fires, which is how
 * people actually combine rules when they write them by hand.
 */
export function scoreRules(
  testSet: number[],
  selectedMask: number,
  ruleCount: number,
): Scorecard {
  const labelBit = 1 << ruleCount;
  let caught = 0;
  let missed = 0;
  let falseAlarms = 0;
  let correctlyIgnored = 0;

  for (const entry of testSet) {
    const isSpam = (entry & labelBit) !== 0;
    const flagged = (entry & selectedMask) !== 0;

    if (flagged && isSpam) caught++;
    else if (!flagged && isSpam) missed++;
    else if (flagged && !isSpam) falseAlarms++;
    else correctlyIgnored++;
  }

  const correct = caught + correctlyIgnored;
  return {
    caught,
    missed,
    falseAlarms,
    correct,
    total: testSet.length,
    accuracy: testSet.length === 0 ? 0 : correct / testSet.length,
  };
}
