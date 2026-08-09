/**
 * The rules of Would you paste it?, as pure functions.
 */

import type { Chip } from "@/components/game/assets";

/* ------------------------------------------------------------------ types -- */

export type Door = "paste" | "redact" | "never";

export type DoorSpec = {
  id: Door;
  key: string;
  label: string;
  means: string;
};

export const DOORS: readonly DoorSpec[] = [
  {
    id: "paste",
    key: "1",
    label: "Paste it",
    means: "Straight in, as it is.",
  },
  {
    id: "redact",
    key: "2",
    label: "Strip first",
    means: "Take the names and numbers out, paste the rest.",
  },
  {
    id: "never",
    key: "3",
    label: "Keep it out",
    means: "Not into this tool. Do it another way.",
  },
];

export function doorSpec(id: Door): DoorSpec {
  return DOORS.find((d) => d.id === id)!;
}

/**
 * What kind of thing it is. The first four are legal categories; `open` is the
 * ordinary case that makes the whole tool worth having.
 */
export type Kind = "open" | "personal" | "special" | "secret";

export const KIND_LABEL: Record<Kind, string> = {
  open: "Public or yours",
  personal: "Identifies a person",
  special: "Special category",
  secret: "Somebody else's secret",
};

export const KIND_NOTE: Record<Kind, string> = {
  open: "Already public, or your own ordinary work. Nothing here is about anyone else.",
  personal:
    "Personal data: it identifies a living person. Usually the identifiers, not the substance, are what you actually needed to send.",
  special:
    "Special category data under Article 9. That covers health, race, religion, politics, trade union membership, sex life or orientation, genetics and biometrics, plus criminal offence data. The bar for handling this is much higher than for ordinary personal data.",
  secret:
    "Not yours to disclose: credentials, unreleased figures, a client's confidential material, anything under an agreement you signed.",
};

/** The routing rule this module teaches. */
export const CORRECT: Record<Kind, Door> = {
  open: "paste",
  personal: "redact",
  special: "never",
  secret: "never",
};

export type Payload = {
  text: string;
  kind: Kind;
  /** What is actually in it, printed under the title. */
  contains: string;
};

/**
 * Twenty-six things a person might reasonably consider pasting. All written for
 * this exercise; none is anybody's real data.
 */
export const PAYLOADS: readonly Payload[] = [
  {
    text: "A blog post you wrote and published last year",
    kind: "open",
    contains: "your own words, already on the internet",
  },
  {
    text: "A customer's complaint email, with their name and address",
    kind: "personal",
    contains: "a named living person and where they live",
  },
  {
    text: "A colleague's sick note explaining their diagnosis",
    kind: "special",
    contains: "health data about an identifiable person",
  },
  {
    text: "Your company's unreleased quarterly numbers",
    kind: "secret",
    contains: "material non-public financial information",
  },
  {
    text: "A paragraph of your own draft that reads badly",
    kind: "open",
    contains: "your own prose, about nothing in particular",
  },
  {
    text: "A spreadsheet of survey answers with respondent names",
    kind: "personal",
    contains: "names attached to individual responses",
  },
  {
    text: "An API key from your production config file",
    kind: "secret",
    contains: "a live credential",
  },
  {
    text: "A press release that went out this morning",
    kind: "open",
    contains: "text that is already public",
  },
  {
    text: "Notes from a disciplinary meeting about a named employee",
    kind: "personal",
    contains: "an identified person and an account of their conduct",
  },
  {
    text: "A job applicant's declaration of a disability",
    kind: "special",
    contains: "health data, in a hiring context",
  },
  {
    text: "The public documentation for a library you are using",
    kind: "open",
    contains: "a published manual",
  },
  {
    text: "A client contract marked confidential",
    kind: "secret",
    contains: "material you agreed in writing not to disclose",
  },
  {
    text: "A list of ten possible names for your new product",
    kind: "open",
    contains: "ideas you had this morning",
  },
  {
    text: "A patient's appointment letter",
    kind: "special",
    contains: "health data about an identifiable person",
  },
  {
    text: "A screenshot of a Slack thread with everyone's names",
    kind: "personal",
    contains: "identifiable colleagues and what they said",
  },
  {
    text: "Your own CV, the version you publish online",
    kind: "open",
    contains: "your own information, already published by you",
  },
  {
    text: "A member list including trade union membership",
    kind: "special",
    contains: "trade union membership, explicitly special category",
  },
  {
    text: "The full text of an open-source licence",
    kind: "open",
    contains: "a public legal document",
  },
  {
    text: "A partner's unreleased pricing, shared under NDA",
    kind: "secret",
    contains: "another organisation's confidential terms",
  },
  {
    text: "A support ticket with the customer's phone number",
    kind: "personal",
    contains: "a direct identifier you did not need to include",
  },
  {
    text: "A photo of a colleague's face, to caption",
    kind: "special",
    contains:
      "an image used to identify a person, which is biometric territory",
  },
  {
    text: "A meeting agenda for a public webinar",
    kind: "open",
    contains: "information that is going out publicly anyway",
  },
  {
    text: "An internal wiki page about your team's process",
    kind: "secret",
    contains: "your employer's internal material, if policy forbids it",
  },
  {
    text: "An anonymised extract with all names replaced by roles",
    kind: "open",
    contains: "the substance, with the identifiers already gone",
  },
  {
    text: "A donor list for a religious charity",
    kind: "special",
    contains: "religious belief, inferred from membership",
  },
  {
    text: "A bug report a user filed, signed with their email",
    kind: "personal",
    contains: "an email address attached to a report",
  },
];

/* ---------------------------------------------------------------- scoring -- */

export const ROUND_SECONDS = 45;

export const EXACT_POINTS = 130;
export const NEAR_POINTS = 45;
export const OVERCAUTION_POINTS = 20;
export const LEAK_COST = 180;
export const STREAK_STEP = 12;
export const STREAK_CAP = 72;

/** Leaks the round can survive before it is stopped. */
export const LEAK_LIMIT = 3;

export function leakWeight(kind: Kind): number {
  if (kind === "special" || kind === "secret") return 2;
  if (kind === "personal") return 1;
  return 0;
}

/* --------------------------------------------------------------- geometry -- */

export const VIEW_W = 560;
export const VIEW_H = 290;

export const ITEM_W = 400;
export const ITEM_H = 108;
export const ITEM_X = VIEW_W / 2;
export const ITEM_Y = 104;
export const ENTER_X = VIEW_W + ITEM_W;

export const DOOR_Y = 226;
export const DOOR_W = 150;
export const DOOR_H = 52;
export const DOOR_X = [110, 280, 450];

/* ------------------------------------------------------------------ scene -- */

export type Outcome = "exact" | "near" | "overcautious" | "leak";

export type Judgement = {
  payload: Payload;
  chose: Door;
  should: Door;
  outcome: Outcome;
  gained: number;
};

export type Pop = {
  x: number;
  y: number;
  text: string;
  life: number;
  ink: string;
};

export type PasteScene = {
  seed: number;
  order: number[];
  at: number;
  item: { payload: Payload; x: number } | null;
  gap: number;
  remaining: number;
  score: number;
  streak: number;
  bestStreak: number;
  exact: number;
  leaks: number;
  leakUnits: number;
  blocked: boolean;
  log: Judgement[];
  last: Judgement | null;
  ribbonLife: number;
  flashDoor: number;
  flashOk: boolean;
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

export function newScene(seed: number, calm: boolean): PasteScene {
  const rnd = rng(seed || 1);
  return {
    seed: seed >>> 0 || 1,
    order: shuffled(PAYLOADS.length, rnd),
    at: 0,
    item: null,
    gap: 0.3,
    remaining: ROUND_SECONDS,
    score: 0,
    streak: 0,
    bestStreak: 0,
    exact: 0,
    leaks: 0,
    leakUnits: 0,
    blocked: false,
    log: [],
    last: null,
    ribbonLife: 0,
    flashDoor: -1,
    flashOk: true,
    chips: [],
    pops: [],
    calm,
  };
}

function spray(
  x: number,
  y: number,
  ink: string,
  count: number,
  rnd: () => number,
): Chip[] {
  const out: Chip[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rnd() * Math.PI * 2;
    const speed = 70 + rnd() * 150;
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 90,
      spin: (rnd() - 0.5) * 760,
      angle: rnd() * 360,
      life: 0.4 + rnd() * 0.45,
      ink,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ frame -- */

export function advance(scene: PasteScene, delta: number): PasteScene {
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

  const base: PasteScene = {
    ...scene,
    chips,
    pops,
    ribbonLife: Math.max(0, scene.ribbonLife - delta),
    flashDoor: scene.ribbonLife - delta > 1.7 ? scene.flashDoor : -1,
    remaining: scene.blocked ? 0 : Math.max(0, scene.remaining - delta),
  };

  if (base.remaining === 0) return base;

  if (!base.item) {
    const gap = base.gap - delta;
    if (gap > 0) return { ...base, gap };
    const payload = PAYLOADS[base.order[base.at % base.order.length]];
    return {
      ...base,
      at: base.at + 1,
      gap: 0,
      item: { payload, x: ENTER_X },
    };
  }

  const item = base.item;
  if (item.x > ITEM_X) {
    const x = Math.max(
      ITEM_X,
      item.x - (item.x - ITEM_X) * 11 * delta - 60 * delta,
    );
    return { ...base, item: { ...item, x } };
  }

  return base;
}

/* ---------------------------------------------------------------- actions -- */

export function route(scene: PasteScene, chose: Door): PasteScene {
  const item = scene.item;
  if (!item || item.x > ITEM_X + 1 || scene.remaining <= 0) return scene;

  const payload = item.payload;
  const should = CORRECT[payload.kind];
  const lane = DOORS.findIndex((d) => d.id === chose);

  let outcome: Outcome;
  if (chose === should) outcome = "exact";
  else if (chose === "paste") outcome = "leak";
  else if (chose === "never" && should === "paste") outcome = "overcautious";
  else outcome = "near";

  const streakBonus = Math.min(scene.streak * STREAK_STEP, STREAK_CAP);
  const gained =
    outcome === "exact"
      ? EXACT_POINTS + streakBonus
      : outcome === "near"
        ? NEAR_POINTS
        : outcome === "overcautious"
          ? OVERCAUTION_POINTS
          : -LEAK_COST;

  const units = outcome === "leak" ? leakWeight(payload.kind) : 0;
  const leakUnits = scene.leakUnits + units;
  const rnd = rng(scene.seed + scene.at * 6151);

  return {
    ...scene,
    seed: (Math.imul(scene.seed, 1664525) + 1013904223) >>> 0,
    item: null,
    gap: 0.2,
    score: Math.max(0, scene.score + gained),
    streak: outcome === "exact" ? scene.streak + 1 : 0,
    bestStreak: Math.max(
      scene.bestStreak,
      outcome === "exact" ? scene.streak + 1 : scene.streak,
    ),
    exact: scene.exact + (outcome === "exact" ? 1 : 0),
    leaks: scene.leaks + (outcome === "leak" ? 1 : 0),
    leakUnits,
    blocked: leakUnits >= LEAK_LIMIT,
    log: [...scene.log, { payload, chose, should, outcome, gained }],
    last: { payload, chose, should, outcome, gained },
    ribbonLife: 2.4,
    flashDoor: lane,
    flashOk: outcome !== "leak",
    chips: scene.calm
      ? scene.chips
      : [
          ...scene.chips,
          ...spray(
            DOOR_X[lane],
            DOOR_Y,
            outcome === "leak" ? "var(--pink)" : "var(--teal)",
            outcome === "leak" ? 11 : 6,
            rnd,
          ),
        ],
    pops: [
      ...scene.pops,
      {
        x: DOOR_X[lane],
        y: DOOR_Y - 20,
        text: gained >= 0 ? `+${gained}` : `−${Math.abs(gained)}`,
        life: 1,
        ink: gained >= 0 ? "var(--teal-text)" : "var(--pink-text)",
      },
    ],
  };
}

/** The line read back after a decision. */
export function verdictOf(j: Judgement): { text: string; ok: boolean } {
  if (j.outcome === "exact") {
    return { ok: true, text: `Right. ${KIND_NOTE[j.payload.kind]}` };
  }
  if (j.outcome === "leak") {
    return {
      ok: false,
      text: `That went in whole. ${KIND_NOTE[j.payload.kind]}`,
    };
  }
  if (j.outcome === "overcautious") {
    return {
      ok: false,
      text: "Nothing in that one was anybody's but yours. Refuse enough of these and the tool is no use to you, which is its own kind of failure.",
    };
  }
  return {
    ok: false,
    text: `Safe, but not the call. ${KIND_NOTE[j.payload.kind]}`,
  };
}
