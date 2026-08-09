import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  call,
  costOf,
  current,
  deal,
  dialCosts,
  newScene,
  next,
  pointAt,
  pointsFor,
  ROUNDS,
  start,
  type ThresholdData,
} from "./threshold";

/**
 * Where's the Line.
 */

const data: ThresholdData = JSON.parse(
  readFileSync("public/data/threshold.json", "utf8"),
);

const rolls = Array.from({ length: 20 }, (_, i) => ((i * 31) % 100) / 100);

function stopOf(id: string) {
  const found = data.stops.find((s) => s.id === id);
  if (!found) throw new Error(`no stop ${id}`);
  return found;
}

function scenarioOf(id: string) {
  const found = data.scenarios.find((s) => s.id === id);
  if (!found) throw new Error(`no scenario ${id}`);
  return found;
}

describe("the measurements", () => {
  it("has one point per held-out message, labelled", () => {
    expect(data.points.length).toBe(data.corpus.testSize);
    const spam = data.points.filter(([, y]) => y === 1).length;
    expect(spam).toBe(data.corpus.spamInTest);
    for (const [p, y] of data.points) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(y === 0 || y === 1).toBe(true);
    }
  });

  it("counts the same four numbers at every swept threshold", () => {
    for (const point of data.curve) {
      expect(
        point.caught + point.falseAlarms + point.missed + point.leftAlone,
      ).toBe(data.corpus.testSize);
    }
  });

  it("never lets recall rise as the line moves right", () => {
    const sorted = [...data.curve].sort((a, b) => a.threshold - b.threshold);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].recall).toBeLessThanOrEqual(sorted[i - 1].recall);
    }
  });
});

describe("the claims the chapter makes out loud", () => {
  it("trades recall for precision between the two extremes", () => {
    const loose = stopOf("everything");
    const tight = stopOf("cautious");
    expect(loose.recall).toBeGreaterThan(0.99);
    expect(loose.precision).toBeLessThan(0.2);
    expect(tight.precision).toBe(1);
    expect(tight.recall).toBeLessThan(0.75);
  });

  it("has accuracy that flatters the useless end", () => {
    // Flagging everything catches nearly all the spam and is still terrible.
    expect(stopOf("everything").accuracy).toBeLessThan(0.35);
    // And the cautious end looks respectable while missing a third of it.
    expect(stopOf("cautious").accuracy).toBeGreaterThan(0.95);
  });

  it("moves the cheapest line when the costs change", () => {
    const bank = scenarioOf("bank");
    const phone = scenarioOf("inbox");
    expect(bank.best.threshold).toBeLessThan(phone.best.threshold);
    expect(bank.best.caught).toBeGreaterThan(phone.best.caught);
    expect(bank.best.falseAlarms).toBeGreaterThan(phone.best.falseAlarms);
  });
});

describe("scoring", () => {
  it("gives full marks for the cheapest of the five choices offered", () => {
    for (const scenario of data.scenarios) {
      const best = dialCosts(data, scenario).reduce((a, b) =>
        b.cost < a.cost ? b : a,
      );
      expect(pointsFor(data, scenario, best.id)).toBe(120);
    }
  });

  it("pays less the more a choice costs", () => {
    const bank = scenarioOf("bank");
    // Insisting on certainty lets fraud through, which this scenario hates.
    expect(costOf(bank, pointAt(data, 0.999999))).toBeGreaterThan(
      costOf(bank, pointAt(data, 0.05)),
    );
    expect(pointsFor(data, bank, "certain")).toBeLessThan(
      pointsFor(data, bank, "lean-flag"),
    );
  });

  it("wants opposite ends of the dial in opposite situations", () => {
    const cheapest = (id: string) =>
      dialCosts(data, scenarioOf(id)).reduce((a, b) =>
        b.cost < a.cost ? b : a,
      ).id;
    expect(cheapest("bank")).toBe("lean-flag");
    expect(cheapest("hospital")).toBe("lean-leave");
  });

  it("finds the swept point nearest a threshold", () => {
    const point = pointAt(data, 0.5);
    expect(Math.abs(point.threshold - 0.5)).toBeLessThan(0.05);
  });
});

describe("the scene", () => {
  it("deals rounds and ends after the last one", () => {
    let scene = start(data, rolls);
    expect(scene.rounds.length).toBe(Math.min(ROUNDS, data.scenarios.length));
    for (let i = 0; i < scene.rounds.length; i++) {
      scene = next(call(data, scene, "half"));
    }
    expect(scene.done).toBe(true);
  });

  it("ignores a second call, and will not advance without one", () => {
    const scene = start(data, rolls);
    const once = call(data, scene, "half");
    expect(call(data, once, "anything")).toBe(once);
    expect(next(scene)).toBe(scene);
    expect(current(newScene())).toBeUndefined();
  });

  it("counts a run only while every call is the cheapest one", () => {
    const scene = start(data, rolls);
    const scenario = current(scene)!;
    const worst = dialCosts(data, scenario).reduce((a, b) =>
      b.cost > a.cost ? b : a,
    );
    expect(call(data, scene, worst.id).streak).toBe(0);
  });

  it("deals every scenario at most once", () => {
    const seen = new Set(deal(data, rolls).map((s) => s.id));
    expect(seen.size).toBe(Math.min(ROUNDS, data.scenarios.length));
  });
});
