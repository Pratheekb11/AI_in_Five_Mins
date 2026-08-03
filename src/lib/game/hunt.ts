/**
 * The rules of Hallucination Hunt, as pure functions.
 *
 * A real paragraph with three things wrong in it. Click the words you do not
 * believe. You get six flags for three errors, so guessing at everything costs
 * you the round.
 *
 * The paragraphs are the openings of real Wikipedia articles and the
 * alterations were checked against the cited revision before shipping — see
 * `data/scripts/build-hunt.mjs`. That matters more here than anywhere else on
 * the site: a spot-the-error game with an unreliable answer key teaches people
 * to distrust the wrong things.
 *
 * The clock is deliberately not a fail state. It stops the speed bonus and
 * nothing else, because the skill being drilled is careful reading and putting
 * a guillotine on careful reading trains the opposite habit.
 *
 * PURITY. The date and any draws come from the caller.
 */

/* ------------------------------------------------------------------ types -- */

export type Difficulty = "obvious" | "medium" | "hard";

export type Span = {
  /** Word indices, inclusive. */
  first: number;
  last: number;
  altered: string;
  original: string;
  difficulty: Difficulty;
  why: string;
};

export type Puzzle = {
  id: string;
  title: string;
  url: string;
  revision: number | null;
  text: string;
  words: number;
  spans: Span[];
};

export type HuntData = {
  builtOn: string;
  source: { name: string; licence: string; url: string; note: string };
  charactersUsed: number;
  puzzles: Puzzle[];
};

/* ------------------------------------------------------------------ rules -- */

/** Three errors, six flags. Enough rope to be wrong, not enough to spray. */
export const FLAGS = 6;
export const SECONDS = 60;

const POINTS: Record<Difficulty, number> = {
  obvious: 100,
  medium: 200,
  hard: 350,
};
/** A wrong flag costs, or the winning move is to click every number. */
const WRONG_COST = 120;
/** Full speed bonus at the start of the clock, none once it has run out. */
const SPEED_BONUS = 300;

/**
 * Today, as a plain YYYY-MM-DD string.
 *
 * Taken as an argument everywhere rather than read from the clock, so every
 * function here stays pure and testable.
 */
export function puzzleForDay(data: HuntData, day: string): Puzzle {
  // Days since the epoch, so consecutive days give consecutive puzzles.
  const days = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  const at = Number.isFinite(days)
    ? ((days % data.puzzles.length) + data.puzzles.length) % data.puzzles.length
    : 0;
  return data.puzzles[at];
}

export function spanAt(puzzle: Puzzle, word: number): Span | undefined {
  return puzzle.spans.find((s) => word >= s.first && word <= s.last);
}

/* ----------------------------------------------------------------- scene -- */

export type HuntScene = {
  puzzle: Puzzle | null;
  /** Word indices the player has flagged, in the order they flagged them. */
  flagged: number[];
  /** Spans found, by their first word index. */
  found: number[];
  flagsLeft: number;
  clock: number;
  score: number;
  wrong: number;
  done: boolean;
};

export function newScene(): HuntScene {
  return {
    puzzle: null,
    flagged: [],
    found: [],
    flagsLeft: FLAGS,
    clock: SECONDS,
    score: 0,
    wrong: 0,
    done: false,
  };
}

export function start(puzzle: Puzzle): HuntScene {
  return { ...newScene(), puzzle };
}

/** The clock. It only ever runs down, and running out does not end anything. */
export function tick(scene: HuntScene, delta: number): HuntScene {
  if (!scene.puzzle || scene.done || scene.clock <= 0) return scene;
  return { ...scene, clock: Math.max(0, scene.clock - delta) };
}

/**
 * Flag a word.
 *
 * Flagging any word inside an alteration finds the whole alteration, so a
 * player is not punished for clicking "85%" rather than "The majority".
 */
export function flag(scene: HuntScene, word: number): HuntScene {
  const puzzle = scene.puzzle;
  if (!puzzle || scene.done || scene.flagsLeft <= 0) return scene;
  if (scene.flagged.includes(word)) return scene;

  const span = spanAt(puzzle, word);
  const already = span ? scene.found.includes(span.first) : false;
  if (already) return scene;

  const flagged = [...scene.flagged, word];
  const flagsLeft = scene.flagsLeft - 1;

  if (!span) {
    return {
      ...scene,
      flagged,
      flagsLeft,
      wrong: scene.wrong + 1,
      score: Math.max(0, scene.score - WRONG_COST),
      done: flagsLeft <= 0,
    };
  }

  const found = [...scene.found, span.first];
  // The clock buys points, it does not take them away.
  const speed = Math.round(SPEED_BONUS * (scene.clock / SECONDS));
  const score = scene.score + POINTS[span.difficulty] + speed;

  return {
    ...scene,
    flagged,
    found,
    flagsLeft,
    score,
    done: found.length >= puzzle.spans.length || flagsLeft <= 0,
  };
}

/** Give up, or say you are finished. Reveals whatever is left. */
export function stop(scene: HuntScene): HuntScene {
  return scene.done ? scene : { ...scene, done: true };
}

export function missed(scene: HuntScene): Span[] {
  if (!scene.puzzle) return [];
  return scene.puzzle.spans.filter((s) => !scene.found.includes(s.first));
}
