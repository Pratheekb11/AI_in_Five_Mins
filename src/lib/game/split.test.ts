import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  current,
  deal,
  isTrap,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  type SplitData,
  start,
  winnerOf,
} from "./split";

/**
 * The Holdout.
 *
 * The data assertions matter more than the reducer ones here. The whole
 * chapter rests on two models scoring a perfect hundred in training and then
 * behaving differently outside it, and on a third being honest and bad. If a
 * rebuild changes any of that, the page starts teaching something untrue and
 * this should be what notices.
 */

const data: SplitData = JSON.parse(
  readFileSync("public/data/split.json", "utf8"),
);

const rolls = Array.from({ length: 40 }, (_, i) => ((i * 29) % 100) / 100);

function modelOf(id: string) {
  const found = data.models.find((m) => m.id === id);
  if (!found) throw new Error(`no model ${id}`);
  return found;
}

describe("the experiment", () => {
  it("trains and tests every model on the same seeded split", () => {
    expect(data.corpus.trainSize + data.corpus.testSize).toBe(
      data.corpus.total,
    );
    for (const m of data.models) {
      expect(m.train.total).toBe(data.corpus.trainSize);
      expect(m.test.total).toBe(data.corpus.testSize);
    }
  });

  it("reports a gap that matches the two accuracies", () => {
    for (const m of data.models) {
      expect(m.gap).toBeCloseTo(m.train.accuracy - m.test.accuracy, 4);
    }
  });
});

describe("the claims the chapter makes out loud", () => {
  it("has exactly two models scoring a perfect hundred in training", () => {
    const perfect = data.models.filter((m) => m.train.accuracy === 1);
    expect(perfect.map((m) => m.id).sort()).toEqual(["memoriser", "nearest"]);
  });

  it("has the memoriser collapsing by more than ten points", () => {
    expect(modelOf("memoriser").gap).toBeGreaterThan(0.1);
  });

  it("has the learned model beating the memoriser where it counts", () => {
    expect(modelOf("learned").test.accuracy).toBeGreaterThan(
      modelOf("memoriser").test.accuracy,
    );
  });

  it("has a model that is honest and still not good enough", () => {
    const tiny = modelOf("tiny");
    expect(Math.abs(tiny.gap)).toBeLessThan(0.01);
    expect(tiny.test.accuracy).toBeLessThan(modelOf("learned").test.accuracy);
  });
});

describe("scoring", () => {
  const trap = { left: modelOf("memoriser"), right: modelOf("learned") };
  const plain = { left: modelOf("learned"), right: modelOf("always-ham") };

  it("knows which one wins outside the training room", () => {
    expect(winnerOf(trap)).toBe("right");
    expect(winnerOf(plain)).toBe("left");
  });

  it("pays extra only when the training score pointed the wrong way", () => {
    expect(isTrap(trap)).toBe(true);
    expect(isTrap(plain)).toBe(false);
    expect(pointsFor(trap, "right")).toBeGreaterThan(pointsFor(plain, "left"));
    expect(pointsFor(trap, "left")).toBe(0);
  });
});

describe("dealing and the scene", () => {
  it("deals pairs without repeating a model or dealing a tie", () => {
    const pairs = deal(data, rolls);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.length).toBeLessThanOrEqual(ROUNDS);

    const seen = new Set<string>();
    for (const pair of pairs) {
      expect(seen.has(pair.left.id)).toBe(false);
      expect(seen.has(pair.right.id)).toBe(false);
      seen.add(pair.left.id);
      seen.add(pair.right.id);
      expect(pair.left.test.accuracy).not.toBe(pair.right.test.accuracy);
    }
  });

  it("ignores a second call, and will not advance without one", () => {
    const scene = start(data, rolls);
    const once = call(scene, "left");
    expect(call(once, "right")).toBe(once);
    expect(next(scene)).toBe(scene);
    expect(current(newScene())).toBeUndefined();
  });

  it("ends after the last pair", () => {
    let scene = start(data, rolls);
    for (let i = 0; i < scene.pairs.length; i++) {
      scene = next(call(scene, "left"));
    }
    expect(scene.done).toBe(true);
  });
});
