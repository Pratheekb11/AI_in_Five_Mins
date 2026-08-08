import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  current,
  deal,
  newScene,
  next,
  type OverfitData,
  pointsFor,
  predict,
  ROUNDS,
  start,
} from "./overfit";

/**
 * Pick the Model.
 *
 * The chapter's whole claim is a shape: training error falling forever while
 * held-out error turns upward. These tests assert that shape rather than
 * particular numbers wherever they can, so a regenerated file is allowed to
 * move the decimals but not to quietly flatten the lesson.
 */

const data: OverfitData = JSON.parse(
  readFileSync("public/data/overfit.json", "utf8"),
);

const rolls = Array.from({ length: 20 }, (_, i) => ((i * 23) % 100) / 100);

describe("the fits", () => {
  it("never lets training error rise as the model gains freedom", () => {
    for (let i = 1; i < data.degrees.length; i++) {
      // Allowing a hair of slack: these are least-squares fits solved
      // numerically, and the guarantee is mathematical rather than exact.
      expect(data.degrees[i].trainError).toBeLessThanOrEqual(
        data.degrees[i - 1].trainError + 0.2,
      );
    }
  });

  it("has held-out error turn upward well before the last degree", () => {
    const best = data.degrees.reduce((a, b) =>
      b.testError < a.testError ? b : a,
    );
    const last = data.degrees[data.degrees.length - 1];
    expect(best.degree).toBeLessThan(last.degree);
    expect(last.testError).toBeGreaterThan(best.testError * 3);
  });

  it("has the wiggliest fit beat the best one on training data", () => {
    const best = data.degrees.find((d) => d.degree === data.best.degree)!;
    const last = data.degrees[data.degrees.length - 1];
    expect(last.trainError).toBeLessThan(best.trainError);
  });

  it("leaves the plot at the top of the character range", () => {
    const last = data.degrees[data.degrees.length - 1];
    const wild = predict(last, 250, data.maxChars);
    const sane = predict(
      data.degrees.find((d) => d.degree === 1)!,
      250,
      data.maxChars,
    );
    expect(wild).toBeGreaterThan(sane * 5);
  });
});

describe("the rounds", () => {
  it("offers the same degrees in every round it can fit", () => {
    for (const round of data.rounds) {
      expect(round.candidates.length).toBeGreaterThanOrEqual(3);
      for (const candidate of round.candidates) {
        expect(data.offered).toContain(candidate.degree);
      }
    }
  });

  it("does not always want the same answer", () => {
    const answers = new Set(data.rounds.map((r) => r.bestDegree));
    expect(answers.size).toBeGreaterThan(1);
  });

  it("wants a straight line when there is almost no data", () => {
    const smallest = data.rounds.reduce((a, b) =>
      b.trainSize < a.trainSize ? b : a,
    );
    expect(smallest.bestDegree).toBe(1);
  });

  it("holds out everything it did not train on", () => {
    for (const round of data.rounds) {
      expect(round.trainSize + round.testSize).toBe(
        data.train.length + data.test.length,
      );
      expect(round.train.length).toBe(round.trainSize);
    }
  });
});

describe("scoring and the scene", () => {
  it("gives full marks for the best available choice", () => {
    for (const round of data.rounds) {
      expect(pointsFor(round, round.bestDegree)).toBe(120);
    }
  });

  it("pays less for a choice that travels worse", () => {
    for (const round of data.rounds) {
      const worst = round.candidates.reduce((a, b) =>
        b.testError > a.testError ? b : a,
      );
      if (worst.degree === round.bestDegree) continue;
      expect(pointsFor(round, worst.degree)).toBeLessThan(120);
    }
  });

  it("ignores an unknown degree", () => {
    expect(pointsFor(data.rounds[0], 999)).toBe(0);
  });

  it("deals rounds, refuses a second call, and ends", () => {
    let scene = start(data, rolls);
    expect(scene.rounds.length).toBe(Math.min(ROUNDS, data.rounds.length));
    expect(next(scene)).toBe(scene);

    const once = call(scene, scene.rounds[0].candidates[0].degree);
    expect(call(once, 1)).toBe(once);

    for (let i = 0; i < scene.rounds.length; i++) {
      scene = next(call(scene, scene.rounds[scene.at].bestDegree));
    }
    expect(scene.done).toBe(true);
    expect(scene.perfect).toBe(scene.rounds.length);
    expect(current(newScene())).toBeUndefined();
  });

  it("deals each round at most once", () => {
    const dealt = deal(data, rolls);
    expect(new Set(dealt.map((r) => r.id)).size).toBe(dealt.length);
  });
});
