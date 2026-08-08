import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeSpace, similarity } from "@/lib/embeddings";
import type { LogitData } from "@/lib/logits";
import {
  advance,
  type BenchScene,
  buildBench,
  call,
  current,
  FUSE,
  multiplierFor,
  newScene,
  next,
  ROUND_SIZE,
  SPECIMENS,
  shuffledBy,
  start,
  type Weighing,
} from "./bench";

/**
 * The Failure bench.
 *
 * The point of most of these is not the reducer at all, it is that every
 * specimen on the bench still measures the way the page says it does. If a
 * data file is regenerated and a specimen stops tipping, or starts tipping the
 * other way, the run fails here rather than quietly teaching something untrue.
 */

const LOGITS: LogitData = JSON.parse(
  readFileSync("public/data/logits.json", "utf8"),
);
const SPACE = decodeSpace(
  JSON.parse(readFileSync("public/data/embeddings.json", "utf8")),
);

const BENCH = buildBench(LOGITS, SPACE);

function level(bench: Weighing[] = BENCH): BenchScene {
  return start(
    bench,
    bench.map(() => 0.5),
  );
}

describe("the bench", () => {
  it("keeps every specimen, none silently dropped for missing data", () => {
    expect(BENCH).toHaveLength(SPECIMENS.length);
  });

  it("has enough specimens to fill a round", () => {
    expect(BENCH.length).toBeGreaterThanOrEqual(ROUND_SIZE);
  });

  it("covers all three failures", () => {
    expect(new Set(BENCH.map((w) => w.kind))).toEqual(
      new Set(["fabrication", "confidence", "inheritance"]),
    );
  });

  it("gives every specimen a genuine winner, never a tie", () => {
    for (const w of BENCH) {
      expect(w.left.value).not.toBe(w.right.value);
    }
  });

  it("puts probabilities and cosines in range, and entropy above zero", () => {
    for (const w of BENCH) {
      for (const pan of [w.left, w.right]) {
        if (w.unit === "probability") {
          expect(pan.value).toBeGreaterThan(0);
          expect(pan.value).toBeLessThanOrEqual(1);
        } else if (w.unit === "cosine") {
          expect(Math.abs(pan.value)).toBeLessThanOrEqual(1);
        } else {
          expect(pan.value).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("what each specimen claims", () => {
  const find = (subject: string, left: string) =>
    BENCH.find((w) => w.subject.includes(subject) && w.left.label === left)!;

  it("Paris: the model puts more on 'the' than on 'France', the fabrication", () => {
    const w = find("Paris", "France");
    expect(w.answer).toBe("right");
    expect(w.right.label).toBe("the");
    expect(w.right.value).toBeGreaterThan(w.left.value);
  });

  it("Paris: the right answer still beats a wrong capital, but barely", () => {
    const w = BENCH.find(
      (s) => s.left.label === "France" && s.right.label === "London",
    )!;
    expect(w.answer).toBe("left");
    expect(w.left.value - w.right.value).toBeLessThan(0.01);
  });

  it("'Once upon a': the obvious ending wins by almost nothing", () => {
    const w = BENCH.find((s) => s.left.label === "time")!;
    expect(w.answer).toBe("left");
    expect(w.left.value - w.right.value).toBeLessThan(0.02);
  });

  it("memorised text is the one place the runner-up is nowhere", () => {
    const w = BENCH.find((s) => s.left.label === "earth")!;
    expect(w.answer).toBe("left");
    expect(w.left.value).toBeGreaterThan(0.9);
    expect(w.right.value).toBeLessThan(0.01);
  });

  it("it is more certain about the prompt it gets wrong", () => {
    const w = BENCH.find(
      (s) => s.kind === "confidence" && s.left.label.startsWith("Paris"),
    )!;
    // Fewer bits is more certain, so the smaller number takes the round.
    expect(w.answer).toBe("left");
    expect(w.left.value).toBeLessThan(w.right.value);
  });

  it("'cloud' is nearer weather than computing in 2014 text", () => {
    const w = BENCH.find((s) => s.subject === "cloud")!;
    expect(w.answer).toBe("left");
    expect(w.left.label).toBe("rain");
  });

  it("'apple' is nearer the company than the fruit", () => {
    const w = BENCH.find((s) => s.subject === "apple")!;
    expect(w.answer).toBe("right");
    expect(w.right.label).toBe("software");
  });

  it("'nurse' leans one way and 'engineer' the other, the inherited lean", () => {
    expect(BENCH.find((s) => s.subject === "nurse")!.answer).toBe("left");
    expect(BENCH.find((s) => s.subject === "engineer")!.answer).toBe("right");
  });

  it("'secretary' contradicts the stereotype, which is why it is on the bench", () => {
    expect(BENCH.find((s) => s.subject === "secretary")!.answer).toBe("right");
  });

  it("'doctor' is close enough to be a coin toss", () => {
    const w = BENCH.find((s) => s.subject === "doctor")!;
    expect(Math.abs(w.left.value - w.right.value)).toBeLessThan(0.05);
  });

  it("reads its numbers straight out of the shipped files", () => {
    const w = BENCH.find((s) => s.subject === "nurse")!;
    expect(w.left.value).toBe(similarity(SPACE, "nurse", "she"));
    const paris = LOGITS.prompts.find((p) => p.id === "fact")!;
    const fabricated = BENCH.find(
      (s) => s.left.label === "France" && s.right.label === "the",
    )!;
    expect(fabricated.right.value).toBe(
      paris.candidates.find((c) => c.text === " the")!.probability,
    );
  });
});

describe("shuffledBy", () => {
  it("keeps every specimen", () => {
    const rolls = BENCH.map((_, i) => ((i * 7) % 11) / 11);
    expect(shuffledBy(BENCH, rolls)).toHaveLength(BENCH.length);
    expect(new Set(shuffledBy(BENCH, rolls))).toEqual(new Set(BENCH));
  });

  it("does not touch the array it was handed", () => {
    const before = [...BENCH];
    shuffledBy(
      BENCH,
      BENCH.map(() => 0.9),
    );
    expect(BENCH).toEqual(before);
  });
});

describe("multiplierFor", () => {
  it("rises every two calls and then stops", () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(1)).toBe(1);
    expect(multiplierFor(2)).toBe(2);
    expect(multiplierFor(4)).toBe(3);
    expect(multiplierFor(99)).toBe(4);
  });
});

describe("the clock", () => {
  it("runs down", () => {
    const s = advance(level(), 1);
    expect(s.fuse).toBeCloseTo(FUSE - 1, 6);
  });

  it("calls a timeout when it hits zero, and breaks the streak", () => {
    const s = advance({ ...level(), fuse: 0.1, streak: 5 }, 0.2);
    expect(s.called).toBe("timeout");
    expect(s.fuse).toBe(0);
    expect(s.streak).toBe(0);
  });

  it("stops once the specimen has been called", () => {
    const called = call(level(), "left");
    expect(advance(called, 5)).toBe(called);
  });

  it("does nothing before a round starts", () => {
    const s = newScene();
    expect(advance(s, 1)).toBe(s);
  });
});

describe("call", () => {
  it("scores the right pan and not the wrong one", () => {
    const scene = level();
    const answer = current(scene)!.answer;
    const other = answer === "left" ? "right" : "left";
    expect(call(scene, answer).score).toBeGreaterThan(0);
    expect(call(scene, other).score).toBe(0);
  });

  it("pays more for calling it quickly", () => {
    const scene = level();
    const answer = current(scene)!.answer;
    const fast = call(scene, answer).score;
    const slow = call({ ...scene, fuse: 0.5 }, answer).score;
    expect(fast).toBeGreaterThan(slow);
  });

  it("resets the streak on a wrong call and keeps the best", () => {
    let scene = { ...level(), streak: 3, bestStreak: 3 };
    const other = current(scene)!.answer === "left" ? "right" : "left";
    scene = call(scene, other);
    expect(scene.streak).toBe(0);
    expect(scene.bestStreak).toBe(3);
  });

  it("ignores a second call on the same specimen", () => {
    const once = call(level(), "left");
    expect(call(once, "right")).toBe(once);
  });

  it("does not mutate the scene it was given", () => {
    const scene = level();
    const before = JSON.stringify(scene);
    call(scene, "left");
    expect(JSON.stringify(scene)).toBe(before);
  });

  it("is pure, the same call twice gives the same scene", () => {
    const scene = level();
    expect(call(scene, "left")).toEqual(call(scene, "left"));
  });
});

describe("next", () => {
  it("refuses to skip a specimen that has not been called", () => {
    const scene = level();
    expect(next(scene)).toBe(scene);
  });

  it("resets the clock for the next specimen", () => {
    const scene = next(call({ ...level(), fuse: 2 }, "left"));
    expect(scene.fuse).toBe(FUSE);
    expect(scene.at).toBe(1);
    expect(scene.called).toBeNull();
  });

  it("records the failure even when the player got it wrong", () => {
    const scene = level();
    const other = current(scene)!.answer === "left" ? "right" : "left";
    const after = next(call(scene, other));
    expect(after.seen).toContain(current(scene)!.kind);
  });

  it("ends the round after the last specimen rather than wrapping", () => {
    let scene = level();
    for (let i = 0; i < ROUND_SIZE * 3; i++) scene = next(call(scene, "left"));
    expect(scene.done).toBe(true);
    expect(scene.at).toBe(ROUND_SIZE - 1);
  });

  it("shows every failure at least once over a full round", () => {
    let scene = start(
      BENCH,
      BENCH.map((_, i) => i / BENCH.length),
    );
    while (!scene.done) scene = next(call(scene, "left"));
    expect(scene.seen.length).toBeGreaterThanOrEqual(2);
  });
});
