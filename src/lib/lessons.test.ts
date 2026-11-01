import { describe, expect, it } from "vitest";
import { LESSONS } from "./lessons";

describe("habits", () => {
  const chapters = LESSONS.filter((l) => l.track === "chapter");

  it("every chapter ends with something to do differently", () => {
    expect(chapters).toHaveLength(6);
    for (const lesson of chapters) {
      expect(lesson.habit, lesson.slug).toBeDefined();
    }
  });

  it("the suggested prompt is a different request from the one it replaces", () => {
    for (const lesson of chapters) {
      const habit = lesson.habit!;
      expect(habit.try.length, lesson.slug).toBeGreaterThan(
        habit.instead.length,
      );
      expect(habit.try).not.toBe(habit.instead);
    }
  });
});
