import { describe, expect, it } from "vitest";
import {
  bestSlope,
  gradient,
  gradientStep,
  meanSquaredError,
  type Point,
  scoreRules,
} from "./ml";

/**
 * The maths the lessons run on.
 *
 * These are checked against closed forms rather than against recorded output,
 * so a test passing means the function is right, not merely unchanged.
 */

const EXACT: Point[] = [
  { chars: 4, tokens: 1 },
  { chars: 8, tokens: 2 },
  { chars: 12, tokens: 3 },
];

describe("meanSquaredError", () => {
  it("is zero when the slope fits every point exactly", () => {
    expect(meanSquaredError(EXACT, 0.25)).toBe(0);
  });

  it("matches the hand-computed value off the fit", () => {
    // errors at slope 0.5: 1, 2, 3 -> (1 + 4 + 9) / 3
    expect(meanSquaredError(EXACT, 0.5)).toBeCloseTo(14 / 3, 12);
  });

  it("is symmetric about the fit for evenly spread error", () => {
    const above = meanSquaredError(EXACT, 0.25 + 0.1);
    const below = meanSquaredError(EXACT, 0.25 - 0.1);
    expect(above).toBeCloseTo(below, 12);
  });

  it("returns zero rather than NaN on no data", () => {
    expect(meanSquaredError([], 0.5)).toBe(0);
  });
});

describe("gradient", () => {
  it("is zero at the bottom of the bowl", () => {
    expect(gradient(EXACT, 0.25)).toBeCloseTo(0, 12);
  });

  it("points uphill on each side", () => {
    expect(gradient(EXACT, 0.4)).toBeGreaterThan(0);
    expect(gradient(EXACT, 0.1)).toBeLessThan(0);
  });

  it("agrees with a numerical derivative of the error", () => {
    const h = 1e-6;
    const numeric =
      (meanSquaredError(EXACT, 0.5 + h) - meanSquaredError(EXACT, 0.5 - h)) /
      (2 * h);
    expect(gradient(EXACT, 0.5)).toBeCloseTo(numeric, 6);
  });
});

describe("gradientStep", () => {
  it("moves the error down at a small learning rate", () => {
    const before = meanSquaredError(EXACT, 0.5);
    const after = meanSquaredError(EXACT, gradientStep(EXACT, 0.5, 0.001));
    expect(after).toBeLessThan(before);
  });

  it("converges on the least-squares slope when iterated", () => {
    let slope = 0.9;
    for (let i = 0; i < 2000; i++) slope = gradientStep(EXACT, slope, 0.001);
    expect(slope).toBeCloseTo(bestSlope(EXACT), 6);
  });

  it("overshoots and diverges when the rate is too large, the failure the lesson shows", () => {
    let slope = 0.5;
    for (let i = 0; i < 20; i++) slope = gradientStep(EXACT, slope, 0.05);
    expect(meanSquaredError(EXACT, slope)).toBeGreaterThan(
      meanSquaredError(EXACT, 0.5),
    );
  });
});

describe("bestSlope", () => {
  it("recovers the exact slope of noise-free data", () => {
    expect(bestSlope(EXACT)).toBeCloseTo(0.25, 12);
  });

  it("sits at the minimum of the error curve", () => {
    const best = bestSlope(EXACT);
    const at = meanSquaredError(EXACT, best);
    expect(meanSquaredError(EXACT, best + 0.05)).toBeGreaterThanOrEqual(at);
    expect(meanSquaredError(EXACT, best - 0.05)).toBeGreaterThanOrEqual(at);
  });

  it("returns zero rather than dividing by zero on no data", () => {
    expect(bestSlope([])).toBe(0);
  });
});

describe("scoreRules", () => {
  const RULES = 3;
  const SPAM = 1 << RULES;
  // rule bits 0b001, 0b010, 0b100; label bit 0b1000
  const SET = [
    SPAM | 0b001, // spam, rule 1 fires
    SPAM | 0b010, // spam, rule 2 fires
    SPAM | 0b000, // spam, nothing fires
    0b100, // ham, rule 3 fires
    0b000, // ham, nothing fires
  ];

  it("counts a rule that catches one spam and nothing else", () => {
    const card = scoreRules(SET, 0b001, RULES);
    expect(card).toMatchObject({
      caught: 1,
      missed: 2,
      falseAlarms: 0,
      correct: 3,
      total: 5,
    });
    expect(card.accuracy).toBeCloseTo(3 / 5, 12);
  });

  it("treats rules as an OR, the way people actually combine them", () => {
    const card = scoreRules(SET, 0b011, RULES);
    expect(card.caught).toBe(2);
    expect(card.missed).toBe(1);
    expect(card.falseAlarms).toBe(0);
  });

  it("charges for a rule that fires on ham", () => {
    const card = scoreRules(SET, 0b100, RULES);
    expect(card.caught).toBe(0);
    expect(card.falseAlarms).toBe(1);
    expect(card.correct).toBe(1);
  });

  it("flagging nothing still scores the ham right, the baseline the lesson leans on", () => {
    const card = scoreRules(SET, 0, RULES);
    expect(card.caught).toBe(0);
    expect(card.missed).toBe(3);
    expect(card.falseAlarms).toBe(0);
    expect(card.correct).toBe(2);
  });

  it("every message lands in exactly one of the four boxes", () => {
    for (const mask of [0, 0b001, 0b010, 0b100, 0b111]) {
      const c = scoreRules(SET, mask, RULES);
      expect(c.caught + c.missed + c.falseAlarms + (c.correct - c.caught)).toBe(
        SET.length,
      );
    }
  });

  it("returns zero accuracy rather than NaN on an empty set", () => {
    expect(scoreRules([], 0b1, RULES).accuracy).toBe(0);
  });
});
