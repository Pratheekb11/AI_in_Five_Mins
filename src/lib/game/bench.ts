/**
 * The rules of the Failure bench, as pure functions.
 *
 * Three failures that get talked about as if they were three different bugs,
 * making things up, sounding certain while wrong, and carrying prejudice, and
 * one cause underneath all of them: the thing was fitted to text, and text is
 * not the world.
 *
 * The bench proves that rather than asserting it. Each specimen is a real
 * measurement on data already shipped with this site, and the player calls
 * which way it went before it is weighed.
 *
 * HONESTY, and this one matters more here than anywhere else on the site.
 * Which specimens go on the bench is an editorial choice and is listed below
 * with no numbers in it. Every number comes out of `logits.json` or
 * `embeddings.json` at run time, computed by the same functions the rest of the
 * site uses. Nothing is typed in by hand, so nothing can drift, and a specimen
 * that stopped being true would fail loudly rather than keep printing an old
 * figure. Two of the specimens contradict the point they look like they are
 * making, they are kept precisely because they do.
 *
 * PURITY. The reducer never rolls a die. Draws are made by the caller and
 * passed in as numbers, so a state updater running twice changes nothing.
 */

import { similarity, type EmbeddingSpace } from "@/lib/embeddings";
import type { LogitData } from "@/lib/logits";

/* ------------------------------------------------------------------ rules -- */

export const ROUND_SIZE = 9;
/** Seconds on the clock. Short enough that the first instinct is the answer. */
export const FUSE = 9;
export const BASE_POINTS = 60;
/** Called fast and called right is worth more than called right. */
export const SPEED_POINTS = 60;
export const MAX_MULTIPLIER = 4;
export const STREAK_STEP = 2;

export function multiplierFor(streak: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(streak / STREAK_STEP));
}

/* ------------------------------------------------------------------ types -- */

export type Failure = "fabrication" | "confidence" | "inheritance";

export const FAILURES: Record<Failure, { name: string; blurb: string }> = {
  fabrication: {
    name: "Makes things up",
    blurb:
      "It was fitted to continue text, not to answer questions. Where those two come apart, the continuation wins.",
  },
  confidence: {
    name: "Sounds sure either way",
    blurb:
      "How certain it is and how right it is are two different measurements, and only one of them reaches you.",
  },
  inheritance: {
    name: "Carries what it read",
    blurb:
      "The associations in the training text end up in the model. Not as opinions, but as geometry.",
  },
};

/** An editorial choice of what to weigh. Deliberately holds no numbers. */
type SpecimenSpec =
  | {
      kind: "fabrication";
      /** Prompt id in `logits.json`. */
      prompt: string;
      /** The two candidate tokens, exactly as the tokenizer produced them. */
      a: string;
      b: string;
      ask: string;
      tell: string;
    }
  | {
      kind: "confidence";
      /** Two prompt ids in `logits.json`. Certainty is measured, not asserted. */
      a: string;
      b: string;
      ask: string;
      tell: string;
    }
  | {
      kind: "inheritance";
      /** The word under test, and the two words it might sit nearer. */
      subject: string;
      a: string;
      b: string;
      ask: string;
      tell: string;
    };

export const SPECIMENS: readonly SpecimenSpec[] = [
  {
    kind: "fabrication",
    prompt: "fact",
    a: " France",
    b: " the",
    ask: "Which token did the model actually put more weight on?",
    tell: "It is finishing a sentence, not answering a question. The grammar of “the capital of the …” is commoner in text than the fact is, so the grammar wins.",
  },
  {
    kind: "fabrication",
    prompt: "fact",
    a: " France",
    b: " London",
    ask: "The right answer, or a wrong capital city?",
    tell: "The right answer does win here, by a whisker. That margin is the entire distance between the model being right and the model naming another city with total composure.",
  },
  {
    kind: "fabrication",
    prompt: "open",
    a: " time",
    b: " second",
    ask: "You know how this phrase ends. Did the model?",
    tell: "Barely. What feels inevitable to you is one of hundreds of continuations it has read, and the gap between first and second place is almost nothing.",
  },
  {
    kind: "fabrication",
    prompt: "memorised",
    a: " earth",
    b: " Earth",
    ask: "Text it has read thousands of times. Which capitalisation won?",
    tell: "When the phrase really is memorised, the distribution collapses onto one token and the runner-up is nowhere. That is what confidence looks like from the inside, and it is rare.",
  },
  {
    kind: "confidence",
    a: "fact",
    b: "open",
    ask: "Which one was the model more certain about?",
    tell: "It was more certain about the one it gets wrong. Certainty is measured over its own guesses about text. Nothing in it is a measure of being right.",
  },
  {
    kind: "confidence",
    a: "torn",
    b: "certain",
    ask: "Which one was the model more certain about?",
    tell: "One is a genuine coin flip and the other is a landslide. Both come out of the model as an ordinary sentence, with nothing in the wording to tell them apart.",
  },
  {
    kind: "inheritance",
    subject: "cloud",
    a: "rain",
    b: "internet",
    ask: "In six billion words of 2014 news and Wikipedia, which is “cloud” nearer?",
    tell: "Weather, comfortably. The corpus is from 2014, and a word means whatever the text it was fitted on meant by it. Nothing here has been out to look at the sky since.",
  },
  {
    kind: "inheritance",
    subject: "apple",
    a: "orange",
    b: "software",
    ask: "Which is “apple” nearer?",
    tell: "The company, not the fruit. One vector has to hold every sense of a word at once, and the sense that dominates is whichever one the writers were writing about.",
  },
  {
    kind: "inheritance",
    subject: "nurse",
    a: "she",
    b: "he",
    ask: "Which is “nurse” nearer in that text?",
    tell: "This is not the model having a view about nursing. It is a distance between two vectors, and it got there because of how the text talked. That is exactly what makes it hard to remove: there is nothing to argue with.",
  },
  {
    kind: "inheritance",
    subject: "engineer",
    a: "she",
    b: "he",
    ask: "Which is “engineer” nearer in that text?",
    tell: "The lean goes the other way, and the two together are the finding: the geometry has picked up who the corpus wrote about in which job.",
  },
  {
    kind: "inheritance",
    subject: "secretary",
    a: "she",
    b: "he",
    ask: "Which is “secretary” nearer in that text?",
    tell: "Not the way the stereotype predicts. This corpus is half newswire, and in newswire a secretary is usually a Secretary of State. The measurement is of a particular pile of text. Swap the pile and you swap the answer, which is the honest version of this whole subject.",
  },
  {
    kind: "inheritance",
    subject: "doctor",
    a: "she",
    b: "he",
    ask: "Which is “doctor” nearer in that text?",
    tell: "Close enough to be a coin toss. Not every word carries a lean, and reporting only the ones that do is how this subject gets exaggerated in both directions.",
  },
];

export type Weighing = {
  kind: Failure;
  ask: string;
  tell: string;
  /** Prompt text or word under test, shown above the scale. */
  subject: string;
  /** Extra line under the subject, when the specimen needs it. */
  note?: string;
  left: { label: string; value: number };
  right: { label: string; value: number };
  /** Units the two values are in, for the reveal. */
  unit: "probability" | "bits" | "cosine";
  /** Which pan goes down. Higher wins except for certainty, which is inverted. */
  answer: "left" | "right";
};

/* -------------------------------------------------------------- weighing -- */

/**
 * Turns the editorial list into weighings, measuring every value.
 *
 * A specimen whose words are not in the shipped data is dropped rather than
 * approximated, so a missing word costs a round and never invents one.
 */
export function buildBench(
  logits: LogitData,
  space: EmbeddingSpace,
): Weighing[] {
  const out: Weighing[] = [];

  for (const spec of SPECIMENS) {
    if (spec.kind === "fabrication") {
      const prompt = logits.prompts.find((p) => p.id === spec.prompt);
      if (!prompt) continue;
      const a = prompt.candidates.find((c) => c.text === spec.a);
      const b = prompt.candidates.find((c) => c.text === spec.b);
      if (!a || !b || a.probability === b.probability) continue;
      out.push({
        kind: spec.kind,
        ask: spec.ask,
        tell: spec.tell,
        subject: `${prompt.text} …`,
        left: { label: spec.a.trim() || "␣", value: a.probability },
        right: { label: spec.b.trim() || "␣", value: b.probability },
        unit: "probability",
        answer: a.probability > b.probability ? "left" : "right",
      });
      continue;
    }

    if (spec.kind === "confidence") {
      const a = logits.prompts.find((p) => p.id === spec.a);
      const b = logits.prompts.find((p) => p.id === spec.b);
      if (!a || !b || a.entropyBits === b.entropyBits) continue;
      out.push({
        kind: spec.kind,
        ask: spec.ask,
        tell: spec.tell,
        subject: "Two prompts, same model, same moment.",
        note: "Certainty is measured as entropy: fewer bits means the weight is piled on fewer tokens.",
        left: { label: `${a.text} …`, value: a.entropyBits },
        right: { label: `${b.text} …`, value: b.entropyBits },
        unit: "bits",
        // Fewer bits is more certain, so the smaller number wins this one.
        answer: a.entropyBits < b.entropyBits ? "left" : "right",
      });
      continue;
    }

    const a = similarity(space, spec.subject, spec.a);
    const b = similarity(space, spec.subject, spec.b);
    if (a === null || b === null || a === b) continue;
    out.push({
      kind: spec.kind,
      ask: spec.ask,
      tell: spec.tell,
      subject: spec.subject,
      note: space.source.trainedOn,
      left: { label: spec.a, value: a },
      right: { label: spec.b, value: b },
      unit: "cosine",
      answer: a > b ? "left" : "right",
    });
  }

  return out;
}

/** A shuffled copy, from one roll per position in [0, 1). */
export function shuffledBy<T>(items: readonly T[], rolls: number[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor((rolls[i] ?? 0) * (i + 1)));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/* ----------------------------------------------------------------- scene -- */

export type BenchScene = {
  bench: Weighing[];
  at: number;
  /** Null until the player calls it; "timeout" when the clock beat them. */
  called: "left" | "right" | "timeout" | null;
  fuse: number;
  score: number;
  right: number;
  streak: number;
  bestStreak: number;
  /** Which failures the player has now seen weighed. */
  seen: Failure[];
  done: boolean;
};

export function newScene(): BenchScene {
  return {
    bench: [],
    at: 0,
    called: null,
    fuse: FUSE,
    score: 0,
    right: 0,
    streak: 0,
    bestStreak: 0,
    seen: [],
    done: false,
  };
}

export function start(bench: Weighing[], rolls: number[]): BenchScene {
  return {
    ...newScene(),
    bench: shuffledBy(bench, rolls).slice(0, ROUND_SIZE),
  };
}

export function current(scene: BenchScene): Weighing | undefined {
  return scene.bench[scene.at];
}

/** The clock, run once per frame. It only ever runs the fuse down. */
export function advance(scene: BenchScene, delta: number): BenchScene {
  if (scene.done || scene.called !== null || scene.bench.length === 0) {
    return scene;
  }
  const fuse = scene.fuse - delta;
  if (fuse > 0) return { ...scene, fuse };
  return { ...scene, fuse: 0, called: "timeout", streak: 0 };
}

export function call(scene: BenchScene, side: "left" | "right"): BenchScene {
  const weighing = current(scene);
  if (!weighing || scene.done || scene.called !== null) return scene;

  const ok = side === weighing.answer;
  if (!ok) {
    return { ...scene, called: side, streak: 0 };
  }


  const speed = Math.round(SPEED_POINTS * (scene.fuse / FUSE));
  const streak = scene.streak + 1;
  return {
    ...scene,
    called: side,
    score: scene.score + (BASE_POINTS + speed) * multiplierFor(scene.streak),
    right: scene.right + 1,
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
  };
}

/**
 * On to the next specimen.
 *
 * The failure this one demonstrated is recorded here rather than in `call`,
 * because the measurement is shown either way, a player who guessed wrong has
 * still watched it weighed.
 */
export function next(scene: BenchScene): BenchScene {
  if (scene.called === null) return scene;
  const weighing = current(scene);
  const seen =
    weighing && !scene.seen.includes(weighing.kind)
      ? [...scene.seen, weighing.kind]
      : scene.seen;
  const at = scene.at + 1;
  if (at >= scene.bench.length) return { ...scene, seen, done: true };
  return { ...scene, seen, at, called: null, fuse: FUSE };
}
