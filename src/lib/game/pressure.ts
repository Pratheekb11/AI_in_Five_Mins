/**
 * The rules of Pressure test, as pure functions.
 *
 * A written example of an AI-style answer arrives, a fuse starts draining, and
 * the player has to call it: trustworthy, or one of the four ways these tools
 * go wrong. Every frame produces a new scene from the old one; nothing here
 * mutates anything the caller passed in.
 *
 * HONESTY. Every statement in `DECK` was written for this exercise. None of it
 * is a transcript, and none of it is attributed to any product. The four
 * failure modes are documented in the literature the lesson cites; the wording
 * of the examples is ours, and the arithmetic in them is computed here rather
 * than typed out, so a printed sum can never quietly disagree with its own
 * correction.
 */

import type { Chip } from "@/components/game/assets";

// ------------------------------------------------------------------ calls --

export type Verdict =
  | "sound"
  | "invented"
  | "stale"
  | "sycophantic"
  | "arithmetic";

export type CallOption = {
  id: Verdict;
  /** The key that makes this call. */
  key: string;
  name: string;
  /** Six or seven words, printed under the name. */
  hint: string;
};

export const CALLS: readonly CallOption[] = [
  {
    id: "sound",
    key: "1",
    name: "Trustworthy",
    hint: "right, or honestly unsure",
  },
  {
    id: "invented",
    key: "2",
    name: "Invented",
    hint: "a specific that was never true",
  },
  {
    id: "stale",
    key: "3",
    name: "Stale",
    hint: "true once, stated as if still true",
  },
  {
    id: "sycophantic",
    key: "4",
    name: "Caved",
    hint: "changed because you pushed",
  },
  {
    id: "arithmetic",
    key: "5",
    name: "Bad sum",
    hint: "the arithmetic does not check out",
  },
];

export function labelFor(verdict: Verdict): string {
  return CALLS.find((c) => c.id === verdict)?.name ?? verdict;
}

// ------------------------------------------------------------------- deck --

export type Card = {
  /** What the person said first, when the example needs a push to make sense. */
  push?: string;
  /** The written answer being judged. */
  text: string;
  verdict: Verdict;
  /** One line on why, read back in the debrief. */
  tell: string;
  /** 1 plain, 2 mixed, 3 nasty. Decides the order cards arrive in. */
  level: 1 | 2 | 3;
};

type Sum = {
  left: number;
  op: "+" | "−" | "×" | "÷";
  right: number;
  /** What the example claims the answer is. */
  claimed: number;
};

/** Thousands separators without `toLocaleString`, which differs by locale. */
function fmt(n: number): string {
  const [whole, frac] = Math.abs(n).toString().split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${grouped}${frac ? `.${frac}` : ""}`;
}

function truthOf(sum: Sum): number {
  if (sum.op === "+") return sum.left + sum.right;
  if (sum.op === "−") return sum.left - sum.right;
  if (sum.op === "×") return sum.left * sum.right;
  return sum.left / sum.right;
}

/**
 * Builds a card whose numbers are worked out here rather than written down.
 * The sentence receives the already-formatted figures, so what the example
 * claims and what the correction says can never drift apart.
 */
function sumCard(spec: {
  level: 1 | 2 | 3;
  sum: Sum;
  push?: string;
  say: (n: { a: string; b: string; claimed: string }) => string;
  /** Set when the card is illustrating a different failure mode. */
  verdict?: Verdict;
  tell?: (n: { truth: string; claimed: string; working: string }) => string;
  /** Years and the like, which never take thousands separators. */
  plain?: boolean;
}): Card {
  const { sum } = spec;
  const truth = truthOf(sum);
  const wrong = sum.claimed !== truth;
  const show = spec.plain ? (v: number) => String(v) : fmt;
  const n = {
    a: show(sum.left),
    b: show(sum.right),
    claimed: show(sum.claimed),
    truth: show(truth),
    working: `${show(sum.left)} ${sum.op} ${show(sum.right)} = ${show(truth)}`,
  };

  return {
    push: spec.push,
    text: spec.say(n),
    verdict: spec.verdict ?? (wrong ? "arithmetic" : "sound"),
    tell:
      spec.tell?.(n) ??
      (wrong
        ? `${n.working}, not ${n.claimed}. The sentence around the number was flawless.`
        : `${n.working}. This one is simply right, and it does not hedge because it does not need to.`),
    level: spec.level,
  };
}

/**
 * Thirty-two written examples. Roughly even across the five calls, so guessing
 * one label repeatedly does not pay, and deliberately mixed on tone: some of
 * the trustworthy ones are blunt, some of the invented ones hedge politely.
 */
export const DECK: readonly Card[] = [
  // ------------------------------------------------------------- level one --
  {
    text: "I do not know when that building opened. I would check the council's own records rather than take a date from me.",
    verdict: "sound",
    tell: "Refusing to produce a date it does not have is the correct behaviour, and it is the answer people find least satisfying.",
    level: 1,
  },
  {
    text: "The study you are thinking of is Harrow and Delacroix, 2014, pages 44 to 61. They ran it over eighteen months with 312 participants.",
    verdict: "invented",
    tell: "Authors, a year, a page range and a sample size. A citation has a shape, and the shape is easy to write. Specificity is not evidence.",
    level: 1,
  },
  {
    text: "It costs 4.99 a month on the standard plan. That is the current price.",
    verdict: "stale",
    tell: "Prices move. A figure like this was true at some point before training ended, and it is being stated as if it were true today.",
    level: 1,
  },
  {
    text: "Water boils at 100 degrees Celsius at sea level. Higher up it boils at a lower temperature, because there is less air pressing down on it.",
    verdict: "sound",
    tell: "Confident and correct. Notice that it reads exactly like the confident wrong answers.",
    level: 1,
  },
  {
    text: "That word comes from an old Norse term meaning to bind with rope, which passed into English through the shipping trade.",
    verdict: "invented",
    tell: "A tidy origin story with a plausible route into English. Etymologies are a favourite because a good-sounding one is easy to assemble.",
    level: 1,
  },
  sumCard({
    level: 1,
    sum: { left: 47, op: "×", right: 38, claimed: 1706 },
    say: (n) =>
      `Each crate holds ${n.a} units and you have ${n.b} crates, so that is ${n.claimed} units in total.`,
  }),
  {
    push: "That is wrong. It is 154.",
    text: "You are right, and I apologise. 12 x 12 is 154. Thank you for the correction.",
    verdict: "sycophantic",
    tell: `You gave it nothing but a contradiction and it abandoned a correct answer. 12 × 12 = ${12 * 12}.`,
    level: 1,
  },
  {
    text: "Nothing further has been published on that. If there had been an update, I would know about it.",
    verdict: "stale",
    tell: "The second sentence is the giveaway. Its knowledge stops at a fixed point, and it cannot see what came after.",
    level: 1,
  },
  {
    text: "I cannot see today's date or the news from here, so I cannot tell you who won. Anything I said would be a guess wearing the clothes of a fact.",
    verdict: "sound",
    tell: "Naming its own limit is the most useful thing an answer can do, and it is the answer that reads as least helpful.",
    level: 1,
  },
  sumCard({
    level: 1,
    sum: { left: 1250, op: "−", right: 487, claimed: 773 },
    say: (n) =>
      `Your budget was ${n.a} and you have spent ${n.b}, which leaves you ${n.claimed} to work with.`,
  }),
  {
    push: "Are you sure? That does not sound right to me.",
    text: "You are right to question it. On reflection my earlier answer was mistaken, and I should not have stated it so firmly.",
    verdict: "sycophantic",
    tell: "Doubt on its own, with no counter-evidence attached, was enough to flip the answer. Nothing was checked in between.",
    level: 1,
  },

  // ------------------------------------------------------------- level two --
  {
    text: "That figure may well have moved since I was trained on it. Check the current one before you quote it anywhere.",
    verdict: "sound",
    tell: "An honest statement about its own shelf life. Hedging is not a failure mode. Hedging about the right thing is the correct answer.",
    level: 2,
  },
  {
    text: "Yes, that function takes a strict flag as its third argument. Pass true and it will validate the input for you before it runs.",
    verdict: "invented",
    tell: "Invented interfaces are the everyday version of this. The argument does not exist, and the sentence describing it is perfectly formed.",
    level: 2,
  },
  {
    text: "The latest release is version 3.2, which came out last spring. There is nothing newer than that.",
    verdict: "stale",
    tell: "It was the latest release once. Anything with a version number goes out of date the moment training stops.",
    level: 2,
  },
  {
    push: "Sydney is the capital of Australia, surely.",
    text: "You may well be right, and I would defer to you on that.",
    verdict: "sycophantic",
    tell: "Canberra is the capital. It did not check anything. It read your confidence and matched it.",
    level: 2,
  },
  sumCard({
    level: 2,
    sum: { left: 365, op: "×", right: 7, claimed: 2545 },
    say: (n) =>
      `Over ${n.b} years that is ${n.a} days a year, so ${n.claimed} days in total, ignoring leap years.`,
  }),
  sumCard({
    level: 2,
    sum: { left: 3, op: "×", right: 3600, claimed: 10800 },
    say: (n) =>
      `There are ${n.b} seconds in an hour, so ${n.a} hours is ${n.claimed} seconds.`,
  }),
  {
    text: "Section 4(b) of that act covers your case exactly, and the penalty there is capped at 5,000.",
    verdict: "invented",
    tell: "Section numbers, sub-clauses and caps all have a familiar form. Producing one that fits your question is easy; producing one that exists is not.",
    level: 2,
  },
  {
    text: "Those two are still the market leaders, and nothing has displaced them since.",
    verdict: "stale",
    tell: "The word still is doing work it cannot back up. Its picture of who leads a market is a snapshot with a date on it.",
    level: 2,
  },
  {
    push: "This is my plan and I am rather proud of it.",
    text: "It is an excellent plan, and well structured. I would not change anything about it.",
    verdict: "sycophantic",
    tell: "The praise arrived before any analysis did. Telling it the plan is yours changed the review it wrote.",
    level: 2,
  },
  sumCard({
    level: 2,
    sum: { left: 2400, op: "÷", right: 16, claimed: 160 },
    say: (n) =>
      `Split ${n.a} between ${n.b} people and each one gets ${n.claimed}, exactly.`,
  }),
  {
    text: "I am not sure who said that. It gets attributed to several different people and I cannot tell you which attribution is the right one.",
    verdict: "sound",
    tell: "Reporting a genuine uncertainty instead of picking the most famous name is right, and it is duller than the wrong answer would have been.",
    level: 2,
  },

  // ----------------------------------------------------------- level three --
  {
    push: "I do not agree with that at all.",
    text: "I am not going to change the answer just because you disagree with it. If you have a source that says otherwise, show me and I will look at it properly.",
    verdict: "sound",
    tell: "Holding a position under pressure and asking for evidence is the behaviour you want. It also feels rude, which is why it gets trained out.",
    level: 3,
  },
  {
    text: "As far as I recall, the relevant clause sits in the third schedule, added by the 2016 amendment. Worth double-checking, but that is where it lives.",
    verdict: "invented",
    tell: "The hedge is real and the schedule is not. A softened tone is not a source. This is the hardest version to catch.",
    level: 3,
  },
  sumCard({
    level: 3,
    sum: { left: 18, op: "×", right: 24, claimed: 442 },
    say: (n) =>
      `You need ${n.a} tiles per row across ${n.b} rows, so order ${n.claimed} and you are covered.`,
  }),
  {
    push: "Hmm. I read something different somewhere.",
    text: "Thank you for pointing that out. You are quite right, and I will correct myself: my earlier answer should not be relied on.",
    verdict: "sycophantic",
    tell: "A vague half-memory of having read something else was enough. It never asked what you read.",
    level: 3,
  },
  {
    text: "There is no newer edition than the 2021 one. That is still the current text and it is what you should be working from.",
    verdict: "stale",
    tell: "It is describing the newest edition it saw, not the newest edition there is. Those are different things and it cannot tell them apart.",
    level: 3,
  },
  sumCard({
    level: 3,
    sum: { left: 875, op: "−", right: 298, claimed: 577 },
    say: (n) =>
      `Take the ${n.b} already committed off the ${n.a} and you have ${n.claimed} left.`,
  }),
  {
    text: "That library does have a retryOnFailure option. Set it to true in the config block and it will handle transient failures for you.",
    verdict: "invented",
    tell: "Named, camel-cased and placed in a config block. It is the option you were hoping for, which is exactly why it got written.",
    level: 3,
  },
  sumCard({
    level: 3,
    sum: { left: 1961, op: "+", right: 60, claimed: 2022 },
    plain: true,
    say: (n) =>
      `Someone born in ${n.a} would have turned ${n.b} in ${n.claimed}, so they were eligible that year.`,
    tell: (n) =>
      `${n.working}, so they turned 60 in ${n.truth}, not ${n.claimed}. Date arithmetic fails the same way ordinary arithmetic does.`,
  }),
  sumCard({
    level: 3,
    sum: { left: 19, op: "×", right: 21, claimed: 389 },
    push: "I make it 389, not what you said.",
    verdict: "sycophantic",
    say: (n) =>
      `You are right, sorry about that. ${n.a} × ${n.b} is ${n.claimed}. I should have been more careful.`,
    tell: (n) =>
      `It had it right and then dropped it. ${n.working}, not ${n.claimed}. Two failures stacked: it caved, and the number it caved to is wrong.`,
  }),
  {
    text: "I have just checked and there have been no changes since then, so you are safe to proceed on that basis.",
    verdict: "invented",
    tell: "It cannot check anything unless it has been given a tool that can. The claim to have checked is the invented part.",
    level: 3,
  },
];

// ------------------------------------------------------------------ timing --

export const ROUND_SECONDS = 45;
/** Seconds on the fuse for the first card. */
export const START_FUSE = 6.4;
export const MIN_FUSE = 2.3;
/** Seconds taken off the fuse for every card cleared. */
export const FUSE_STEP = 0.28;
/** Seconds a wrong call costs the round clock. */
export const WRONG_COST = 3;

export const BASE_POINTS = 60;
export const SPEED_POINTS = 90;
export const MAX_MULTIPLIER = 5;

/** Cards per step of the multiplier. */
export const STREAK_STEP = 3;

export function fuseFor(cleared: number): number {
  return Math.max(MIN_FUSE, START_FUSE - cleared * FUSE_STEP);
}

export function multiplierFor(streak: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(streak / STREAK_STEP));
}

// ------------------------------------------------------------------ geometry --

/** The fuse bar, drawn in its own panel so chips have somewhere to fly. */
export const PANEL_W = 640;
export const PANEL_H = 96;
export const BAR_Y = 56;
export const BAR_H = 34;

// -------------------------------------------------------------------- scene --

export type Pop = {
  x: number;
  y: number;
  text: string;
  life: number;
  ink: string;
};

export type Call = {
  /** Index into `DECK`. */
  card: number;
  /** null when the fuse ran out. */
  picked: Verdict | null;
  correct: boolean;
  gained: number;
};

export type PressureScene = {
  deck: number[];
  at: number;
  fuse: number;
  fuseMax: number;
  remaining: number;
  score: number;
  streak: number;
  bestStreak: number;
  right: number;
  wrong: number;
  missed: number;
  cleared: number;
  flash: number;
  flashInk: string;
  ribbon: string;
  ribbonTone: "teal" | "pink";
  ribbonLife: number;
  chips: Chip[];
  pops: Pop[];
  log: Call[];
};

function shuffled(items: readonly number[]): number[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/**
 * Easy cards first, nasty ones last. Difficulty escalates twice over a round:
 * the fuse gets shorter with every card cleared, and the cards themselves get
 * harder as the deck is worked through.
 */
export function buildDeck(
  cards: readonly Card[],
  randomise = true,
): number[] {
  const one: number[] = [];
  const two: number[] = [];
  const three: number[] = [];
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].level === 1) one.push(i);
    else if (cards[i].level === 2) two.push(i);
    else three.push(i);
  }
  return randomise
    ? [...shuffled(one), ...shuffled(two), ...shuffled(three)]
    : [...one, ...two, ...three];
}

/**
 * `randomise` is off for the scene rendered before anyone presses play: that
 * one is drawn on the server as well as the client, and a shuffled deck would
 * put a different card in the frame on each side.
 */
export function newScene(
  cards: readonly Card[],
  randomise = true,
): PressureScene {
  const fuse = fuseFor(0);
  return {
    deck: buildDeck(cards, randomise),
    at: 0,
    fuse,
    fuseMax: fuse,
    remaining: ROUND_SECONDS,
    score: 0,
    streak: 0,
    bestStreak: 0,
    right: 0,
    wrong: 0,
    missed: 0,
    cleared: 0,
    flash: 0,
    flashInk: "var(--teal)",
    ribbon: "",
    ribbonTone: "teal",
    ribbonLife: 0,
    chips: [],
    pops: [],
    log: [],
  };
}

export function cardAt(scene: PressureScene, cards: readonly Card[]): Card {
  return cards[scene.deck[scene.at % scene.deck.length]];
}

/** Where the draining head of the fuse currently sits. */
export function headX(scene: PressureScene): number {
  const fraction = scene.fuseMax === 0 ? 0 : scene.fuse / scene.fuseMax;
  return Math.max(0, Math.min(1, fraction)) * PANEL_W;
}

function spray(x: number, y: number, ink: string, count: number): Chip[] {
  const out: Chip[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: x + (Math.random() - 0.5) * 12,
      y,
      vx: (Math.random() - 0.5) * 210,
      vy: -140 - Math.random() * 170,
      spin: (Math.random() - 0.5) * 820,
      angle: Math.random() * 360,
      life: 0.45 + Math.random() * 0.45,
      ink,
    });
  }
  return out;
}

function decay(scene: PressureScene, delta: number): PressureScene {
  const chips = scene.chips
    .map((c) => ({
      ...c,
      vy: c.vy + 640 * delta,
      x: c.x + c.vx * delta,
      y: c.y + (c.vy + 640 * delta) * delta,
      angle: c.angle + c.spin * delta,
      life: c.life - delta,
    }))
    .filter((c) => c.life > 0 && c.y < PANEL_H + 40);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - 40 * delta, life: p.life - delta }))
    .filter((p) => p.life > 0);

  return {
    ...scene,
    chips,
    pops,
    flash: Math.max(0, scene.flash - delta * 3),
    ribbonLife: Math.max(0, scene.ribbonLife - delta),
  };
}

/** Move to the next card, with a fuse shortened by everything cleared so far. */
function nextCard(scene: PressureScene, cleared: number): PressureScene {
  const fuse = fuseFor(cleared);
  return { ...scene, at: scene.at + 1, cleared, fuse, fuseMax: fuse };
}

/** One frame of draining and bookkeeping. */
export function advance(
  scene: PressureScene,
  cards: readonly Card[],
  delta: number,
): PressureScene {
  const settled = decay(scene, delta);
  if (scene.remaining <= 0) return { ...settled, remaining: 0, fuse: 0 };

  const remaining = Math.max(0, scene.remaining - delta);
  const fuse = scene.fuse - delta;

  if (fuse > 0 || remaining === 0) {
    return { ...settled, remaining, fuse: Math.max(0, fuse) };
  }

  // The fuse ran out with no call made.
  const card = cardAt(scene, cards);
  const x = headX(scene);

  return nextCard(
    {
      ...settled,
      remaining,
      streak: 0,
      missed: scene.missed + 1,
      flash: 1,
      flashInk: "var(--pink)",
      ribbon: `Out of time — that was ${labelFor(card.verdict)}`,
      ribbonTone: "pink",
      ribbonLife: 2,
      chips: [...settled.chips, ...spray(x, BAR_Y + BAR_H / 2, "var(--pink)", 4)],
      log: [
        ...scene.log,
        {
          card: scene.deck[scene.at % scene.deck.length],
          picked: null,
          correct: false,
          gained: 0,
        },
      ],
    },
    scene.cleared + 1,
  );
}

/** The player made a call. */
export function call(
  scene: PressureScene,
  cards: readonly Card[],
  picked: Verdict,
): PressureScene {
  if (scene.remaining <= 0) return scene;

  const card = cardAt(scene, cards);
  const correct = card.verdict === picked;
  const x = headX(scene);
  const y = BAR_Y + BAR_H / 2;

  if (!correct) {
    return nextCard(
      {
        ...scene,
        remaining: Math.max(0, scene.remaining - WRONG_COST),
        streak: 0,
        wrong: scene.wrong + 1,
        flash: 1,
        flashInk: "var(--pink)",
        ribbon: `No — that was ${labelFor(card.verdict)}`,
        ribbonTone: "pink",
        ribbonLife: 2,
        chips: [...scene.chips, ...spray(x, y, "var(--pink)", 7)],
        pops: [
          ...scene.pops,
          {
            x,
            y: BAR_Y - 12,
            text: `−${WRONG_COST}s`,
            life: 0.85,
            ink: "var(--pink-text)",
          },
        ],
        log: [
          ...scene.log,
          {
            card: scene.deck[scene.at % scene.deck.length],
            picked,
            correct: false,
            gained: 0,
          },
        ],
      },
      scene.cleared + 1,
    );
  }

  const speed = scene.fuseMax === 0 ? 0 : scene.fuse / scene.fuseMax;
  const multiplier = multiplierFor(scene.streak);
  const gained = Math.round((BASE_POINTS + SPEED_POINTS * speed) * multiplier);
  const streak = scene.streak + 1;

  return nextCard(
    {
      ...scene,
      score: scene.score + gained,
      streak,
      bestStreak: Math.max(scene.bestStreak, streak),
      right: scene.right + 1,
      flash: 1,
      flashInk: "var(--teal)",
      ribbon:
        multiplier > 1
          ? `Right — ${labelFor(card.verdict)} · ×${multiplier}`
          : `Right — ${labelFor(card.verdict)}`,
      ribbonTone: "teal",
      ribbonLife: 2,
      chips: [...scene.chips, ...spray(x, y, "var(--teal)", 8)],
      pops: [
        ...scene.pops,
        {
          x,
          y: BAR_Y - 12,
          text: `+${gained}`,
          life: 0.9,
          ink: "var(--teal-text)",
        },
      ],
      log: [
        ...scene.log,
        {
          card: scene.deck[scene.at % scene.deck.length],
          picked,
          correct: true,
          gained,
        },
      ],
    },
    scene.cleared + 1,
  );
}

/** The first few words of an example, for the debrief list. */
export function excerpt(text: string, limit = 76): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 40 ? space : limit)}…`;
}
