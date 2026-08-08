/**
 * The rules of Assembly line, as pure functions.
 *
 * Fragments of an instruction ride a belt downward. The player steers a hopper
 * along the bottom and keeps the parts that do work, role, goal, constraints,
 * format, example, while letting the filler fall past. What they keep is
 * assembled into a real prompt at the end and measured with a real tokenizer.
 *
 * Everything here is pure. Randomness comes from a seed carried in the scene,
 * so a frame is a function of the previous frame and nothing else, and every
 * frame returns new objects rather than editing the ones it was handed.
 */

import type { Chip } from "@/components/game/assets";

// ------------------------------------------------------------- the elements --

export type ElementKey = "role" | "goal" | "constraints" | "format" | "example";

export type ElementSpec = {
  key: ElementKey;
  /** Short name, used on the belt slots and the end sheet. */
  label: string;
  /** The question this part of an instruction answers. */
  asks: string;
  /** What goes wrong when it is missing. */
  missing: string;
};

export const ELEMENTS: ElementSpec[] = [
  {
    key: "role",
    label: "Role",
    asks: "Who is doing this?",
    missing:
      "Without it you get the average of everyone who has ever written on the topic.",
  },
  {
    key: "goal",
    label: "Goal",
    asks: "What exactly do you want done?",
    missing:
      "Without it the reader has to guess the job, and a guess is what you get back.",
  },
  {
    key: "constraints",
    label: "Constraints",
    asks: "What are the limits? Length, tone, what to avoid?",
    missing:
      "Without them nothing is out of bounds, so length and tone land wherever they land.",
  },
  {
    key: "format",
    label: "Format",
    asks: "What shape should the answer arrive in?",
    missing:
      "Without it you get prose when you wanted a table, and you do the reformatting.",
  },
  {
    key: "example",
    label: "Example",
    asks: "What does a good one look like?",
    missing:
      "Without one, 'good' means whatever the reader already thought it meant.",
  },
];

export const ELEMENT_ORDER: ElementKey[] = ELEMENTS.map((e) => e.key);

// ------------------------------------------------------------ the fragments --

export type Fragment = {
  text: string;
  /** `null` marks filler: it costs tokens and instructs nothing. */
  element: ElementKey | null;
};

export type Scenario = {
  id: string;
  /** The job on the line this round, in a few words. */
  brief: string;
  /** Only the useful parts. Filler is shared across every scenario. */
  fragments: Fragment[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "refund",
    brief: "Reply to a customer asking for a refund",
    fragments: [
      { text: "You are a support agent.", element: "role" },
      { text: "Act as our support lead.", element: "role" },
      { text: "Reply to this refund email.", element: "goal" },
      { text: "Decide and say what we do.", element: "goal" },
      { text: "Under 120 words.", element: "constraints" },
      { text: "Do not promise a refund.", element: "constraints" },
      { text: "Keep the customer's name.", element: "constraints" },
      { text: "Plain text, no headings.", element: "format" },
      { text: "Three short paragraphs.", element: "format" },
      { text: "Good: 'Sorry, here is why.'", element: "example" },
      { text: "Like: 'We can swap it free.'", element: "example" },
    ],
  },
  {
    id: "report",
    brief: "Summarise a long report for a busy manager",
    fragments: [
      { text: "You are a research analyst.", element: "role" },
      { text: "Act as a briefing writer.", element: "role" },
      { text: "Summarise the report below.", element: "goal" },
      { text: "Pull out the risks only.", element: "goal" },
      { text: "No jargon.", element: "constraints" },
      { text: "Do not invent numbers.", element: "constraints" },
      { text: "Under 200 words.", element: "constraints" },
      { text: "Five bullets, one per risk.", element: "format" },
      { text: "One line of context first.", element: "format" },
      { text: "Like: 'Costs rose 4% in May.'", element: "example" },
      { text: "Good: 'Two suppliers left.'", element: "example" },
    ],
  },
  {
    id: "error",
    brief: "Explain an error message to a beginner",
    fragments: [
      { text: "You are a patient tutor.", element: "role" },
      { text: "Act as a helpdesk engineer.", element: "role" },
      { text: "Explain this error message.", element: "goal" },
      { text: "Say how to fix it.", element: "goal" },
      { text: "Assume no coding at all.", element: "constraints" },
      { text: "No jargon.", element: "constraints" },
      { text: "Under 150 words.", element: "constraints" },
      { text: "Numbered steps at the end.", element: "format" },
      { text: "Two paragraphs, then steps.", element: "format" },
      { text: "Like: 'The file is not there.'", element: "example" },
      { text: "Good: 'Nothing is broken.'", element: "example" },
    ],
  },
];

/**
 * Filler. Every one of these is real writing habit, politeness, urgency,
 * flattery, hedging, and none of it tells the reader anything about the job.
 */
export const FILLER: string[] = [
  "please",
  "ASAP",
  "thanks!!!",
  "kindly",
  "you are the best",
  "as you know",
  "if that is ok",
  "just a quick one",
  "sorry to bother you",
  "super important!!",
  "at your convenience",
  "hope that makes sense",
  "no rush but urgent",
  "do the needful",
];

// ---------------------------------------------------------------- the board --

export const VIEW_W = 560;
export const VIEW_H = 390;
export const PAD = 14;
export const RAIL = 12;
/** The height of the hopper's mouth, where a fragment is caught. */
export const CATCH_Y = 288;
export const CATCH_DEPTH = 26;
export const CATCHER_HALF = 50;
/** Below this a fragment has gone past for good. */
export const FLOOR = 336;
export const SLOT_Y = 350;
export const PIECE_H = 26;

export const ROUND_SECONDS = 45;

const START_SPEED = 78;
const SPEED_RAMP = 2.6;
const MAX_SPEED = 190;
const CALM_SPEED = 140;
const THRUST = 1400;
const START_GAP = 1.2;
const MIN_GAP = 0.55;
const GAP_RAMP = 0.015;
const FILLER_RATE = 0.4;

/**
 * The rubric, in one place so the page can print the same numbers the game
 * awards. Coverage is what is being rewarded: a part you did not have yet is
 * worth four times a second copy of one you did.
 */
export const SCORING = {
  newElement: 120,
  repeatElement: 30,
  fillerDodged: 10,
  fillerCaught: -40,
  streakStep: 5,
  streakCap: 50,
  fullSet: 250,
} as const;

// ----------------------------------------------------------------- the scene --

export type Piece = {
  id: number;
  text: string;
  element: ElementKey | null;
  x: number;
  y: number;
  /** Half the printed width, so the chip can be drawn around its centre. */
  half: number;
};

export type Pop = {
  x: number;
  y: number;
  text: string;
  life: number;
  ink: string;
};

export type Caught = { text: string; element: ElementKey | null };

export type PromptScene = {
  seed: number;
  scenarioIndex: number;
  time: number;
  remaining: number;
  speed: number;
  spawnIn: number;
  nextId: number;
  belt: number;
  pieces: Piece[];
  catcher: { x: number; vx: number };
  /** Where a dragging pointer is asking the hopper to be. */
  aim: number | null;
  /** -1, 0 or 1, from the arrow keys. */
  keys: number;
  chips: Chip[];
  pops: Pop[];
  flash: number;
  flashOk: boolean;
  score: number;
  combo: number;
  bestCombo: number;
  caught: Caught[];
  usefulMissed: number;
  fillerDodged: number;
  /** Reduced motion: no chips, a slower belt. */
  calm: boolean;
};

export function scenarioAt(index: number): Scenario {
  return SCENARIOS[index % SCENARIOS.length];
}

export function halfWidth(text: string): number {
  return text.length * 3.6 + 11;
}

export function newScene(
  scenarioIndex: number,
  seed: number,
  calm: boolean,
): PromptScene {
  return {
    seed: seed >>> 0,
    scenarioIndex,
    time: 0,
    remaining: ROUND_SECONDS,
    speed: START_SPEED,
    spawnIn: 0.4,
    nextId: 1,
    belt: 0,
    pieces: [],
    catcher: { x: VIEW_W / 2, vx: 0 },
    aim: null,
    keys: 0,
    chips: [],
    pops: [],
    flash: 0,
    flashOk: true,
    score: 0,
    combo: 0,
    bestCombo: 0,
    caught: [],
    usefulMissed: 0,
    fillerDodged: 0,
    calm,
  };
}

// -------------------------------------------------------------------- input --

/** A pointer is dragging the hopper to `x`. */
export function steer(scene: PromptScene, x: number): PromptScene {
  return {
    ...scene,
    aim: clamp(x, PAD + CATCHER_HALF, VIEW_W - PAD - CATCHER_HALF),
  };
}

export function release(scene: PromptScene): PromptScene {
  return scene.aim === null ? scene : { ...scene, aim: null };
}

/** An arrow key went down. Keys are ignored while a pointer is dragging. */
export function press(scene: PromptScene, direction: number): PromptScene {
  return { ...scene, keys: direction, aim: null };
}

export function lift(scene: PromptScene, direction: number): PromptScene {
  return scene.keys === direction ? { ...scene, keys: 0 } : scene;
}

// -------------------------------------------------------------------- frame --

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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
      vy: Math.sin(angle) * speed - 80,
      spin: (rnd() - 0.5) * 800,
      angle: rnd() * 360,
      life: 0.4 + rnd() * 0.45,
      ink,
    });
  }
  return out;
}

function choose(
  scene: PromptScene,
  covered: Set<ElementKey>,
  rnd: () => number,
): Fragment {
  if (rnd() < FILLER_RATE) {
    return { text: FILLER[Math.floor(rnd() * FILLER.length)], element: null };
  }

  const scenario = scenarioAt(scene.scenarioIndex);
  const onBelt = new Set(scene.pieces.map((p) => p.text));
  const fresh = scenario.fragments.filter((f) => !onBelt.has(f.text));
  const base = fresh.length > 0 ? fresh : scenario.fragments;

  // Weighted towards parts they have not collected yet, so a full set is
  // reachable inside forty-five seconds without being handed to them.
  const wanted = base.filter((f) => f.element && !covered.has(f.element));
  const pool = wanted.length > 0 && rnd() < 0.7 ? wanted : base;

  return pool[Math.floor(rnd() * pool.length)];
}

/** One frame of belt, steering, catching and bookkeeping. */
export function advance(scene: PromptScene, delta: number): PromptScene {
  let seed = scene.seed;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const time = scene.time + delta;
  const speed = Math.min(
    START_SPEED + time * SPEED_RAMP,
    scene.calm ? CALM_SPEED : MAX_SPEED,
  );

  // ------------------------------------------------------------- the hopper
  const catcher = { ...scene.catcher };
  if (scene.aim !== null) {
    // A spring rather than a jump, so the hopper carries momentum and a late
    // correction overshoots, which is the whole feel of the thing.
    catcher.vx += ((scene.aim - catcher.x) * 38 - catcher.vx * 11) * delta;
  } else if (scene.keys !== 0) {
    catcher.vx += (scene.keys * THRUST - catcher.vx * 3) * delta;
  } else {
    catcher.vx *= Math.max(0, 1 - 6 * delta);
  }
  catcher.x += catcher.vx * delta;

  const lo = PAD + CATCHER_HALF;
  const hi = VIEW_W - PAD - CATCHER_HALF;
  if (catcher.x < lo) {
    catcher.x = lo;
    catcher.vx = 0;
  } else if (catcher.x > hi) {
    catcher.x = hi;
    catcher.vx = 0;
  }

  // ------------------------------------------------------------ the fragments
  const covered = new Set<ElementKey>();
  for (const c of scene.caught) {
    if (c.element) covered.add(c.element);
  }

  const kept: Piece[] = [];
  const caught: Caught[] = [...scene.caught];
  const fresh: Chip[] = [];
  const shouts: Pop[] = [];

  let score = scene.score;
  let combo = scene.combo;
  let bestCombo = scene.bestCombo;
  let usefulMissed = scene.usefulMissed;
  let fillerDodged = scene.fillerDodged;
  let flash = Math.max(0, scene.flash - delta * 3);
  let flashOk = scene.flashOk;

  for (const piece of scene.pieces) {
    const y = piece.y + speed * delta;
    const inMouth = y >= CATCH_Y && y <= CATCH_Y + CATCH_DEPTH;
    const grabbed = inMouth && Math.abs(piece.x - catcher.x) <= CATCHER_HALF;

    if (grabbed) {
      const streak = Math.min(combo * SCORING.streakStep, SCORING.streakCap);

      if (piece.element === null) {
        score += SCORING.fillerCaught;
        combo = 0;
        flash = 1;
        flashOk = false;
        caught.push({ text: piece.text, element: null });
        if (!scene.calm) {
          fresh.push(...spray(catcher.x, CATCH_Y, "var(--pink)", 5, rnd));
        }
        shouts.push({
          x: catcher.x,
          y: CATCH_Y - 14,
          text: `filler ${SCORING.fillerCaught}`,
          life: 0.9,
          ink: "var(--pink-text)",
        });
      } else {
        const isNew = !covered.has(piece.element);
        const gained =
          (isNew ? SCORING.newElement : SCORING.repeatElement) + streak;
        score += gained;
        combo += 1;
        bestCombo = Math.max(bestCombo, combo);
        flash = 1;
        flashOk = true;
        covered.add(piece.element);
        caught.push({ text: piece.text, element: piece.element });
        if (!scene.calm) {
          fresh.push(
            ...spray(
              catcher.x,
              CATCH_Y,
              isNew ? "var(--teal)" : "var(--yellow)",
              isNew ? 8 : 4,
              rnd,
            ),
          );
        }
        shouts.push({
          x: catcher.x,
          y: CATCH_Y - 14,
          text: isNew ? `new part +${gained}` : `+${gained}`,
          life: 0.9,
          ink: isNew ? "var(--teal)" : "var(--yellow-text)",
        });

        if (isNew && covered.size === ELEMENT_ORDER.length) {
          score += SCORING.fullSet;
          shouts.push({
            x: VIEW_W / 2,
            y: CATCH_Y - 46,
            text: `FULL SET +${SCORING.fullSet}`,
            life: 1.4,
            ink: "var(--teal)",
          });
        }
      }
      continue;
    }

    if (y > FLOOR) {
      if (piece.element === null) {
        const streak = Math.min(combo * SCORING.streakStep, SCORING.streakCap);
        score += SCORING.fillerDodged + streak;
        combo += 1;
        bestCombo = Math.max(bestCombo, combo);
        fillerDodged += 1;
      } else {
        usefulMissed += 1;
        combo = 0;
      }
      continue;
    }

    kept.push({ ...piece, y });
  }

  // ---------------------------------------------------------------- spawning
  let spawnIn = scene.spawnIn - delta;
  let nextId = scene.nextId;
  if (spawnIn <= 0) {
    const fragment = choose({ ...scene, pieces: kept, caught }, covered, rnd);
    const half = halfWidth(fragment.text);
    kept.push({
      id: nextId,
      text: fragment.text,
      element: fragment.element,
      x: clamp(
        PAD + half + rnd() * (VIEW_W - 2 * PAD - 2 * half),
        PAD + half,
        VIEW_W - PAD - half,
      ),
      y: -PIECE_H,
      half,
    });
    nextId += 1;
    spawnIn = Math.max(MIN_GAP, START_GAP - time * GAP_RAMP);
  }

  // ------------------------------------------------------------------ debris
  const chips = scene.chips
    .map((c) => ({
      ...c,
      vy: c.vy + 620 * delta,
      x: c.x + c.vx * delta,
      y: c.y + (c.vy + 620 * delta) * delta,
      angle: c.angle + c.spin * delta,
      life: c.life - delta,
    }))
    .filter((c) => c.life > 0 && c.y < VIEW_H + 40)
    .concat(fresh);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - 30 * delta, life: p.life - delta }))
    .filter((p) => p.life > 0)
    .concat(shouts);

  return {
    ...scene,
    seed,
    time,
    remaining: Math.max(0, scene.remaining - delta),
    speed,
    spawnIn,
    nextId,
    belt: (scene.belt + speed * delta) % 34,
    pieces: kept,
    catcher,
    chips,
    pops,
    flash,
    flashOk,
    score: Math.max(0, score),
    combo,
    bestCombo,
    caught,
    usefulMissed,
    fillerDodged,
  };
}

// ------------------------------------------------------------- the artefact --

export type Assembled = {
  /** The prompt itself, exactly as it would be pasted. */
  text: string;
  /** The pieces in reading order, useful parts first and filler last. */
  parts: Caught[];
  covered: ElementKey[];
  missing: ElementKey[];
  fillerCount: number;
};

/**
 * Puts the collected fragments into the order a person would write them, so
 * what comes out is a prompt rather than a scoreboard. Filler is kept, at the
 * end, because pretending it was never caught would hide its cost.
 */
export function assemble(caught: Caught[]): Assembled {
  const parts: Caught[] = [];
  const covered: ElementKey[] = [];

  for (const key of ELEMENT_ORDER) {
    const mine = caught.filter((c) => c.element === key);
    if (mine.length > 0) covered.push(key);
    parts.push(...mine);
  }

  const filler = caught.filter((c) => c.element === null);
  parts.push(...filler);

  return {
    text: parts.map((p) => p.text).join(" "),
    parts,
    covered,
    missing: ELEMENT_ORDER.filter((k) => !covered.includes(k)),
    fillerCount: filler.length,
  };
}

// ------------------------------------------------------------ the inspector --

export type Signal = {
  key: ElementKey;
  present: boolean;
  /** The words that triggered the match, so the reader can judge it. */
  evidence: string | null;
};

const PATTERNS: Record<ElementKey, RegExp[]> = {
  role: [
    /\b(?:you are|you are|act as|respond as|your role is|imagine you are|pretend to be)\b[^.!?\n]{0,44}/i,
  ],
  goal: [
    /\b(?:your task is|your job is|i want you to|i need you to|i'd like you to)\b[^.!?\n]{0,44}/i,
    /(?:^|[.!?\n]\s*)(?:write|rewrite|summari[sz]e|list|explain|draft|compare|translate|fix|review|plan|generate|create|analy[sz]e|extract|classify|suggest|outline|describe|check|convert|edit|shorten|expand|reply|answer|rank|score|turn)\b[^.!?\n]{0,44}/i,
  ],
  constraints: [
    /\b(?:under|no more than|at most|fewer than|within|do not|do not|never|avoid|must not|only use|only include|at least|between \d|word limit|no longer than|keep it)\b[^.!?\n]{0,44}/i,
    /\b\d+\s*(?:words?|sentences?|bullets?|characters?|paragraphs?|items?|lines?|steps?)\b/i,
  ],
  format: [
    /\b(?:bullet(?:s|ed| points?)?|numbered list|as a list|table|json|markdown|csv|yaml|xml|columns?|headings?|plain text|one sentence|one line|sections?|template|schema|paragraphs? then|steps at the end)\b[^.!?\n]{0,30}/i,
  ],
  example: [
    /\b(?:for example|for instance|e\.g\.|example:|examples:|here(?:'s| is) an example|like this:|such as|sample:|good example|good:|like:)[^.!?\n]{0,44}/i,
  ],
};

function tidy(match: string): string {
  const cleaned = match.replace(/\s+/g, " ").trim();
  return cleaned.length > 52 ? `${cleaned.slice(0, 49)}…` : cleaned;
}

/**
 * A keyword check, not comprehension.
 *
 * It looks for the shapes these five parts usually take in English and reports
 * what it matched on, so the reader can see the evidence and overrule it. It
 * can be fooled in both directions and the UI says so.
 */
export function inspect(text: string): Signal[] {
  return ELEMENT_ORDER.map((key) => {
    for (const pattern of PATTERNS[key]) {
      const found = text.match(pattern);
      if (found) {
        return { key, present: true, evidence: tidy(found[0]) };
      }
    }
    return { key, present: false, evidence: null };
  });
}

export function elementSpec(key: ElementKey): ElementSpec {
  return ELEMENTS.find((e) => e.key === key)!;
}
