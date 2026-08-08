import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bandOf,
  call,
  CALLS,
  current,
  deal,
  type ForestData,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start,
} from "./forest";

/**
 * Worth the Crowd.
 *
 * The chapter rests on a contrast that has to survive rebuilds: the forest of
 * stumps gains a lot, and the forest of identical trees gains exactly nothing.
 * If the identical forest ever gains something, its trees stopped being
 * identical and the control is broken.
 */

const data: ForestData = JSON.parse(
  readFileSync("public/data/forest.json", "utf8"),
);

const rolls = Array.from({ length: 20 }, (_, i) => ((i * 11) % 100) / 100);

function forestOf(id: string) {
  const found = data.forests.find((f) => f.id === id);
  if (!found) throw new Error(`no forest ${id}`);
  return found;
}

describe("the forests", () => {
  it("grows the same number of trees in each and scores them all", () => {
    for (const forest of data.forests) {
      expect(forest.alone.length).toBe(data.treesPerForest);
      expect(forest.running.length).toBe(data.treesPerForest);
      expect(forest.trees).toBe(data.treesPerForest);
    }
  });

  it("reports a mean, a best and a worst that match the trees", () => {
    for (const forest of data.forests) {
      const mean =
        forest.alone.reduce((a, b) => a + b, 0) / forest.alone.length;
      expect(forest.meanAlone).toBeCloseTo(mean, 3);
      expect(forest.bestAlone).toBeCloseTo(Math.max(...forest.alone), 4);
      expect(forest.worstAlone).toBeCloseTo(Math.min(...forest.alone), 4);
      expect(forest.gain).toBeCloseTo(forest.together - forest.meanAlone, 3);
    }
  });

  it("keeps the identical forest identical, and worth nothing extra", () => {
    const identical = forestOf("identical");
    expect(identical.disagreement).toBe(0);
    expect(identical.gain).toBe(0);
    expect(new Set(identical.alone).size).toBe(1);
  });

  it("has the worst trees gain the most", () => {
    const stumps = forestOf("stumps");
    const deep = forestOf("deep");
    expect(stumps.meanAlone).toBeLessThan(deep.meanAlone);
    expect(stumps.gain).toBeGreaterThan(deep.gain);
  });

  it("ties the gain to how much the trees disagree", () => {
    const sorted = [...data.forests].sort(
      (a, b) => a.disagreement - b.disagreement,
    );
    // Least disagreement gains least; most disagreement gains most.
    expect(sorted[0].gain).toBeLessThanOrEqual(sorted[sorted.length - 1].gain);
  });

  it("beats every one of its own trees where the trees differ", () => {
    const shallow = forestOf("shallow");
    expect(shallow.together).toBeGreaterThan(shallow.meanAlone);
  });
});

describe("the examples", () => {
  it("spreads from near-unanimous to nearly tied", () => {
    const splits = data.examples.map(
      (e) => e.votesForSpam / data.treesPerForest,
    );
    expect(Math.min(...splits)).toBeLessThan(0.15);
    expect(Math.max(...splits)).toBeGreaterThan(0.85);
    expect(splits.some((s) => s > 0.4 && s < 0.6)).toBe(true);
  });

  it("reprints no long run of digits", () => {
    for (const example of data.examples) {
      expect(/\d{7,}/.test(example.text)).toBe(false);
    }
  });
});

describe("scoring and the scene", () => {
  it("bands the gains the way the game claims", () => {
    expect(bandOf(forestOf("identical"))).toBe("none");
    expect(bandOf(forestOf("stumps"))).toBe("lots");
    expect(CALLS.length).toBe(3);
  });

  it("pays full for the right band and something for a neighbour", () => {
    const stumps = forestOf("stumps");
    expect(pointsFor(stumps, "lots")).toBe(120);
    expect(pointsFor(stumps, "some")).toBe(40);
    expect(pointsFor(stumps, "none")).toBe(0);
  });

  it("deals every forest once, refuses a second call, and ends", () => {
    let scene = start(data, rolls);
    expect(scene.rounds.length).toBe(Math.min(ROUNDS, data.forests.length));
    expect(new Set(deal(data, rolls).map((f) => f.id)).size).toBe(
      scene.rounds.length,
    );
    expect(next(scene)).toBe(scene);

    const once = call(scene, "some");
    expect(call(once, "lots")).toBe(once);

    for (let i = 0; i < scene.rounds.length; i++) {
      scene = next(call(scene, bandOf(scene.rounds[scene.at])));
    }
    expect(scene.done).toBe(true);
    expect(scene.right).toBe(scene.rounds.length);
    expect(current(newScene())).toBeUndefined();
  });
});
