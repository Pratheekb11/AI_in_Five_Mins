import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  deal,
  newScene,
  pick,
  type PredictorData,
  ROUND_SIZE,
  start,
} from "./predictor";

/**
 * Beat the Predictor.
 *
 * The rounds are measured offline, so what is worth guarding here is that what
 * goes on screen is a question a person can answer: four words, not four
 * beginnings of words, and a true answer printed as the word it is.
 */

const data: PredictorData = JSON.parse(
  readFileSync("public/data/predictor.json", "utf8"),
);

const rolls = Array.from({ length: 120 }, (_, i) => ((i * 37) % 100) / 100);

/** A complete answer: a word, a name or a short phrase. Not " Bre". */
const ANSWER = /^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9' -]*$/;

/** What the old builder put on screen as answers. None is an answer. */
const FILLER = new Set([
  "the",
  "a",
  "an",
  "and",
  "now",
  "home",
  "located",
  "about",
  "called",
  "not",
]);

const handWritten = data.rounds.filter((r) => r.kind !== "corpus");

describe("the rounds on offer", () => {
  it("prints a complete answer for every option", () => {
    for (const round of data.rounds) {
      for (const option of round.options) {
        const shown = (option.label ?? option.text).trim();
        expect(ANSWER.test(shown), `${round.id} offers "${shown}"`).toBe(true);
      }
    }
  });

  it("never offers a filler word as an answer to a phrase or a fact", () => {
    for (const round of handWritten) {
      for (const option of round.options) {
        expect(FILLER.has(option.text.trim().toLowerCase()), round.id).toBe(
          false,
        );
      }
    }
  });

  it("picks for the AI whichever option it rated highest", () => {
    for (const round of handWritten) {
      const best = Math.max(...round.options.map((o) => o.probability));
      expect(round.options[round.modelPick].probability, round.id).toBe(best);
      const sum = round.options.reduce((t, o) => t + o.probability, 0);
      expect(sum, round.id).toBeCloseTo(1, 3);
    }
  });

  it("still has facts the AI gets wrong, and facts it gets right", () => {
    const facts = data.rounds.filter((r) => r.kind === "fact");
    expect(facts.filter((r) => r.trapped).length).toBeGreaterThanOrEqual(5);
    expect(facts.filter((r) => !r.trapped).length).toBeGreaterThanOrEqual(5);
    // Measured, and the round the chapter is remembered by.
    const india = facts.find((r) => r.id === "delhi")!;
    expect(india.options[india.modelPick].text.trim()).toBe("Mumbai");
  });

  it("never offers the same answer twice in one round", () => {
    for (const round of data.rounds) {
      const shown = round.options.map((o) =>
        (o.label ?? o.text).trim().toLowerCase(),
      );
      expect(new Set(shown).size, round.id).toBe(shown.length);
    }
  });
});

describe("a dealt set", () => {
  it("always ends on a fact the model gets confidently wrong", () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = Array.from(
        { length: 120 },
        (_, i) => ((seed * 7919 + i * 104729) % 1000) / 1000,
      );
      const rounds = deal(data, r);
      expect(rounds.at(-1)?.kind).toBe("fact");
      expect(rounds.at(-1)?.trapped).toBe(true);
    }
  });

  it("deals one phrase the AI gets right, then three facts", () => {
    const rounds = deal(data, rolls);
    expect(rounds).toHaveLength(ROUND_SIZE);
    expect(rounds.map((r) => r.kind)).toEqual([
      "phrase",
      "fact",
      "fact",
      "fact",
    ]);
    expect(rounds[0].trapped).toBe(false);
  });

  it("scores a pick against the true word, not the model's", () => {
    const scene = start(data, rolls);
    const round = scene.rounds[0];
    const after = pick(scene, round.truth);
    expect(after.youRight).toBe(1);
    expect(after.score).toBeGreaterThan(0);
    // A second press on the same round changes nothing.
    expect(pick(after, 0)).toBe(after);
  });

  it("starts empty", () => {
    expect(newScene().rounds).toHaveLength(0);
  });
});
