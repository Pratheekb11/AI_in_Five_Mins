/**
 * The rules of Which mode?, as pure functions.
 *
 * A request drops down the middle of the sorter. Under it sits a deflector arm
 * on a spring. Whichever chute the arm is pointing at when the card lands is
 * where the request goes: looked up, calculated, read, or guessed.
 *
 * The arm has weight, so a decision made at the last instant is still in
 * transit when the card arrives and the request lands in the wrong chute. That
 * is the whole design. The skill being trained is hearing what a request needs
 * early, not picking the right chute eventually.
 *
 * Nothing here mutates anything the caller passed in. Every frame returns a new
 * scene built from the old one.
 */

import type { Chip } from "@/components/game/assets";

export type Mode = "look" | "calc" | "read" | "guess";

/** Chute order, left to right. The index is the lane. */
export const MODES: readonly Mode[] = ["look", "calc", "read", "guess"];

export type Request = {
  /** Short enough to wrap into three lines on the card. */
  text: string;
  mode: Mode;
  /** What goes wrong when this one is answered from memory alone. */
  cost?: string;
};

export type Card = {
  request: Request;
  lines: string[];
  /** Centre of the card. */
  y: number;
  /** Set the moment the card lands on the arm. `t` runs 0 to 1. */
  sent: { lane: number; ok: boolean; t: number } | null;
};

export type Verdict = {
  ok: boolean;
  text: string;
  chosen: Mode;
  actual: Mode;
  /** The lane the arm sent it down. */
  lane: number;
  /** Where it should have gone. */
  correctLane: number;
  note: string;
};

export type Pop = {
  x: number;
  y: number;
  text: string;
  life: number;
  ink: string;
};

export type WhichScene = {
  /** Shuffled indices into the request list. */
  order: number[];
  at: number;
  card: Card | null;
  arm: { angle: number; vel: number };
  /** The lane the player has asked for. */
  aim: number;
  /** Seconds since this card appeared or the aim last changed. */
  aimedSince: number;
  chips: Chip[];
  pops: Pop[];
  /** Chute highlight, 1 down to 0. */
  flash: number;
  /** Seconds until the next card is fed in. */
  gap: number;
  fall: number;
  remaining: number;
  score: number;
  combo: number;
  bestCombo: number;
  right: number;
  wrong: number;
  last: Verdict | null;
  /** Reduced motion: no paper chips, and the arm settles without overshoot. */
  calm: boolean;
};

// ------------------------------------------------------------------ layout --

export const VIEW_W = 500;
export const VIEW_H = 306;

export const PIVOT_X = 250;
export const PIVOT_Y = 190;
export const ARM_LEN = 66;

export const CARD_W = 380;
export const CARD_H = 92;
export const SPAWN_Y = -60;
/** Card centre when it touches the arm. */
export const CONTACT_Y = PIVOT_Y - 8 - CARD_H / 2;

export const BIN_X = [70, 190, 310, 430];
export const BIN_Y = 258;
export const BIN_W = 108;
export const BIN_H = 62;

/** Arm angles, negative to the left. Rendered as a negative SVG rotation. */
export const DETENT = [-58, -20, 20, 58];

export const ROUND_SECONDS = 45;

/** Characters per line on the card, at the size the card prints them. */
const WRAP = 28;

const START_FALL = 82;
const TOP_FALL = 205;
/** Every routed request speeds the feed up by this much. */
const FALL_STEP = 9;
/** Seconds knocked off the clock by a misroute. */
const MISS_PENALTY = 1.5;

// ----------------------------------------------------------------- content --

export const MODE_LABEL: Record<Mode, string> = {
  look: "Looked up",
  calc: "Calculated",
  read: "Read",
  guess: "Guessed",
};

export const CHUTES: { mode: Mode; label: string; tool: string }[] = [
  { mode: "look", label: "LOOKED UP", tool: "live search" },
  { mode: "calc", label: "CALCULATED", tool: "run code" },
  { mode: "read", label: "READ", tool: "your file" },
  { mode: "guess", label: "GUESSED", tool: "no tool" },
];

/**
 * The requests. Written for this lesson rather than collected from anywhere —
 * they are questions a person might type, not output from any model.
 */
export const REQUESTS: Request[] = [
  // ---------------------------------------------------------- needs a source
  {
    text: "What did rates do this week?",
    mode: "look",
    cost: "Guessed: you get the last number it read, with no date attached.",
  },
  {
    text: "Is this library still maintained?",
    mode: "look",
    cost: "Guessed: it describes the project as it was when it stopped reading.",
  },
  {
    text: "What time does the gallery shut today?",
    mode: "look",
    cost: "Guessed: it produces hours that look exactly like opening hours.",
  },
  {
    text: "Who won the match last night?",
    mode: "look",
    cost: "Guessed: last night is after the model. It will still name a winner.",
  },
  {
    text: "Has version 4 shipped yet?",
    mode: "look",
    cost: "Guessed: it answers about a release it may never have seen.",
  },
  {
    text: "What does this flight cost right now?",
    mode: "look",
    cost: "Guessed: you get a plausible fare, which is not a fare.",
  },
  {
    text: "What is the news on this today?",
    mode: "look",
    cost: "Guessed: it writes the kind of thing that tends to be in the news.",
  },

  // ------------------------------------------------------------ needs a sum
  {
    text: "What is 17.5% of 8,432?",
    mode: "calc",
    cost: "Guessed: arithmetic by pattern comes out close, and close is wrong.",
  },
  {
    text: "Days between 3 March and 19 November?",
    mode: "calc",
    cost: "Guessed: date arithmetic lands a day or two out and looks exact.",
  },
  {
    text: "Total the last column of 400 rows",
    mode: "calc",
    cost: "Guessed: it cannot hold 400 numbers at once, so it estimates one.",
  },
  {
    text: "Standard deviation of these 12 numbers",
    mode: "calc",
    cost: "Guessed: a number of the right size and the wrong value.",
  },
  {
    text: "Compound 180 a month for 7 years at 4%",
    mode: "calc",
    cost: "Guessed: the total arrives invented, to the penny.",
  },
  {
    text: "Sort these 900 names by surname",
    mode: "calc",
    cost: "Guessed: long lists come back shortened and ordered by feel.",
  },
  {
    text: "How many letters are in this sentence?",
    mode: "calc",
    cost: "Guessed: counting characters is the thing it is worst at.",
  },

  // ----------------------------------------------------------- needs my file
  {
    text: "Summarise the contract I attached",
    mode: "read",
    cost: "Guessed: it summarises a contract like the ones it has read, not yours.",
  },
  {
    text: "What did my notes say about the budget?",
    mode: "read",
    cost: "Guessed: it writes a note that sounds like something you would write.",
  },
  {
    text: "Which of my invoices are unpaid?",
    mode: "read",
    cost: "Guessed: it invents invoice numbers in exactly the right format.",
  },
  {
    text: "Does the CV I uploaded mention Python?",
    mode: "read",
    cost: "Guessed: it answers yes or no about a file it has not opened.",
  },
  {
    text: "Find the typo in my draft",
    mode: "read",
    cost: "Guessed: it points at a sentence that is not in your draft.",
  },
  {
    text: "Pull the actions out of my meeting file",
    mode: "read",
    cost: "Guessed: a tidy list of actions nobody in the room agreed.",
  },
  {
    text: "Which slide has the revenue figure?",
    mode: "read",
    cost: "Guessed: a slide number and a figure, both made up.",
  },

  // ------------------------------------------------------- no tool needed
  { text: "Rewrite this sentence in plain English", mode: "guess" },
  { text: "Give me ten names for a bakery", mode: "guess" },
  { text: "Explain recursion to a ten-year-old", mode: "guess" },
  { text: "Draft a polite no to a meeting", mode: "guess" },
  { text: "Turn these bullets into a short email", mode: "guess" },
  { text: "Suggest a shape for a ten-minute talk", mode: "guess" },
  { text: "Write three subject lines for this", mode: "guess" },
  { text: "Make this paragraph half as long", mode: "guess" },
];

/** What a correct routing teaches. */
const RIGHT: Record<Mode, string> = {
  look: "Right. Nothing inside it knows what happened this week. Search hands it a source.",
  calc: "Right. Code returns the actual number. Guessing returns a number that looks actual.",
  read: "Right. Your document is not inside the model. Something has to open it.",
  guess: "Right. No tool needed. Writing is the one job it can do on its own.",
};

/** What a misrouting costs, when the player did not send it to guessing. */
const CROSS: Record<string, string> = {
  "look:calc": "A search finds pages about the sum. It does not do the sum.",
  "look:read": "The web does not have your document in it.",
  "look:guess": "Nothing to look up. It only had to write something.",
  "calc:look": "Code can compute. It cannot know what happened this week.",
  "calc:read": "There is nothing to compute until the file is open.",
  "calc:guess": "Nothing to compute. It only had to write something.",
  "read:look": "Your own files do not contain today.",
  "read:calc": "No file needed. That one was arithmetic.",
  "read:guess": "Nothing to open. That text is already in the message you sent.",
};

export function noteFor(
  chosen: Mode,
  actual: Mode,
  request: Request,
): string {
  if (chosen === actual) return RIGHT[actual];
  if (chosen === "guess") {
    return request.cost ?? "Guessed: nothing checked it against anything.";
  }
  return CROSS[`${chosen}:${actual}`] ?? "Wrong channel for this one.";
}

// ------------------------------------------------------------------- rules --

export function wrap(text: string, max: number): string[] {
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

/**
 * `randomise` is off for the scene rendered before anyone presses play: that
 * one is drawn on the server as well as the client, and a shuffled order would
 * make the two disagree.
 */
export function newScene(
  requests: Request[],
  calm: boolean,
  randomise = true,
): WhichScene {
  return {
    order: randomise
      ? shuffled(requests.length)
      : Array.from({ length: requests.length }, (_, i) => i),
    at: 0,
    card: null,
    arm: { angle: DETENT[1], vel: 0 },
    aim: 1,
    aimedSince: 0,
    chips: [],
    pops: [],
    flash: 0,
    gap: 0.5,
    fall: START_FALL,
    remaining: ROUND_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    right: 0,
    wrong: 0,
    last: null,
    calm,
  };
}

/** Which chute the arm is pointing at, right now. */
export function laneOf(angle: number): number {
  let lane = 0;
  let best = Infinity;
  for (let i = 0; i < DETENT.length; i++) {
    const d = Math.abs(DETENT[i] - angle);
    if (d < best) {
      best = d;
      lane = i;
    }
  }
  return lane;
}

/** Which chute a pointer at this view-space x is over. */
export function laneFromX(x: number): number {
  let lane = 0;
  let best = Infinity;
  for (let i = 0; i < BIN_X.length; i++) {
    const d = Math.abs(BIN_X[i] - x);
    if (d < best) {
      best = d;
      lane = i;
    }
  }
  return lane;
}

export function aimAt(scene: WhichScene, lane: number): WhichScene {
  const next = lane < 0 ? 0 : lane > 3 ? 3 : lane;
  if (next === scene.aim) return scene;
  return { ...scene, aim: next, aimedSince: 0 };
}

export function nudge(scene: WhichScene, by: number): WhichScene {
  return aimAt(scene, scene.aim + by);
}

function spray(x: number, y: number, ink: string, count: number): Chip[] {
  const out: Chip[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 160;
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 90,
      spin: (Math.random() - 0.5) * 800,
      angle: Math.random() * 360,
      life: 0.45 + Math.random() * 0.45,
      ink,
    });
  }
  return out;
}

function feed(scene: WhichScene, requests: Request[]): WhichScene {
  const request = requests[scene.order[scene.at % scene.order.length]];
  return {
    ...scene,
    at: scene.at + 1,
    aimedSince: 0,
    card: {
      request,
      lines: wrap(request.text, WRAP),
      y: SPAWN_Y,
      sent: null,
    },
  };
}

/** The card has reached the arm. Whatever it is pointing at is the answer. */
function land(scene: WhichScene): WhichScene {
  const card = scene.card;
  if (!card || card.sent) return scene;

  const lane = laneOf(scene.arm.angle);
  const chosen = MODES[lane];
  const actual = card.request.mode;
  const correctLane = MODES.indexOf(actual);
  const ok = chosen === actual;

  const note = noteFor(chosen, actual, card.request);
  const last: Verdict = {
    ok,
    text: card.request.text,
    chosen,
    actual,
    lane,
    correctLane,
    note,
  };

  const x = BIN_X[lane];
  const chips = scene.calm
    ? scene.chips
    : [
        ...scene.chips,
        ...spray(x, BIN_Y, ok ? "var(--teal)" : "var(--pink)", ok ? 9 : 5),
      ];

  const common = {
    ...scene,
    card: { ...card, sent: { lane, ok, t: 0 } },
    chips,
    flash: 1,
    last,
    fall: Math.min(TOP_FALL, scene.fall + FALL_STEP),
  };

  if (!ok) {
    return {
      ...common,
      combo: 0,
      wrong: scene.wrong + 1,
      remaining: Math.max(0, scene.remaining - MISS_PENALTY),
      pops: [
        ...scene.pops,
        {
          x,
          y: BIN_Y - 12,
          text: `misrouted −${MISS_PENALTY}s`,
          life: 1,
          ink: "var(--pink-text)",
        },
      ],
    };
  }

  // Deciding early is the skill, so it is what the scoring pays for.
  const early = Math.min(60, Math.round(scene.aimedSince * 50));
  const gained = 100 + early + scene.combo * 10;
  const combo = scene.combo + 1;

  return {
    ...common,
    score: scene.score + gained,
    combo,
    bestCombo: Math.max(scene.bestCombo, combo),
    right: scene.right + 1,
    pops: [
      ...scene.pops,
      {
        x,
        y: BIN_Y - 12,
        text: early >= 30 ? `+${gained} early` : `+${gained}`,
        life: 1,
        ink: "var(--teal)",
      },
    ],
  };
}

/** One frame of falling, swinging and bookkeeping. */
export function advance(
  scene: WhichScene,
  requests: Request[],
  delta: number,
): WhichScene {
  // The arm is a spring with mass. Slightly under-damped normally, critically
  // damped when the reader has asked for less motion.
  const stiffness = 650;
  const damping = scene.calm ? 2 * Math.sqrt(650) : 41;
  const vel =
    scene.arm.vel +
    ((DETENT[scene.aim] - scene.arm.angle) * stiffness - scene.arm.vel * damping) *
      delta;
  const arm = { angle: scene.arm.angle + vel * delta, vel };

  const chips = scene.chips
    .map((c) => ({
      ...c,
      vy: c.vy + 560 * delta,
      x: c.x + c.vx * delta,
      y: c.y + (c.vy + 560 * delta) * delta,
      angle: c.angle + c.spin * delta,
      life: c.life - delta,
    }))
    .filter((c) => c.life > 0 && c.y < VIEW_H + 40);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - 30 * delta, life: p.life - delta }))
    .filter((p) => p.life > 0);

  const base: WhichScene = {
    ...scene,
    arm,
    chips,
    pops,
    flash: Math.max(0, scene.flash - delta * 1.6),
    remaining: Math.max(0, scene.remaining - delta),
  };

  const card = base.card;

  if (!card) {
    const gap = base.gap - delta;
    return gap <= 0 ? feed({ ...base, gap: 0 }, requests) : { ...base, gap };
  }

  if (card.sent) {
    const t = card.sent.t + delta * 2.4;
    if (t >= 1) {
      return { ...base, card: null, gap: base.calm ? 0.55 : 0.38 };
    }
    return { ...base, card: { ...card, sent: { ...card.sent, t } } };
  }

  const y = card.y + base.fall * delta;
  const aimedSince = base.aimedSince + delta;

  if (y < CONTACT_Y) {
    return { ...base, aimedSince, card: { ...card, y } };
  }

  return land({ ...base, aimedSince, card: { ...card, y: CONTACT_Y } });
}
