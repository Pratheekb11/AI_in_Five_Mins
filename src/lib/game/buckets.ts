/**
 * The rules of Four buckets, as pure functions.
 *
 * A task arrives, you decide what you would hand over, and it drops into one of
 * four trays. There is deliberately no right answer here and nothing scores you
 * against one — a decision about your own work cannot be marked by a website,
 * and pretending otherwise would be inventing data.
 *
 * What the round measures instead is real and yours: how many you got through,
 * and which ones you hesitated on. The hesitations are the output. A task you
 * stared at for eight seconds is a task you have not actually decided about,
 * and that is worth knowing before it lands on you at four o'clock on a Friday.
 *
 * The one property the deck asserts is `exposure` — whether a mistake in this
 * task would be caught cheaply in-house or would reach somebody outside. It is
 * a judgement about the written example, stated plainly as such, and it is used
 * only to reflect your own sorting back at you.
 */

import type { Chip } from "@/components/game/assets";

/* ------------------------------------------------------------------ types -- */

export type BucketId = "hand" | "draft" | "think" | "keep";

export type BucketSpec = {
  id: BucketId;
  key: string;
  label: string;
  /** What choosing this bucket actually commits you to. */
  means: string;
};

export const BUCKETS: readonly BucketSpec[] = [
  {
    id: "hand",
    key: "1",
    label: "Hand over",
    means: "It does the work, you skim the result.",
  },
  {
    id: "draft",
    key: "2",
    label: "Draft with",
    means: "It writes the first version, you finish it.",
  },
  {
    id: "think",
    key: "3",
    label: "Think with",
    means: "You do the work, it argues with you while you do.",
  },
  {
    id: "keep",
    key: "4",
    label: "Keep",
    means: "You do this yourself, start to finish.",
  },
];

export function bucketSpec(id: BucketId): BucketSpec {
  return BUCKETS.find((b) => b.id === id)!;
}

/** Whether a mistake stays in the building or does not. */
export type Exposure = "inside" | "outside";

export type Task = {
  text: string;
  exposure: Exposure;
  /** Marks a task the player typed in themselves. */
  mine?: boolean;
};

/**
 * Twenty-eight ordinary knowledge-work tasks, written for this exercise. They
 * are deliberately generic, because the point is for you to recognise your own
 * week in them and then add the parts we could not have guessed.
 */
export const TASKS: readonly Task[] = [
  { text: "Write the weekly team update", exposure: "inside" },
  { text: "Reply to a customer complaint", exposure: "outside" },
  { text: "Summarise a 40-page report you must act on", exposure: "inside" },
  { text: "Draft a job advert for your own team", exposure: "outside" },
  { text: "Decide who to promote", exposure: "inside" },
  { text: "Turn messy notes into clean meeting minutes", exposure: "inside" },
  { text: "Name a new internal project", exposure: "inside" },
  { text: "Write the numbers section of a board pack", exposure: "outside" },
  { text: "Rewrite a paragraph that reads badly", exposure: "inside" },
  { text: "Answer a legal question about your contract", exposure: "outside" },
  { text: "Brainstorm ten angles for a talk", exposure: "inside" },
  { text: "Tell a colleague their work is not good enough", exposure: "inside" },
  { text: "Translate a message into a language you cannot read", exposure: "outside" },
  { text: "Write test cases for code you wrote", exposure: "inside" },
  { text: "Set this quarter's priorities", exposure: "inside" },
  { text: "Draft a condolence note to a colleague", exposure: "inside" },
  { text: "Convert a spreadsheet into a chart", exposure: "inside" },
  { text: "Decide whether to fire a supplier", exposure: "outside" },
  { text: "Write a first draft of a press release", exposure: "outside" },
  { text: "Explain a concept you half understand to your boss", exposure: "inside" },
  { text: "Catch the errors in your own argument", exposure: "inside" },
  { text: "Fill in a routine compliance form", exposure: "outside" },
  { text: "Write the quote that goes to a client", exposure: "outside" },
  { text: "Plan the running order of a workshop", exposure: "inside" },
  { text: "Reply to a recruiter you are not interested in", exposure: "outside" },
  { text: "Decide what to cut when the deadline moves", exposure: "inside" },
  { text: "Tidy the formatting of a long document", exposure: "inside" },
  { text: "Write the apology after your team got it wrong", exposure: "outside" },
];

/* --------------------------------------------------------------- geometry -- */

export const VIEW_W = 540;
export const VIEW_H = 300;

export const CARD_W = 360;
export const CARD_H = 96;
export const CARD_X = VIEW_W / 2;
export const CARD_Y = 96;
export const ENTER_X = VIEW_W + CARD_W;

export const TRAY_Y = 236;
export const TRAY_H = 54;
export const TRAY_W = 118;
export const TRAY_X = [76, 202, 328, 454];

export const ROUND_SECONDS = 45;

/** Seconds after which a decision counts as a hesitation. */
export const DWELL_LIMIT = 6;
/** Decisions faster than this earn the decisive bonus. */
export const SNAP_UNDER = 2.4;

export const BASE_POINTS = 60;
export const SNAP_BONUS = 60;
export const STREAK_STEP = 8;
export const STREAK_CAP = 80;

/** Characters per printed line on a card. */
const WRAP = 30;

/* ------------------------------------------------------------------ scene -- */

export type Placement = {
  task: Task;
  bucket: BucketId;
  /** Seconds spent on this card before deciding. */
  dwell: number;
};

export type Flying = {
  id: number;
  lines: string[];
  lane: number;
  t: number;
};

export type Pop = { x: number; y: number; text: string; life: number; ink: string };

export type BucketScene = {
  deck: number[];
  /** Tasks the player typed in, appended to the deck for this round. */
  own: Task[];
  at: number;
  /** The card on the spindle. Null for the beat between cards. */
  card: { task: Task; lines: string[]; x: number; dwell: number } | null;
  flying: Flying[];
  nextId: number;
  gap: number;
  remaining: number;
  score: number;
  streak: number;
  bestStreak: number;
  snap: number;
  hesitations: number;
  placed: Placement[];
  counts: Record<BucketId, number>;
  chips: Chip[];
  pops: Pop[];
  flash: number;
  flashLane: number;
  calm: boolean;
};

/* --------------------------------------------------------------- helpers -- */

export function wrap(text: string, max = WRAP): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function shuffled(count: number): number[] {
  const out = Array.from({ length: count }, (_, i) => i);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

function taskAt(scene: BucketScene, index: number): Task {
  const all = scene.deck.length;
  const i = scene.deck[index % all];
  return i < TASKS.length ? TASKS[i] : scene.own[i - TASKS.length];
}

/**
 * Your own tasks are shuffled through the standard deck rather than tacked on
 * the end, so a round always contains some of both.
 */
export function newScene(own: Task[], calm: boolean, randomise = true): BucketScene {
  const total = TASKS.length + own.length;
  return {
    deck: randomise ? shuffled(total) : Array.from({ length: total }, (_, i) => i),
    own,
    at: 0,
    card: null,
    flying: [],
    nextId: 1,
    gap: 0.35,
    remaining: ROUND_SECONDS,
    score: 0,
    streak: 0,
    bestStreak: 0,
    snap: 0,
    hesitations: 0,
    placed: [],
    counts: { hand: 0, draft: 0, think: 0, keep: 0 },
    chips: [],
    pops: [],
    flash: 0,
    flashLane: -1,
    calm,
  };
}

function spray(x: number, y: number, ink: string, count: number): Chip[] {
  const out: Chip[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 140;
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      spin: (Math.random() - 0.5) * 700,
      angle: Math.random() * 360,
      life: 0.4 + Math.random() * 0.4,
      ink,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ frame -- */

/** One frame of sliding, settling and bookkeeping. */
export function advance(scene: BucketScene, delta: number): BucketScene {
  const chips = scene.chips
    .map((c) => ({
      ...c,
      vy: c.vy + 580 * delta,
      x: c.x + c.vx * delta,
      y: c.y + (c.vy + 580 * delta) * delta,
      angle: c.angle + c.spin * delta,
      life: c.life - delta,
    }))
    .filter((c) => c.life > 0 && c.y < VIEW_H + 40);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - 28 * delta, life: p.life - delta }))
    .filter((p) => p.life > 0);

  const flying = scene.flying
    .map((f) => ({ ...f, t: f.t + delta * 2.6 }))
    .filter((f) => f.t < 1);

  const base: BucketScene = {
    ...scene,
    chips,
    pops,
    flying,
    flash: Math.max(0, scene.flash - delta * 2.2),
    remaining: Math.max(0, scene.remaining - delta),
  };

  if (base.remaining === 0) return base;

  if (!base.card) {
    const gap = base.gap - delta;
    if (gap > 0) return { ...base, gap };
    const task = taskAt(base, base.at);
    return {
      ...base,
      gap: 0,
      at: base.at + 1,
      card: { task, lines: wrap(task.text), x: ENTER_X, dwell: 0 },
    };
  }

  // The card slides in and stops dead centre. The clock on it only starts once
  // it has arrived, so the slide is never counted against the reader.
  const card = base.card;
  if (card.x > CARD_X) {
    const x = Math.max(CARD_X, card.x - (card.x - CARD_X) * 12 * delta - 40 * delta);
    return { ...base, card: { ...card, x } };
  }

  return { ...base, card: { ...card, x: CARD_X, dwell: card.dwell + delta } };
}

/* ---------------------------------------------------------------- actions -- */

/** The player dropped the current task into a tray. */
export function place(scene: BucketScene, bucket: BucketId): BucketScene {
  const card = scene.card;
  if (!card || card.x > CARD_X + 1 || scene.remaining <= 0) return scene;

  const lane = BUCKETS.findIndex((b) => b.id === bucket);
  const snap = card.dwell <= SNAP_UNDER;
  const hesitated = card.dwell >= DWELL_LIMIT;
  const streakBonus = Math.min(scene.streak * STREAK_STEP, STREAK_CAP);
  const gained = BASE_POINTS + (snap ? SNAP_BONUS : 0) + streakBonus;
  const streak = snap ? scene.streak + 1 : 0;

  return {
    ...scene,
    card: null,
    gap: 0.16,
    score: scene.score + gained,
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
    snap: scene.snap + (snap ? 1 : 0),
    hesitations: scene.hesitations + (hesitated ? 1 : 0),
    placed: [...scene.placed, { task: card.task, bucket, dwell: card.dwell }],
    counts: { ...scene.counts, [bucket]: scene.counts[bucket] + 1 },
    flash: 1,
    flashLane: lane,
    flying: [
      ...scene.flying,
      { id: scene.nextId, lines: card.lines, lane, t: 0 },
    ],
    nextId: scene.nextId + 1,
    chips: scene.calm
      ? scene.chips
      : [...scene.chips, ...spray(TRAY_X[lane], TRAY_Y, "var(--teal)", snap ? 7 : 4)],
    pops: [
      ...scene.pops,
      {
        x: TRAY_X[lane],
        y: TRAY_Y - 18,
        text: snap ? `+${gained} snap` : `+${gained}`,
        life: 0.9,
        ink: snap ? "var(--teal)" : "var(--yellow-text)",
      },
    ],
  };
}

/* ------------------------------------------------------------------- map -- */

export type Reading = {
  /** Tasks that would reach somebody outside, which you handed over whole. */
  exposedHandovers: Placement[];
  /** Tasks you took eight seconds over. Those are the undecided ones. */
  hesitated: Placement[];
  byBucket: Record<BucketId, Placement[]>;
};

/**
 * Reflects your own sorting back at you. It contains no opinion about where a
 * task belongs — only two facts: which of your hand-overs could be seen from
 * outside, and which ones you could not decide quickly.
 */
export function readingOf(placed: Placement[]): Reading {
  const byBucket: Record<BucketId, Placement[]> = {
    hand: [],
    draft: [],
    think: [],
    keep: [],
  };
  for (const p of placed) byBucket[p.bucket].push(p);

  return {
    exposedHandovers: byBucket.hand.filter((p) => p.task.exposure === "outside"),
    hesitated: [...placed]
      .filter((p) => p.dwell >= DWELL_LIMIT)
      .sort((a, b) => b.dwell - a.dwell),
    byBucket,
  };
}
