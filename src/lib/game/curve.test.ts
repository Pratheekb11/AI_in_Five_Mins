import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  current,
  type CurveData,
  curveOf,
  deal,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start,
  truthOf,
} from "./curve";

/**
 * Buy the Upgrade.
 *
 * The chapter's claim is a crossing: the model with the most to learn starts
 * behind a hand-written rule and ends ahead of everything. If a rebuild ever
 * flattens that, the page is arguing from a picture it no longer has.
 */

const data: CurveData = JSON.parse(
  readFileSync("public/data/curve.json", "utf8"),
);

const rolls = Array.from({ length: 20 }, (_, i) => ((i * 3) % 100) / 100);

describe("the curves", () => {
  it("measures every model at every size", () => {
    for (const curve of data.curves) {
      expect(curve.points.map((p) => p.size)).toEqual(data.sizes);
      for (const point of curve.points) {
        expect(point.accuracy).toBeGreaterThan(0);
        expect(point.accuracy).toBeLessThanOrEqual(1);
        expect(point.draws).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the hand-written rule flat, because it never sees the data", () => {
    const rule = curveOf(data, "one-rule");
    const values = new Set(rule.points.map((p) => p.accuracy));
    expect(values.size).toBe(1);
  });

  it("has the biggest model start worst and finish best", () => {
    const words = curveOf(data, "words");
    const rule = curveOf(data, "one-rule");

    expect(words.atSmallest).toBeLessThan(rule.atSmallest);
    for (const curve of data.curves) {
      if (curve.id === "words") continue;
      expect(words.atLargest).toBeGreaterThanOrEqual(curve.atLargest);
    }
  });

  it("has every learned model improve overall with more data", () => {
    for (const curve of data.curves) {
      if (curve.id === "one-rule") continue;
      expect(curve.atLargest).toBeGreaterThan(curve.atSmallest);
    }
  });

  it("averages small sizes over several draws, and the full set over one", () => {
    for (const curve of data.curves) {
      expect(curve.points[0].draws).toBe(data.repeats);
      expect(curve.points[curve.points.length - 1].draws).toBe(1);
    }
  });
});

describe("the rounds", () => {
  it("offers as much more data as the corpus can actually give", () => {
    for (const round of data.rounds) {
      // The offer is the smallest measured size that is at least ten times
      // what you have, or everything there is when no such size exists. The
      // sizes are not powers of ten, so it lands at 12.5x or 2.2x rather than
      // a clean ten, and the game prints whatever it really is.
      const wanted =
        data.sizes.find((s) => s >= round.size * 10) ??
        data.sizes[data.sizes.length - 1];
      expect(round.moreData.size).toBe(wanted);
      expect(round.moreData.times).toBeCloseTo(wanted / round.size, 1);
      expect(round.moreData.times).toBeGreaterThan(2);
    }
  });

  it("agrees with the curves it was built from", () => {
    for (const round of data.rounds) {
      const start = curveOf(data, round.startModel).points.find(
        (p) => p.size === round.size,
      );
      expect(start?.accuracy).toBe(round.startAccuracy);
      expect(round.moreData.gain).toBeCloseTo(
        round.moreData.accuracy - round.startAccuracy,
        4,
      );
      expect(round.betterModel.gain).toBeCloseTo(
        round.betterModel.accuracy - round.startAccuracy,
        4,
      );
    }
  });

  it("does not always want the same answer", () => {
    const answers = new Set(data.rounds.map((r) => truthOf(r)));
    expect(answers.size).toBeGreaterThan(1);
  });

  it("wants data when there is almost none", () => {
    const smallest = data.rounds.reduce((a, b) => (b.size < a.size ? b : a));
    expect(smallest.moreData.gain).toBeGreaterThan(0.05);
  });
});

describe("scoring and the scene", () => {
  it("pays for the better buy, and for either where they tie", () => {
    for (const round of data.rounds) {
      const truth = truthOf(round);
      if (truth === "either") {
        expect(pointsFor(round, "data")).toBe(100);
        expect(pointsFor(round, "model")).toBe(100);
      } else {
        expect(pointsFor(round, truth)).toBe(100);
        expect(pointsFor(round, truth === "data" ? "model" : "data")).toBe(0);
      }
    }
  });

  it("deals, refuses a second call, and ends", () => {
    let scene = start(data, rolls);
    expect(scene.rounds.length).toBe(Math.min(ROUNDS, data.rounds.length));
    expect(new Set(deal(data, rolls).map((r) => r.id)).size).toBe(
      scene.rounds.length,
    );
    expect(next(scene)).toBe(scene);

    const once = call(scene, "data");
    expect(call(once, "model")).toBe(once);

    for (let i = 0; i < scene.rounds.length; i++) {
      const truth = truthOf(scene.rounds[scene.at]);
      scene = next(call(scene, truth === "either" ? "data" : truth));
    }
    expect(scene.done).toBe(true);
    expect(scene.right).toBe(scene.rounds.length);
    expect(current(newScene())).toBeUndefined();
  });
});
