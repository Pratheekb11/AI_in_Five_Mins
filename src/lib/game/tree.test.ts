import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  current,
  deal,
  levelOf,
  newScene,
  next,
  nodeAt,
  pointsFor,
  ROUNDS,
  start,
  type TreeData,
} from "./tree";

/**
 * Grow the Tree.
 *
 * The tree is grown offline, so most of what matters is whether the shipped
 * structure is still coherent: piles that add up, gains that are non-negative,
 * and a root split that does what the page claims it does.
 */

const data: TreeData = JSON.parse(
  readFileSync("public/data/tree.json", "utf8"),
);

const rolls = Array.from({ length: 20 }, (_, i) => ((i * 19) % 100) / 100);

describe("the tree", () => {
  it("splits every pile into two that add back up to it", () => {
    const walk = (node = data.tree) => {
      if (!node.ask) return;
      expect(node.yes).toBeDefined();
      expect(node.no).toBeDefined();
      expect(node.yes!.size + node.no!.size).toBe(node.size);
      expect(node.yes!.spam + node.no!.spam).toBe(node.spam);
      walk(node.yes);
      walk(node.no);
    };
    walk();
  });

  it("never asks a question worth nothing", () => {
    const walk = (node = data.tree) => {
      if (!node.ask) return;
      expect(node.gain).toBeGreaterThan(0);
      walk(node.yes);
      walk(node.no);
    };
    walk();
  });

  it("asks the five digit question first, and separates the pile", () => {
    expect(data.tree.ask).toBe("shortcode");
    expect(data.tree.yes!.purity).toBeGreaterThan(0.95);
    expect(data.tree.no!.purity).toBeLessThan(0.05);
  });

  it("has held-out accuracy that stops improving well before the last depth", () => {
    const last = data.depths[data.depths.length - 1];
    expect(data.best.depth).toBeLessThan(last.depth);
    expect(last.testAccuracy).toBeLessThanOrEqual(data.best.testAccuracy);
  });

  it("finds the levels the figure draws", () => {
    expect(levelOf(data.tree, 0).length).toBe(1);
    expect(levelOf(data.tree, 1).length).toBe(2);
    const level2 = levelOf(data.tree, 2);
    expect(level2.length).toBeGreaterThan(1);
    expect(level2.reduce((n, node) => n + node.size, 0)).toBeLessThanOrEqual(
      data.tree.size,
    );
  });
});

describe("the rounds", () => {
  it("only asks about nodes where the choice is genuinely open", () => {
    for (const round of data.rounds) {
      const sorted = [...round.candidates].sort((a, b) => b.gain - a.gain);
      expect(sorted[0].id).toBe(round.answer);
      expect(sorted[1].gain).toBeGreaterThan(sorted[0].gain * 0.25);
    }
  });

  it("describes a node that really is in the tree", () => {
    for (const round of data.rounds) {
      const node = nodeAt(data, round.path);
      expect(node.size).toBe(round.size);
      expect(node.spam).toBe(round.spam);
    }
  });
});

describe("scoring and the scene", () => {
  it("pays full for the best split and something for a near miss", () => {
    const round = data.rounds[0];
    const sorted = [...round.candidates].sort((a, b) => b.gain - a.gain);
    expect(pointsFor(round, round.answer)).toBe(100);
    const worst = sorted[sorted.length - 1];
    if (worst.gain < sorted[0].gain * 0.8) {
      expect(pointsFor(round, worst.id)).toBe(0);
    }
    expect(pointsFor(round, "not-a-feature")).toBe(0);
  });

  it("deals, refuses a second call, and ends", () => {
    let scene = start(data, rolls);
    expect(scene.rounds.length).toBe(Math.min(ROUNDS, data.rounds.length));
    expect(next(scene)).toBe(scene);

    const once = call(scene, scene.rounds[0].answer);
    expect(call(once, "free")).toBe(once);

    for (let i = 0; i < scene.rounds.length; i++) {
      scene = next(call(scene, scene.rounds[scene.at].answer));
    }
    expect(scene.done).toBe(true);
    expect(scene.right).toBe(scene.rounds.length);
    expect(current(newScene())).toBeUndefined();
  });

  it("deals each node at most once", () => {
    const dealt = deal(data, rolls);
    expect(new Set(dealt.map((r) => r.id)).size).toBe(dealt.length);
  });
});
