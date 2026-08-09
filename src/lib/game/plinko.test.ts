import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LogitData, LogitPrompt } from "@/lib/logits";
import {
  boardWeights,
  DROPS,
  drop,
  MAX_T,
  MIN_T,
  newScene,
  orderFrom,
  type PlinkoScene,
  promptOf,
  setTemperature,
  SLOTS,
  slotFor,
  start,
  targetFor,
} from "./plinko";

/**
 * The rules of Plinko.
 */

const REAL: LogitData = JSON.parse(
  readFileSync("public/data/logits.json", "utf8"),
);

/** log(4), log(2), log(1), so at temperature 1 the odds are 4 : 2 : 1. */
const TOY: LogitPrompt = {
  id: "toy",
  text: "toy",
  why: "test fixture",
  tokens: [],
  candidates: [
    { id: 0, text: " a", logit: Math.log(4), probability: 4 / 7 },
    { id: 1, text: " b", logit: Math.log(2), probability: 2 / 7 },
    { id: 2, text: " c", logit: Math.log(1), probability: 1 / 7 },
  ],
  byTemperature: {},
  topProbability: 4 / 7,
  entropyBits: 0,
  vocabSize: 3,
};

const TOY_DATA: LogitData = {
  model: { id: "toy", name: "toy", url: "", licence: "", note: "" },
  topK: 3,
  temperatures: [1],
  prompts: [TOY],
};

function playing(over: Partial<PlinkoScene> = {}): PlinkoScene {
  return { ...newScene(), order: [0], ...over };
}

describe("the shipped data", () => {
  it("has enough candidates on every prompt to fill the board", () => {
    for (const p of REAL.prompts) {
      expect(p.candidates.length).toBeGreaterThanOrEqual(SLOTS);
    }
  });
});

describe("boardWeights", () => {
  it("reproduces the recorded odds at temperature 1", () => {
    const w = boardWeights(TOY, 1);
    expect(w[0]).toBeCloseTo(4 / 7, 12);
    expect(w[1]).toBeCloseTo(2 / 7, 12);
    expect(w[2]).toBeCloseTo(1 / 7, 12);
  });

  it("sums to one on every real prompt at every dial setting", () => {
    for (const p of REAL.prompts) {
      for (const t of [MIN_T, 0.5, 1, 1.5, MAX_T]) {
        const sum = boardWeights(p, t).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 10);
      }
    }
  });

  it("sharpens toward the top token as the dial goes cold", () => {
    expect(boardWeights(TOY, 0.2)[0]).toBeGreaterThan(boardWeights(TOY, 1)[0]);
  });

  it("flattens toward the tail as the dial goes hot", () => {
    expect(boardWeights(TOY, 2)[2]).toBeGreaterThan(boardWeights(TOY, 1)[2]);
  });

  it("keeps the ranking whatever the dial does, temperature never reorders", () => {
    for (const t of [MIN_T, 0.7, 1, 1.4, MAX_T]) {
      const w = boardWeights(REAL.prompts[0], t);
      for (let i = 1; i < w.length; i++) {
        expect(w[i]).toBeLessThanOrEqual(w[i - 1] + 1e-12);
      }
    }
  });
});

describe("slotFor", () => {
  const w = [0.5, 0.3, 0.2];

  it("maps a roll to the slot whose band it falls in", () => {
    expect(slotFor(w, 0)).toBe(0);
    expect(slotFor(w, 0.49)).toBe(0);
    expect(slotFor(w, 0.5)).toBe(1);
    expect(slotFor(w, 0.79)).toBe(1);
    expect(slotFor(w, 0.8)).toBe(2);
    expect(slotFor(w, 0.999999)).toBe(2);
  });

  it("never falls off the end on a roll of almost exactly one", () => {
    expect(slotFor(w, 1 - Number.EPSILON)).toBeLessThan(w.length);
  });

  it("draws each slot at its own rate over many rolls", () => {
    const counts = [0, 0, 0];
    const n = 30_000;
    for (let i = 0; i < n; i++) counts[slotFor(w, (i + 0.5) / n)]++;
    expect(counts[0] / n).toBeCloseTo(0.5, 3);
    expect(counts[1] / n).toBeCloseTo(0.3, 3);
    expect(counts[2] / n).toBeCloseTo(0.2, 3);
  });
});

describe("targetFor", () => {
  it("only ever asks for a slot that is on the board", () => {
    for (const p of REAL.prompts) {
      for (let r = 0; r < 1; r += 0.01) {
        const t = targetFor(p, r);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(SLOTS);
      }
    }
  });

  it("does not run off the end on a roll of one", () => {
    expect(targetFor(TOY, 1)).toBe(2);
  });
});

describe("orderFrom", () => {
  it("is a permutation, losing and repeating nothing", () => {
    const rolls = Array.from({ length: 9 }, (_, i) => ((i * 7) % 10) / 10);
    const order = orderFrom(9, rolls);
    expect([...order].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it("survives being handed no rolls at all", () => {
    expect(orderFrom(3, []).sort()).toEqual([0, 1, 2]);
  });
});

describe("setTemperature", () => {
  it("clamps to the dial's range", () => {
    expect(setTemperature(playing(), 99).temperature).toBe(MAX_T);
    expect(setTemperature(playing(), -5).temperature).toBe(MIN_T);
  });

  it("returns the same object when nothing changed", () => {
    const s = playing();
    expect(setTemperature(s, s.temperature)).toBe(s);
  });
});

describe("drop", () => {
  it("spends one ball", () => {
    const after = drop(TOY_DATA, playing(), 0.1, 0.1);
    expect(after.dropsLeft).toBe(DROPS - 1);
    expect(after.balls).toBe(1);
  });

  it("scores a hit and not a miss", () => {
    const hit = drop(TOY_DATA, playing({ target: 0 }), 0.1, 0.1);
    expect(hit.hits).toBe(1);
    expect(hit.score).toBeGreaterThan(0);

    const miss = drop(TOY_DATA, playing({ target: 2 }), 0.1, 0.1);
    expect(miss.hits).toBe(0);
    expect(miss.score).toBe(0);
  });

  it("pays more for a hit that was made less likely", () => {
    const easy = drop(TOY_DATA, playing({ target: 0 }), 0.1, 0.1);
    const hard = drop(
      TOY_DATA,
      playing({ target: 2, temperature: MIN_T }),
      0.999999,
      0.1,
    );
    expect(hard.hits).toBe(1);
    expect(hard.score).toBeGreaterThan(easy.score);
  });

  it("caps the score for a hit so a cold-dial tail shot stays a game", () => {
    const hard = drop(
      TOY_DATA,
      playing({ target: 2, temperature: MIN_T }),
      0.999999,
      0.1,
    );
    expect(hard.score).toBeLessThanOrEqual(900);
  });

  it("refuses to spend a ball the round does not have", () => {
    const empty = playing({ dropsLeft: 0 });
    expect(drop(TOY_DATA, empty, 0.1, 0.1)).toBe(empty);
  });

  it("never lets a burst of clicks drive the ball count negative", () => {
    // The bug this reducer exists to prevent: forty clicks before a re-render.
    let scene = start(
      REAL,
      REAL.prompts.map(() => 0.5),
      0.5,
    );
    for (let i = 0; i < 200; i++) scene = drop(REAL, scene, 0.5, 0.5);
    expect(scene.dropsLeft).toBeGreaterThanOrEqual(0);
    expect(scene.done).toBe(true);
    expect(scene.balls).toBe(REAL.prompts.length * DROPS);
  });

  it("is pure, running it twice on the same scene gives the same scene", () => {
    const s = playing({ target: 1 });
    expect(drop(TOY_DATA, s, 0.7, 0.3)).toEqual(drop(TOY_DATA, s, 0.7, 0.3));
  });

  it("does not mutate the scene it was given", () => {
    const s = playing();
    const before = JSON.stringify(s);
    drop(TOY_DATA, s, 0.1, 0.1);
    expect(JSON.stringify(s)).toBe(before);
  });

  it("moves to the next prompt when the balls run out, and refills them", () => {
    let scene = start(
      REAL,
      REAL.prompts.map(() => 0.5),
      0.5,
    );
    const first = promptOf(REAL, scene);
    for (let i = 0; i < DROPS; i++) scene = drop(REAL, scene, 0.5, 0.5);
    expect(scene.at).toBe(1);
    expect(scene.dropsLeft).toBe(DROPS);
    expect(scene.done).toBe(false);
    expect(promptOf(REAL, scene)).not.toBe(first);
  });

  it("ends the round after the last prompt rather than wrapping round", () => {
    let scene = start(
      REAL,
      REAL.prompts.map(() => 0.5),
      0.5,
    );
    for (let i = 0; i < REAL.prompts.length * DROPS; i++) {
      scene = drop(REAL, scene, 0.5, 0.5);
    }
    expect(scene.done).toBe(true);
    expect(scene.at).toBe(REAL.prompts.length - 1);
  });

  it("keeps the token it landed on, so the message survives a prompt change", () => {
    let scene = start(
      REAL,
      REAL.prompts.map(() => 0.5),
      0.5,
    );
    const prompt = promptOf(REAL, scene)!;
    scene = drop(REAL, scene, 0.5, 0.5);
    const landed = scene.history[0];
    expect(landed.text).toBe(prompt.candidates[landed.index].text);
  });

  it("does nothing before a round has started", () => {
    const s = newScene();
    expect(drop(REAL, s, 0.5, 0.5)).toBe(s);
  });
});
