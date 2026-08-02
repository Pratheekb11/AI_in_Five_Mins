/**
 * The rules of Cost of wrong, as pure functions.
 *
 * A piece of AI output lands on the desk and you choose how hard to check it
 * before it goes out. The four stamps cost real time from the round clock,
 * which is the point of the whole exercise: checking is never free, so the
 * question is never "should I check" but "how much, given what being wrong
 * would cost here".
 *
 * HONESTY. The rule this game scores against is the rule the module teaches,
 * stated openly rather than dressed up as data: the check must match the
 * damage. It is a policy, not a measurement, and the page says so. The one
 * number that could be mistaken for a finding — how often the output is wrong
 * — is fixed at one in three and printed on the cabinet, because we are not
 * going to invent an error rate for anybody's real assistant.
 *
 * Randomness is seeded and carried in the scene, so a frame is a function of
 * the previous frame and nothing else.
 */

import type { Chip } from "@/components/game/assets";

/* ------------------------------------------------------------------ types -- */

export type StampSpec = {
  level: 1 | 2 | 3 | 4;
  key: string;
  label: string;
  /** What this actually means you did. */
  means: string;
  /** Seconds it takes off the round clock. */
  cost: number;
};

export const STAMPS: readonly StampSpec[] = [
  {
    level: 1,
    key: "1",
    label: "Ship it",
    means: "Straight out, unread.",
    cost: 0,
  },
  {
    level: 2,
    key: "2",
    label: "Skim",
    means: "Read it through once for anything obviously off.",
    cost: 1,
  },
  {
    level: 3,
    key: "3",
    label: "Verify",
    means: "Check every load-bearing claim against its source.",
    cost: 2,
  },
  {
    level: 4,
    key: "4",
    label: "Second pair",
    means: "Redo it independently, or have someone qualified look.",
    cost: 3,
  },
];

export function stampSpec(level: number): StampSpec {
  return STAMPS[Math.min(STAMPS.length, Math.max(1, level)) - 1];
}

/** How bad it is if this goes out wrong. */
export type Damage = 1 | 2 | 3;

export const DAMAGE_LABEL: Record<Damage, string> = {
  1: "Awkward",
  2: "Costly",
  3: "Serious",
};

export type Item = {
  /** The piece of output. */
  text: string;
  /** Where it is going, printed on the docket. */
  going: string;
  damage: Damage;
  /** What actually happens if a wrong one gets through. */
  ifWrong: string;
};

/**
 * Twenty-four dockets, written for this exercise. Every one is a situation a
 * person could plausibly be in; none is a transcript, and none carries a number
 * that is claimed to be measured.
 */
export const ITEMS: readonly Item[] = [
  {
    text: "A rewritten paragraph for your own notes",
    going: "nobody but you",
    damage: 1,
    ifWrong: "You read a clumsy sentence and fix it. That is the entire cost.",
  },
  {
    text: "Ten name ideas for an internal project",
    going: "a team channel",
    damage: 1,
    ifWrong: "Someone says they do not like it. Nothing else happens.",
  },
  {
    text: "A summary of a meeting you attended",
    going: "your own records",
    damage: 1,
    ifWrong: "You misremember a detail you were in the room for and catch it later.",
  },
  {
    text: "A revenue figure in a board pack",
    going: "the board, on Thursday",
    damage: 3,
    ifWrong: "A wrong number in front of the people who approve your budget, with your name on the slide.",
  },
  {
    text: "A dosage described in a patient leaflet",
    going: "people who will follow it",
    damage: 3,
    ifWrong: "Somebody is harmed. This is the category where being fast is never the point.",
  },
  {
    text: "A subject line for an internal newsletter",
    going: "your own team",
    damage: 1,
    ifWrong: "A slightly worse open rate on a newsletter nobody was going to open anyway.",
  },
  {
    text: "A quoted price in a proposal",
    going: "a prospective client",
    damage: 3,
    ifWrong: "You are held to it, or you withdraw it and look unserious. Both are expensive.",
  },
  {
    text: "A translated message to a supplier",
    going: "a supplier who cannot read the original",
    damage: 2,
    ifWrong: "An instruction lands backwards and you find out when the wrong thing arrives.",
  },
  {
    text: "A citation in a report you are publishing",
    going: "anyone who reads it",
    damage: 3,
    ifWrong: "A reference that does not exist, under your name, permanently.",
  },
  {
    text: "A first draft of a blog post",
    going: "you, then an editor",
    damage: 1,
    ifWrong: "The editor sends it back. That is what the editor is for.",
  },
  {
    text: "A code snippet that touches the payments table",
    going: "production",
    damage: 3,
    ifWrong: "Money moves incorrectly and the fix is an incident, not a commit.",
  },
  {
    text: "A regex to clean up a spreadsheet column",
    going: "a copy of the file",
    damage: 1,
    ifWrong: "It mangles a copy and you run it again. Keep working on the copy.",
  },
  {
    text: "A legal clause summarised in plain English",
    going: "a colleague about to sign",
    damage: 3,
    ifWrong: "Somebody signs something they were told meant the opposite.",
  },
  {
    text: "A polite decline to a meeting invite",
    going: "one colleague",
    damage: 1,
    ifWrong: "It reads a little stiff and nobody remembers by Friday.",
  },
  {
    text: "A statistic in a slide for a conference talk",
    going: "a room of strangers",
    damage: 2,
    ifWrong: "Somebody in the audience knows the real figure, and now the rest of your talk is suspect.",
  },
  {
    text: "A shortlist of candidates from a pile of CVs",
    going: "a hiring decision",
    damage: 3,
    ifWrong: "The wrong people are cut for reasons nobody can inspect afterwards.",
  },
  {
    text: "A calendar invite drafted from an email thread",
    going: "four colleagues",
    damage: 2,
    ifWrong: "Four people turn up at the wrong time, or nobody turns up at all.",
  },
  {
    text: "A recipe scaled up for twelve people",
    going: "dinner",
    damage: 1,
    ifWrong: "Dinner is worse than it should have been. You will survive.",
  },
  {
    text: "The unsubscribe copy in a marketing email",
    going: "everybody on the list",
    damage: 2,
    ifWrong: "A compliance problem in an email you cannot recall once it is sent.",
  },
  {
    text: "A tidy-up of your own meeting notes",
    going: "your notes app",
    damage: 1,
    ifWrong: "You reread it and fix it. No one else is involved.",
  },
  {
    text: "An explanation of a policy for the intranet",
    going: "everyone at work",
    damage: 2,
    ifWrong: "People follow a rule that is not the rule, and you get to write the correction.",
  },
  {
    text: "A sum in an invoice",
    going: "a customer's accounts team",
    damage: 2,
    ifWrong: "You bill the wrong amount, and the conversation that follows is not about AI.",
  },
  {
    text: "A social post about a product launch",
    going: "the public, screenshotted",
    damage: 2,
    ifWrong: "Deleting it does not delete it. Someone has the screenshot.",
  },
  {
    text: "A brainstorm of counterarguments to your own plan",
    going: "your own thinking",
    damage: 1,
    ifWrong: "A weak counterargument, which you discard like any other weak idea.",
  },
];

/** The rule the module teaches. Stated, not measured. */
export function requiredFor(damage: Damage): number {
  return damage + 1;
}

/** One in three dockets contains a real error. Printed on the cabinet. */
export const ERROR_RATE = 1 / 3;

export const ROUND_SECONDS = 50;

export const EXACT_POINTS = 120;
export const OVER_POINTS = 40;
export const LUCKY_POINTS = 60;
export const ESCAPE_COST = 150;
export const STREAK_STEP = 10;
export const STREAK_CAP = 60;

/* --------------------------------------------------------------- geometry -- */

export const VIEW_W = 560;
export const VIEW_H = 300;

export const DOCKET_W = 400;
export const DOCKET_H = 132;
export const DOCKET_X = VIEW_W / 2;
export const DOCKET_Y = 116;

export const PRESS_Y = 30;

/* ------------------------------------------------------------------ scene -- */

export type Outcome = "caught" | "clean" | "lucky" | "escaped";

export type Ruling = {
  item: Item;
  chose: number;
  required: number;
  faulty: boolean;
  outcome: Outcome;
  gained: number;
};

export type Pop = { x: number; y: number; text: string; life: number; ink: string };

export type CostScene = {
  seed: number;
  order: number[];
  at: number;
  /** The docket on the desk, with the fault already decided. */
  docket: { item: Item; faulty: boolean; y: number } | null;
  /** Stamp head travel, 0 resting to 1 struck. */
  press: number;
  pressLevel: number;
  gap: number;
  remaining: number;
  score: number;
  streak: number;
  bestStreak: number;
  caught: number;
  clean: number;
  lucky: number;
  escaped: number;
  spent: number;
  log: Ruling[];
  last: Ruling | null;
  ribbonLife: number;
  chips: Chip[];
  pops: Pop[];
  calm: boolean;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffled(count: number, rnd: () => number): number[] {
  const out = Array.from({ length: count }, (_, i) => i);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

export function newScene(seed: number, calm: boolean): CostScene {
  const rnd = rng(seed);
  return {
    seed: (seed >>> 0) || 1,
    order: shuffled(ITEMS.length, rnd),
    at: 0,
    docket: null,
    press: 0,
    pressLevel: 0,
    gap: 0.3,
    remaining: ROUND_SECONDS,
    score: 0,
    streak: 0,
    bestStreak: 0,
    caught: 0,
    clean: 0,
    lucky: 0,
    escaped: 0,
    spent: 0,
    log: [],
    last: null,
    ribbonLife: 0,
    chips: [],
    pops: [],
    calm,
  };
}

function spray(x: number, y: number, ink: string, count: number, rnd: () => number): Chip[] {
  const out: Chip[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rnd() * Math.PI * 2;
    const speed = 70 + rnd() * 150;
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 90,
      spin: (rnd() - 0.5) * 780,
      angle: rnd() * 360,
      life: 0.4 + rnd() * 0.45,
      ink,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ frame -- */

/** One frame of the press returning, debris settling and the clock running. */
export function advance(scene: CostScene, delta: number): CostScene {
  const chips = scene.chips
    .map((c) => ({
      ...c,
      vy: c.vy + 600 * delta,
      x: c.x + c.vx * delta,
      y: c.y + (c.vy + 600 * delta) * delta,
      angle: c.angle + c.spin * delta,
      life: c.life - delta,
    }))
    .filter((c) => c.life > 0 && c.y < VIEW_H + 40);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - 30 * delta, life: p.life - delta }))
    .filter((p) => p.life > 0);

  const base: CostScene = {
    ...scene,
    chips,
    pops,
    press: Math.max(0, scene.press - delta * 3.4),
    ribbonLife: Math.max(0, scene.ribbonLife - delta),
    remaining: Math.max(0, scene.remaining - delta),
  };

  if (base.remaining === 0) return base;

  if (!base.docket) {
    const gap = base.gap - delta;
    if (gap > 0) return { ...base, gap };

    const rnd = rng(base.seed + base.at * 7919);
    const item = ITEMS[base.order[base.at % base.order.length]];
    return {
      ...base,
      seed: (Math.imul(base.seed, 1664525) + 1013904223) >>> 0,
      at: base.at + 1,
      gap: 0,
      docket: { item, faulty: rnd() < ERROR_RATE, y: -DOCKET_H },
    };
  }

  const docket = base.docket;
  if (docket.y < DOCKET_Y) {
    return {
      ...base,
      docket: { ...docket, y: Math.min(DOCKET_Y, docket.y + 900 * delta) },
    };
  }

  return base;
}

/* ---------------------------------------------------------------- actions -- */

/** The player brought a stamp down. */
export function stamp(scene: CostScene, level: number): CostScene {
  const docket = scene.docket;
  if (!docket || docket.y < DOCKET_Y || scene.remaining <= 0) return scene;

  const spec = stampSpec(level);
  const required = requiredFor(docket.item.damage);
  const enough = spec.level >= required;

  let outcome: Outcome;
  if (docket.faulty && enough) outcome = "caught";
  else if (docket.faulty) outcome = "escaped";
  else if (spec.level === required) outcome = "clean";
  else if (spec.level > required) outcome = "clean";
  else outcome = "lucky";

  const streakBonus = Math.min(scene.streak * STREAK_STEP, STREAK_CAP);
  let gained: number;
  if (outcome === "escaped") {
    gained = -ESCAPE_COST;
  } else if (outcome === "lucky") {
    gained = LUCKY_POINTS;
  } else if (spec.level === required) {
    gained = EXACT_POINTS + streakBonus;
  } else {
    gained = OVER_POINTS + streakBonus;
  }

  const ruling: Ruling = {
    item: docket.item,
    chose: spec.level,
    required,
    faulty: docket.faulty,
    outcome,
    gained,
  };

  const good = outcome === "caught" || outcome === "clean";
  const streak = good && spec.level === required ? scene.streak + 1 : 0;
  const rnd = rng(scene.seed + spec.level * 13);

  return {
    ...scene,
    seed: (Math.imul(scene.seed, 1664525) + 1013904223) >>> 0,
    docket: null,
    gap: 0.2,
    press: 1,
    pressLevel: spec.level,
    // Checking costs time. That is the whole lesson, so it comes off the clock.
    remaining: Math.max(0, scene.remaining - spec.cost),
    spent: scene.spent + spec.cost,
    score: Math.max(0, scene.score + gained),
    streak,
    bestStreak: Math.max(scene.bestStreak, streak),
    caught: scene.caught + (outcome === "caught" ? 1 : 0),
    clean: scene.clean + (outcome === "clean" ? 1 : 0),
    lucky: scene.lucky + (outcome === "lucky" ? 1 : 0),
    escaped: scene.escaped + (outcome === "escaped" ? 1 : 0),
    log: [...scene.log, ruling],
    last: ruling,
    ribbonLife: 2.4,
    chips: scene.calm
      ? scene.chips
      : [
          ...scene.chips,
          ...spray(
            DOCKET_X,
            DOCKET_Y,
            outcome === "escaped" ? "var(--pink)" : "var(--teal)",
            outcome === "escaped" ? 10 : 6,
            rnd,
          ),
        ],
    pops: [
      ...scene.pops,
      {
        x: DOCKET_X,
        y: DOCKET_Y - DOCKET_H / 2 - 6,
        text:
          gained >= 0
            ? spec.cost > 0
              ? `+${gained}  −${spec.cost}s`
              : `+${gained}`
            : `−${Math.abs(gained)}`,
        life: 1,
        ink: gained >= 0 ? "var(--teal-text)" : "var(--pink-text)",
      },
    ],
  };
}

/** The line read back after a stamp. */
export function verdictOf(ruling: Ruling): { text: string; ok: boolean } {
  const chose = stampSpec(ruling.chose).label.toLowerCase();
  const need = stampSpec(ruling.required).label.toLowerCase();

  if (ruling.outcome === "caught") {
    return {
      ok: true,
      text: `Caught it. That one was wrong, and "${chose}" was enough to find it.`,
    };
  }
  if (ruling.outcome === "escaped") {
    return {
      ok: false,
      text: `It was wrong and it went out. ${ruling.item.ifWrong}`,
    };
  }
  if (ruling.outcome === "lucky") {
    return {
      ok: false,
      text: `Fine this time — and you did not know that. "${need}" is what the damage here asks for.`,
    };
  }
  if (ruling.chose > ruling.required) {
    return {
      ok: true,
      text: `Clean, and you spent more than you had to. "${need}" would have covered it.`,
    };
  }
  return { ok: true, text: "Clean, and checked exactly as hard as it needed." };
}
