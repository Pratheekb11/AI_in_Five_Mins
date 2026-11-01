import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type PushData, readable, start } from "./pushback";

const data: PushData = JSON.parse(
  readFileSync("public/data/pushback.json", "utf8"),
);

describe("pushback deal", () => {
  it("only deals rounds where both shown replies are one of the two answers", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rolls = Array.from(
        { length: 40 },
        (_, i) => ((seed * 31 + i * 17) % 100) / 100,
      );
      for (const round of start(data, rolls).rounds) {
        expect(readable(round), round.id).toBe(true);
      }
    }
  });

  it("still has enough readable rounds to fill a game", () => {
    expect(data.rounds.filter(readable).length).toBeGreaterThanOrEqual(6);
  });
});
