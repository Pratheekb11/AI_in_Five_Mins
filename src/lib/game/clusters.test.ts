import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  type ClusterData,
  current,
  deal,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start,
} from "./clusters";

/**
 * Odd One In.
 */

const data: ClusterData = JSON.parse(
  readFileSync("public/data/clusters.json", "utf8"),
);

const rolls = Array.from({ length: 20 }, (_, i) => ((i * 7) % 100) / 100);

describe("the clustering", () => {
  it("assigns every word, at every pass", () => {
    expect(data.assignment.length).toBe(data.words.length);
    expect(data.points.length).toBe(data.words.length);
    for (const pass of data.history) {
      expect(pass.length).toBe(data.words.length);
      /* One assertion a pass, not one a word. Thirty-five passes over 1,851
         words is sixty-five thousand expect() calls, which ran into the test
         timeout on a loaded machine and checked nothing the predicate below
         does not. */
      expect(
        pass.every((c) => Number.isInteger(c) && c >= 0 && c < data.k),
      ).toBe(true);
    }
  });

  it("settles, and stops changing on the last pass", () => {
    expect(data.settled).toBe(true);
    const last = data.history[data.history.length - 1];
    const before = data.history[data.history.length - 2];
    expect(last.every((c, i) => c === before[i])).toBe(true);
    expect(last.every((c, i) => c === data.assignment[i])).toBe(true);
  });

  it("moves a great many words on the first few passes", () => {
    const moved = data.history[1].filter(
      (c, i) => c !== data.history[0][i],
    ).length;
    expect(moved).toBeGreaterThan(20);
  });

  it("has clusters whose sizes add up to the vocabulary", () => {
    const total = data.clusters.reduce((n, c) => n + c.size, 0);
    expect(total).toBe(data.words.length);
    for (const cluster of data.clusters) {
      expect(cluster.nearest.length).toBeGreaterThan(0);
      for (const word of cluster.nearest) {
        expect(data.assignment[data.words.indexOf(word)]).toBe(cluster.id);
      }
    }
  });

  it("always fits more tightly as k rises", () => {
    for (let i = 1; i < data.sweep.length; i++) {
      expect(data.sweep[i].inertia).toBeLessThan(data.sweep[i - 1].inertia);
    }
  });
});

describe("the rounds", () => {
  it("asks about words that really are in that cluster", () => {
    for (const round of data.rounds) {
      expect(data.assignment[data.words.indexOf(round.answer)]).toBe(
        round.cluster,
      );
      expect(round.options).toContain(round.answer);
      expect(round.options.length).toBe(4);
    }
  });

  it("offers decoys from other clusters", () => {
    for (const round of data.rounds) {
      for (const option of round.options) {
        if (option === round.answer) continue;
        expect(data.assignment[data.words.indexOf(option)]).not.toBe(
          round.cluster,
        );
      }
    }
  });

  it("never shows the answer among the words it displays", () => {
    for (const round of data.rounds) {
      expect(round.shows).not.toContain(round.answer);
    }
  });
});

describe("the scene", () => {
  it("deals rounds with their options shuffled", () => {
    const dealt = deal(data, rolls);
    expect(dealt.length).toBe(Math.min(ROUNDS, data.rounds.length));
    for (const round of dealt) {
      expect(round.options).toContain(round.answer);
      expect(round.options.length).toBe(4);
    }
    expect(new Set(dealt.map((r) => r.cluster)).size).toBe(dealt.length);
  });

  it("scores, refuses a second call, and ends", () => {
    let scene = start(data, rolls);
    expect(next(scene)).toBe(scene);
    const once = call(scene, scene.rounds[0].options[0]);
    expect(call(once, scene.rounds[0].options[1])).toBe(once);
    expect(pointsFor(scene.rounds[0], scene.rounds[0].answer)).toBe(100);
    expect(pointsFor(scene.rounds[0], "not-a-word")).toBe(0);

    for (let i = 0; i < scene.rounds.length; i++) {
      scene = next(call(scene, scene.rounds[scene.at].answer));
    }
    expect(scene.done).toBe(true);
    expect(scene.right).toBe(scene.rounds.length);
    expect(current(newScene())).toBeUndefined();
  });
});
