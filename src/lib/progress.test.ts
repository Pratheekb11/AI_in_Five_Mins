import { describe, expect, it } from "vitest";
import { migrate, rollStreak } from "./progress";

describe("rollStreak", () => {
  it("starts a fresh streak at 1", () => {
    expect(rollStreak({ days: 0, last: "" }, "2026-08-20")).toEqual({
      days: 1,
      last: "2026-08-20",
    });
  });

  it("is a no-op solving twice on the same day", () => {
    const s = { days: 4, last: "2026-08-20" };
    expect(rollStreak(s, "2026-08-20")).toBe(s);
  });

  it("extends on a strictly consecutive day with no grace", () => {
    expect(
      rollStreak({ days: 4, last: "2026-08-20" }, "2026-08-21", 0),
    ).toEqual({ days: 5, last: "2026-08-21" });
  });

  it("resets after one missed day with no grace", () => {
    expect(
      rollStreak({ days: 4, last: "2026-08-19" }, "2026-08-21", 0),
    ).toEqual({ days: 1, last: "2026-08-21" });
  });

  it("with a one-day grace, forgives exactly one missed day", () => {
    expect(
      rollStreak({ days: 4, last: "2026-08-19" }, "2026-08-21", 1),
    ).toEqual({ days: 5, last: "2026-08-21" });
  });

  it("with a one-day grace, still resets after two missed days", () => {
    expect(
      rollStreak({ days: 4, last: "2026-08-18" }, "2026-08-21", 1),
    ).toEqual({ days: 1, last: "2026-08-21" });
  });
});

describe("progress migration", () => {
  it("stamps the current version onto a pre-versioning (v1) record", () => {
    const legacy = {
      completed: ["what-an-llm-is"],
      scores: { "what-an-llm-is": 0.8 },
      streak: { days: 3, last: "2026-08-20" },
    };
    const migrated = migrate(legacy);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.completed).toEqual(["what-an-llm-is"]);
    expect(migrated.scores).toEqual({ "what-an-llm-is": 0.8 });
    expect(migrated.streak).toEqual({ days: 3, last: "2026-08-20" });
    expect(migrated.puzzleStreak).toEqual({ days: 0, last: "" });
    expect(migrated.nimoDismissed).toBe(false);
  });

  it("carries a v2 record's fields forward and adds the new ones", () => {
    const v2 = {
      schemaVersion: 2,
      completed: ["tokens"],
      scores: { tokens: 1 },
      streak: { days: 5, last: "2026-08-22" },
    };
    const migrated = migrate(v2);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.streak).toEqual({ days: 5, last: "2026-08-22" });
    expect(migrated.puzzleStreak).toEqual({ days: 0, last: "" });
    expect(migrated.nimoDismissed).toBe(false);
  });

  it("fills in sane defaults for a record missing fields entirely", () => {
    const migrated = migrate({});
    expect(migrated).toEqual({
      schemaVersion: 3,
      completed: [],
      scores: {},
      streak: { days: 0, last: "" },
      puzzleStreak: { days: 0, last: "" },
      nimoDismissed: false,
    });
  });

  it("reads a record written by a newer build instead of wiping it", () => {
    const fromTheFuture = {
      schemaVersion: 99,
      completed: ["tokens"],
      scores: { tokens: 1 },
      streak: { days: 1, last: "2026-09-01" },
      puzzleStreak: { days: 4, last: "2026-09-01" },
      nimoDismissed: true,
    };
    const migrated = migrate(fromTheFuture);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.completed).toEqual(["tokens"]);
    expect(migrated.puzzleStreak).toEqual({ days: 4, last: "2026-09-01" });
    expect(migrated.nimoDismissed).toBe(true);
  });

  it("does not choke on malformed shapes", () => {
    const migrated = migrate({
      completed: "not an array" as unknown as string[],
      scores: null as unknown as Record<string, number>,
      streak: { days: "three" as unknown as number, last: "" },
    });
    expect(migrated.completed).toEqual([]);
    expect(migrated.scores).toEqual({});
    expect(migrated.streak).toEqual({ days: 0, last: "" });
    expect(migrated.puzzleStreak).toEqual({ days: 0, last: "" });
    expect(migrated.nimoDismissed).toBe(false);
  });
});
