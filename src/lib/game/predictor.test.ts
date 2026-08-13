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

/** A word, once the leading space is gone. Not " Bre", not " Sch". */
const WORD = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*$/;

describe("the rounds on offer", () => {
  it("prints a word for every option", () => {
    for (const round of data.rounds) {
      for (const option of round.options) {
        const shown = (option.label ?? option.text).trim();
        expect(
          WORD.test(shown),
          `${round.id} offers "${shown}"`,
        ).toBe(true);
      }
    }
  });

  it("keeps the label honest: it starts with the token that was measured", () => {
    for (const round of data.rounds) {
      const truth = round.options[round.truth];
      if (!truth.label) {
        expect(round.truthChunks).toBeUndefined();
        continue;
      }
      // The number belongs to the first chunk, so the word has to start there.
      expect(truth.label.startsWith(truth.text)).toBe(true);
      expect(round.truthChunks?.[0]).toBe(truth.text);
      expect(round.truthChunks!.join("")).toBe(truth.label);
      expect(round.truthChunks!.length).toBeGreaterThan(1);
    }
  });

  it("still has the two words this model cannot write in one token", () => {
    const labelled = data.rounds.filter((r) => r.truthChunks);
    expect(labelled.map((r) => r.id).sort()).toEqual([
      "brasilia",
      "photosynthesis",
    ]);
    const plants = data.rounds.find((r) => r.id === "photosynthesis")!;
    expect(plants.options[plants.truth].label?.trim()).toBe("photosynthesis");
    // Measured, and the reason the round is worth playing at all.
    expect(plants.answerRank).toBe(810);
  });

  it("never offers the same word twice in one round", () => {
    for (const round of data.rounds) {
      const shown = round.options.map((o) =>
        (o.label ?? o.text).trim().toLowerCase(),
      );
      expect(new Set(shown).size, round.id).toBe(shown.length);
    }
  });
});

describe("a dealt set", () => {
  it("deals one phrase, one book sentence and two facts", () => {
    const rounds = deal(data, rolls);
    expect(rounds).toHaveLength(ROUND_SIZE);
    expect(rounds.map((r) => r.kind)).toEqual([
      "phrase",
      "corpus",
      "fact",
      "fact",
    ]);
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
