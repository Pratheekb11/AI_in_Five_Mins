import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  closePairs,
  type CrossvalData,
  current,
  deal,
  isMisleading,
  modelOf,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start,
} from "./crossval";

/**
 * One Fold or Ten.
 *
 * The chapter's claim is that a single held-out slice can point at the wrong
 * model. That is only true if the file actually contains pairs where it does,
 * so the first thing tested is that those pairs still exist after a rebuild.
 */

const data: CrossvalData = JSON.parse(
  readFileSync("public/data/crossval.json", "utf8"),
);

const rolls = Array.from({ length: 30 }, (_, i) => ((i * 17) % 100) / 100);

describe("the folds", () => {
  it("runs every model on the same ten blocks", () => {
    for (const model of data.models) {
      expect(model.folds.length).toBe(data.corpus.folds);
      for (const fold of model.folds) {
        expect(fold.trainSize + fold.testSize).toBe(data.corpus.total);
      }
    }
  });

  it("reports a mean and a spread that match the folds", () => {
    for (const model of data.models) {
      const values = model.folds.map((f) => f.accuracy);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      expect(model.mean).toBeCloseTo(mean, 3);
      expect(model.worstFold).toBeCloseTo(Math.min(...values), 4);
      expect(model.bestFold).toBeCloseTo(Math.max(...values), 4);
      expect(model.sd).toBeGreaterThan(0);
    }
  });

  it("has a starved model wobble much more than a well fed one", () => {
    expect(modelOf(data, "nb-80").sd).toBeGreaterThan(
      modelOf(data, "learned").sd * 2,
    );
  });
});

describe("the misleading pairs", () => {
  it("still has pairs where a single slice points the wrong way", () => {
    const close = closePairs(data);
    expect(close.length).toBeGreaterThan(2);
  });

  it("only calls a fold misleading when it really disagrees", () => {
    for (const pair of data.pairs) {
      for (const fold of pair.folds) {
        const foldSays = fold.left >= fold.right ? pair.left : pair.right;
        const disagrees = foldSays !== pair.truth;
        expect(pair.misleadingFolds.includes(fold.fold)).toBe(disagrees);
      }
    }
  });

  it("keeps its misleading pairs to the close ones", () => {
    for (const pair of closePairs(data)) {
      // A pair separated by more than a point is not settled by luck.
      expect(pair.gap).toBeLessThan(0.01);
    }
  });
});

describe("scoring", () => {
  it("pays double for going against the slice on screen", () => {
    const pair = closePairs(data)[0];
    const tricky = { pair, fold: pair.misleadingFolds[0] };
    const honest = {
      pair,
      fold: pair.folds
        .map((f) => f.fold)
        .find((f) => !pair.misleadingFolds.includes(f))!,
    };
    expect(isMisleading(tricky)).toBe(true);
    expect(isMisleading(honest)).toBe(false);
    expect(pointsFor(tricky, pair.truth)).toBeGreaterThan(
      pointsFor(honest, pair.truth),
    );
  });

  it("pays nothing for the wrong model", () => {
    const pair = closePairs(data)[0];
    const other = pair.truth === pair.left ? pair.right : pair.left;
    expect(pointsFor({ pair, fold: 1 }, other)).toBe(0);
  });
});

describe("the scene", () => {
  it("deals rounds from the close pairs, with some of them misleading", () => {
    const rounds = deal(data, rolls);
    expect(rounds.length).toBeGreaterThan(0);
    expect(rounds.length).toBeLessThanOrEqual(ROUNDS);
    expect(rounds.some((r) => isMisleading(r))).toBe(true);
    for (const round of rounds) {
      expect(round.pair.folds.some((f) => f.fold === round.fold)).toBe(true);
    }
  });

  it("ignores a second call, refuses to advance early, and ends", () => {
    let scene = start(data, rolls);
    expect(next(scene)).toBe(scene);
    const once = call(scene, scene.rounds[0].pair.left);
    expect(call(once, scene.rounds[0].pair.right)).toBe(once);

    for (let i = 0; i < scene.rounds.length; i++) {
      scene = next(call(scene, scene.rounds[scene.at].pair.truth));
    }
    expect(scene.done).toBe(true);
    expect(scene.right).toBe(scene.rounds.length);
    expect(current(newScene())).toBeUndefined();
  });
});
