import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BANDS,
  bandOf,
  call,
  current,
  deal,
  type LogisticData,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  scoreOf,
  start,
} from "./logistic";

/**
 * Read the Score.
 *
 * The important assertions are that the shipped probabilities really are what
 * the shipped weights produce, and that the rounds still cover the range. A
 * rebuild that quietly bunched every round at two per cent would leave a game
 * that looks fine and teaches nothing.
 */

const data: LogisticData = JSON.parse(
  readFileSync("public/data/logistic.json", "utf8"),
);

const rolls = Array.from({ length: 20 }, (_, i) => ((i * 13) % 100) / 100);

describe("the model", () => {
  it("improves as it trains and ends where the file says", () => {
    const first = data.snapshots[0];
    const last = data.snapshots[data.snapshots.length - 1];
    expect(last.trainLoss).toBeLessThan(first.trainLoss);
    expect(last.testAccuracy).toBeGreaterThan(first.testAccuracy);
    expect(data.final.testAccuracy).toBe(last.testAccuracy);
  });

  it("leans much harder on digits than on length", () => {
    expect(Math.abs(data.final.digits)).toBeGreaterThan(
      Math.abs(data.final.length) * 5,
    );
  });

  it("reproduces every shipped probability from the shipped weights", () => {
    for (const round of data.rounds) {
      const computed = scoreOf(data, data.final, round.length, round.digits);
      expect(computed).toBeCloseTo(round.probability, 3);
    }
  });

  it("ships one point per held-out message", () => {
    expect(data.points.length).toBe(data.corpus.testSize);
    const spam = data.points.filter(([, , y]) => y === 1).length;
    expect(spam).toBe(data.corpus.spamInTest);
  });
});

describe("the rounds", () => {
  it("covers the whole probability range", () => {
    const values = data.rounds.map((r) => r.probability);
    expect(Math.min(...values)).toBeLessThan(0.1);
    expect(Math.max(...values)).toBeGreaterThan(0.9);
    // And is not all bunched at the ends.
    expect(values.filter((v) => v > 0.2 && v < 0.8).length).toBeGreaterThan(2);
  });

  it("reprints no long run of digits", () => {
    for (const round of data.rounds) {
      expect(/\d{7,}/.test(round.text)).toBe(false);
    }
  });
});

describe("bands and scoring", () => {
  it("puts each probability in exactly one band", () => {
    expect(bandOf(0.02)).toBe("no");
    expect(bandOf(0.25)).toBe("lean-no");
    expect(bandOf(0.5)).toBe("torn");
    expect(bandOf(0.75)).toBe("lean-yes");
    expect(bandOf(0.99)).toBe("yes");
  });

  it("pays full for the right band, something for a neighbour, nothing further", () => {
    const round = data.rounds.find((r) => bandOf(r.probability) === "torn");
    if (!round) return;
    expect(pointsFor(round, "torn")).toBe(100);
    expect(pointsFor(round, "lean-yes")).toBe(40);
    expect(pointsFor(round, "yes")).toBe(0);
  });

  it("offers five bands that run from one end to the other", () => {
    expect(BANDS.length).toBe(5);
    expect(BANDS[BANDS.length - 1].max).toBeGreaterThan(1);
  });
});

describe("the scene", () => {
  it("deals, refuses a second call, and ends", () => {
    let scene = start(data, rolls);
    expect(scene.rounds.length).toBe(Math.min(ROUNDS, data.rounds.length));
    expect(next(scene)).toBe(scene);

    const once = call(scene, "torn");
    expect(call(once, "yes")).toBe(once);

    for (let i = 0; i < scene.rounds.length; i++) {
      scene = next(call(scene, bandOf(scene.rounds[scene.at].probability)));
    }
    expect(scene.done).toBe(true);
    expect(scene.right).toBe(scene.rounds.length);
    expect(current(newScene())).toBeUndefined();
  });

  it("deals each message at most once", () => {
    const dealt = deal(data, rolls);
    expect(new Set(dealt.map((r) => r.index)).size).toBe(dealt.length);
  });
});
