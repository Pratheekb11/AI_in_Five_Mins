import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Model output is printed on screen as measured, and a small model will
 * sometimes continue a harmless prompt somewhere ugly. Any such round is
 * dropped in its builder, and this test fails if one ever reaches the data a
 * page reads.
 */
const BLOCKED = /\b(rap(e|ed|ist)|bitch|whore|slut|porn|nazi|n[i1]gg|fag)\w*/i;

describe("game data", () => {
  it("carries no offensive model output", () => {
    for (const file of readdirSync("public/data")) {
      if (!file.endsWith(".json")) continue;
      // Word lists and vector vocabularies are a dictionary, not output.
      if (/embeddings|clusters|analogy/.test(file))
        continue;
      const text = readFileSync(`public/data/${file}`, "utf8");
      expect(text.match(BLOCKED)?.[0], file).toBeUndefined();
    }
  });
});
