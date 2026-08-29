import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { HuntData } from "./hunt";

const data = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/data/hunt.json"), "utf8"),
) as HuntData;

describe("hunt.json", () => {
  it("ships ten puzzles with three alterations each", () => {
    expect(data.puzzles).toHaveLength(10);
    for (const p of data.puzzles) expect(p.spans).toHaveLength(3);
  });

  it("stops at the end of a sentence", () => {
    for (const p of data.puzzles) {
      expect(p.text.trimEnd().slice(-1), p.title).toMatch(/[.!?]/);
    }
  });

  /* The paragraph is read word by word by somebody deciding whether each one
     is true, so everything after the last alteration is text they cannot be
     wrong about. The build cuts there. These bounds are what that produced:
     the ceiling fails if the old full-length slice ever comes back. */
  it("is short enough to actually read", () => {
    for (const p of data.puzzles) {
      const words = p.text.split(" ").length;
      expect(words, p.title).toBeGreaterThanOrEqual(40);
      expect(words, p.title).toBeLessThanOrEqual(115);
    }
  });

  it("keeps every alteration inside the text it ships", () => {
    for (const p of data.puzzles) {
      const words = p.text.split(" ");
      for (const span of p.spans) {
        expect(span.last, p.title).toBeLessThan(words.length);
        expect(p.text).toContain(span.altered);
        expect(words.slice(span.first, span.last + 1).join(" ")).toContain(
          span.altered.split(" ")[0],
        );
      }
    }
  });

  it("cites a revision for every puzzle", () => {
    for (const p of data.puzzles) {
      expect(p.revision, p.title).toBeTruthy();
      expect(p.url).toContain("wikipedia.org");
    }
  });
});
