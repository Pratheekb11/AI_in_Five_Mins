import { describe, expect, it } from "vitest";
import {
  CERTIFICATES,
  earned,
  isEarned,
  lessonsFor,
  scoreFor,
} from "./certificate";
import { lessonsIn } from "./lessons";
import type { Progress } from "./progress";

function progressWith(slugs: string[], score = 1): Progress {
  return {
    schemaVersion: 3,
    completed: slugs,
    scores: Object.fromEntries(slugs.map((slug) => [slug, score])),
    streak: { days: 1, last: "2026-08-08" },
    puzzleStreak: { days: 0, last: "" },
    nimoDismissed: false,
  };
}

describe("certificates", () => {
  it("has one for each of the two beginner tracks", () => {
    expect(CERTIFICATES.map((c) => c.id).sort()).toEqual(["chapter", "ml"]);
  });

  it("counts only the modules that are actually built", () => {
    for (const spec of CERTIFICATES) {
      const all = lessonsIn(spec.id);
      const counted = lessonsFor(spec);
      expect(counted.length).toBeGreaterThan(0);
      expect(counted.every((lesson) => lesson.status === "ready")).toBe(true);
      expect(counted.length).toBeLessThanOrEqual(all.length);
    }
  });

  it("is not earned until every module in the track is finished", () => {
    const spec = CERTIFICATES[0];
    const lessons = lessonsFor(spec);
    const allButOne = lessons.slice(0, -1).map((lesson) => lesson.slug);

    expect(isEarned(spec, progressWith(allButOne))).toBe(false);
    expect(
      isEarned(spec, progressWith(lessons.map((lesson) => lesson.slug))),
    ).toBe(true);
  });

  it("does not award one track for finishing another", () => {
    const [chapter, ml] = CERTIFICATES;
    const done = progressWith(lessonsFor(chapter).map((lesson) => lesson.slug));

    expect(isEarned(chapter, done)).toBe(true);
    expect(isEarned(ml, done)).toBe(false);
    expect(earned(done).map((c) => c.id)).toEqual(["chapter"]);
  });

  it("averages the checks over every module, counting a missing one as zero", () => {
    const spec = CERTIFICATES[0];
    const lessons = lessonsFor(spec);
    const all = lessons.map((lesson) => lesson.slug);

    expect(scoreFor(spec, progressWith(all, 1))).toBe(100);
    expect(scoreFor(spec, progressWith(all, 0.5))).toBe(50);

    // One module never checked pulls the mean down rather than being skipped.
    const short = progressWith(all.slice(0, -1), 1);
    expect(scoreFor(spec, short)).toBe(
      Math.round(((lessons.length - 1) / lessons.length) * 100),
    );
  });
});
