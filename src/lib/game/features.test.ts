import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  current,
  deal,
  type FeatureData,
  isClose,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  shuffledBy,
  start,
  winnerOf,
} from "./features";

/**
 * The Feature Bench.
 *
 * Half of these are about the reducer and half are about the data, because the
 * page makes claims about specific features. If `features.json` is regenerated
 * and the word "free" stops losing to message length, the chapter's headline
 * becomes false, and it should fail here rather than quietly mislead somebody.
 */

const data: FeatureData = JSON.parse(
  readFileSync("public/data/features.json", "utf8"),
);

const rolls = Array.from({ length: 40 }, (_, i) => ((i * 37) % 100) / 100);

function featureOf(id: string) {
  const found = data.features.find((f) => f.id === id);
  if (!found) throw new Error(`no feature ${id}`);
  return found;
}

describe("the corpus", () => {
  it("is the whole SMS collection, split the way the rest of the site splits it", () => {
    expect(data.corpus.total).toBe(5574);
    expect(data.corpus.trainSize + data.corpus.testSize).toBe(
      data.corpus.total,
    );
    expect(data.corpus.spam + data.corpus.ham).toBe(data.corpus.total);
  });

  it("has about a seventh of a bit less than one bit of uncertainty to remove", () => {
    // Roughly one message in seven is spam, so the label is a long way from a
    // coin flip and there is well under a full bit on the table.
    expect(data.corpus.baseEntropy).toBeGreaterThan(0.4);
    expect(data.corpus.baseEntropy).toBeLessThan(0.7);
  });
});

describe("the claims the chapter makes out loud", () => {
  it("has message length beating the word free", () => {
    expect(featureOf("long").train.gain).toBeGreaterThan(
      featureOf("free").train.gain,
    );
  });

  it("has the five digit number as the sharpest cut, and a nearly pure pile", () => {
    const best = [...data.features].sort(
      (a, b) => b.train.gain - a.train.gain,
    )[0];
    expect(best.id).toBe("shortcode");
    expect(best.train.purity).toBeGreaterThan(0.95);
  });

  it("has 'says I or me' working by pointing the other way", () => {
    const me = featureOf("i");
    expect(me.train.gain).toBeGreaterThan(0);
    // Its yes pile is almost entirely ordinary messages, which is the point.
    expect(me.train.purity).toBeLessThan(0.1);
  });

  it("measures every feature on both splits", () => {
    for (const f of data.features) {
      expect(f.train.fires + f.train.quiet).toBe(data.corpus.trainSize);
      expect(f.test.fires + f.test.quiet).toBe(data.corpus.testSize);
      expect(f.train.gain).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("dealing", () => {
  it("deals pairs without using a feature twice", () => {
    const pairs = deal(data, rolls);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.length).toBeLessThanOrEqual(ROUNDS);

    const seen = new Set<string>();
    for (const pair of pairs) {
      expect(seen.has(pair.left.id)).toBe(false);
      expect(seen.has(pair.right.id)).toBe(false);
      seen.add(pair.left.id);
      seen.add(pair.right.id);
    }
  });

  it("never deals a pair with no answer", () => {
    for (const pair of deal(data, rolls)) {
      expect(pair.left.train.gain).not.toBe(pair.right.train.gain);
    }
  });

  it("keeps every item when shuffling", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect([...shuffledBy(items, rolls)].sort()).toEqual([...items].sort());
  });
});

describe("scoring", () => {
  const pair = {
    left: featureOf("shortcode"),
    right: featureOf("question"),
  };

  it("pays for the right call and nothing for the wrong one", () => {
    expect(winnerOf(pair)).toBe("left");
    expect(pointsFor(pair, "left")).toBeGreaterThan(0);
    expect(pointsFor(pair, "right")).toBe(0);
  });

  it("pays a bonus only when the two were close", () => {
    expect(isClose(pair)).toBe(false);
    const tight = { left: featureOf("free"), right: featureOf("url") };
    expect(isClose(tight)).toBe(true);
    expect(pointsFor(tight, winnerOf(tight))).toBeGreaterThan(
      pointsFor(pair, "left"),
    );
  });
});

describe("the scene", () => {
  it("ignores a second call on the same pair", () => {
    const scene = start(data, rolls);
    const once = call(scene, "left");
    const twice = call(once, "right");
    expect(twice).toBe(once);
  });

  it("will not move on before a call is made", () => {
    const scene = start(data, rolls);
    expect(next(scene)).toBe(scene);
  });

  it("ends after the last pair", () => {
    let scene = start(data, rolls);
    for (let i = 0; i < scene.pairs.length; i++) {
      scene = next(call(scene, "left"));
    }
    expect(scene.done).toBe(true);
    expect(current(newScene())).toBeUndefined();
  });

  it("counts a streak only while the calls stay right", () => {
    let scene = start(data, rolls);
    const first = current(scene)!;
    scene = call(scene, winnerOf(first));
    expect(scene.streak).toBe(1);
    scene = next(scene);
    const second = current(scene)!;
    scene = call(scene, winnerOf(second) === "left" ? "right" : "left");
    expect(scene.streak).toBe(0);
    expect(scene.bestStreak).toBe(1);
  });
});
