/**
 * The rules of Magnet, as pure functions.
 *
 * A field of words drifts in a box. The player steers a magnet carrying one
 * word; every other word is pushed or pulled by a force proportional to its
 * real cosine similarity to that word, measured across all fifty dimensions of
 * the GloVe vectors. Nothing here knows about embeddings, the component hands
 * in a `Round` with the similarities already measured, and this file only turns
 * them into motion.
 *
 * Every frame produces a new scene. The bodies are copied before they are
 * moved, so nothing the caller passed in is ever mutated.
 */

import type { Chip } from "@/components/game/assets";

export type Pop = {
  x: number;
  y: number;
  text: string;
  life: number;
  ink: string;
};

export type Body = {
  word: string;
  /** Cosine similarity to the magnet word, in all 50 dimensions. */
  sim: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Half the printed width of the chip, so chips can shove each other. */
  half: number;
};

export type Target = {
  word: string;
  sim: number;
  /** 1 = the single nearest word in the field. */
  rank: number;
};

export type Round = {
  /** The word on the magnet. */
  magnet: string;
  bodies: { word: string; sim: number }[];
  targets: Target[];
};

export type MagnetScene = {
  roundIndex: number;
  targetIndex: number;
  magnet: { x: number; y: number; vx: number; vy: number };
  /** Where the pointer is asking the magnet to go. */
  aim: { x: number; y: number } | null;
  keys: { x: number; y: number };
  bodies: Body[];
  chips: Chip[];
  pops: Pop[];
  /** Ring flash, 1 down to 0. */
  ring: number;
  remaining: number;
  score: number;
  combo: number;
  bestCombo: number;
  caught: number;
  missed: number;
  /** What the last grab actually picked up. This is where the teaching is. */
  last: {
    grabbed: string;
    grabbedSim: number;
    target: string;
    targetSim: number;
    ok: boolean;
  } | null;
  /** Reduced motion: no confetti, heavier damping, calmer field. */
  calm: boolean;
};

export const VIEW_W = 640;
export const VIEW_H = 380;
export const PAD = 26;
export const TOP = 44;
export const ROUND_SECONDS = 45;

/** How far the magnet reaches. Only words inside this ring can be grabbed. */
export const RING = 76;

/**
 * The similarity a word has to beat to be attracted at all. Below it the
 * magnet pushes the word away, which is most of the vocabulary, because most
 * pairs of words have nothing to do with each other.
 */
export const NEUTRAL = 0.3;

const PULL = 900;
const BODY_DRAG = 2.4;
const THRUST = 1200;
const CORE = 36;

export function roundAt(rounds: Round[], index: number): Round | null {
  if (rounds.length === 0) return null;
  return rounds[index % rounds.length];
}

export function targetOf(rounds: Round[], scene: MagnetScene): Target | null {
  const round = roundAt(rounds, scene.roundIndex);
  if (!round || round.targets.length === 0) return null;
  return round.targets[scene.targetIndex % round.targets.length];
}

export function halfWidth(word: string): number {
  return word.length * 3.5 + 9;
}

/**
 * Scatter a round's words around the edge of the field. They start out of
 * reach, so the first thing the player sees is the field sorting itself.
 */
export function layout(round: Round): Body[] {
  const cx = VIEW_W / 2;
  const cy = (VIEW_H + TOP) / 2;
  const count = round.bodies.length;

  return round.bodies.map((b, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 120 + Math.random() * 110;
    const half = halfWidth(b.word);
    return {
      word: b.word,
      sim: b.sim,
      x: clamp(
        cx + Math.cos(angle) * radius * 1.35,
        PAD + half,
        VIEW_W - PAD - half,
      ),
      y: clamp(
        cy + Math.sin(angle) * radius * 0.72,
        TOP + 14,
        VIEW_H - PAD - 14,
      ),
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      half,
    };
  });
}

export function newScene(rounds: Round[], calm: boolean): MagnetScene {
  const round = roundAt(rounds, 0);
  return {
    roundIndex: 0,
    targetIndex: 0,
    magnet: { x: VIEW_W / 2, y: (VIEW_H + TOP) / 2, vx: 0, vy: 0 },
    aim: null,
    keys: { x: 0, y: 0 },
    bodies: round ? layout(round) : [],
    chips: [],
    pops: [],
    ring: 0,
    remaining: ROUND_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    caught: 0,
    missed: 0,
    last: null,
    calm,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function spray(x: number, y: number, ink: string, count: number): Chip[] {
  const out: Chip[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 180;
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      spin: (Math.random() - 0.5) * 900,
      angle: Math.random() * 360,
      life: 0.45 + Math.random() * 0.45,
      ink,
    });
  }
  return out;
}

/** One frame of steering, attraction, shoving and bookkeeping. */
export function advance(
  scene: MagnetScene,
  rounds: Round[],
  delta: number,
): MagnetScene {
  const round = roundAt(rounds, scene.roundIndex);
  if (!round) return scene;

  // ------------------------------------------------------------- the magnet
  const m = { ...scene.magnet };

  if (scene.aim) {
    // A spring rather than a teleport: the magnet lags the pointer, which is
    // what gives the whole field its momentum and its slingshots.
    m.vx += ((scene.aim.x - m.x) * 34 - m.vx * 9) * delta;
    m.vy += ((scene.aim.y - m.y) * 34 - m.vy * 9) * delta;
  } else if (scene.keys.x !== 0 || scene.keys.y !== 0) {
    const len = Math.hypot(scene.keys.x, scene.keys.y) || 1;
    m.vx += ((scene.keys.x / len) * THRUST - m.vx * 3) * delta;
    m.vy += ((scene.keys.y / len) * THRUST - m.vy * 3) * delta;
  } else {
    const keep = Math.max(0, 1 - 5 * delta);
    m.vx *= keep;
    m.vy *= keep;
  }

  m.x += m.vx * delta;
  m.y += m.vy * delta;

  if (m.x < PAD) {
    m.x = PAD;
    m.vx = 0;
  }
  if (m.x > VIEW_W - PAD) {
    m.x = VIEW_W - PAD;
    m.vx = 0;
  }
  if (m.y < TOP + 10) {
    m.y = TOP + 10;
    m.vy = 0;
  }
  if (m.y > VIEW_H - PAD) {
    m.y = VIEW_H - PAD;
    m.vy = 0;
  }

  // -------------------------------------------------------------- the field
  const drag = scene.calm ? BODY_DRAG * 1.8 : BODY_DRAG;
  const bodies = scene.bodies.map((b) => ({ ...b }));

  for (const b of bodies) {
    const dx = m.x - b.x;
    const dy = m.y - b.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const ux = dx / d;
    const uy = dy / d;

    // The whole game: force is the real cosine similarity, shifted so that
    // unrelated words are actively pushed away.
    let force = (b.sim - NEUTRAL) * PULL;

    // Taper close in, so a caught word loiters in the ring instead of welding
    // itself to the magnet.
    if (d < RING) force *= d / RING;

    // And a hard core, so chips never sit on top of the magnet's own label.
    if (d < CORE) force -= (1 - d / CORE) * 1400;

    b.vx += ux * force * delta;
    b.vy += uy * force * delta;

    const keep = Math.max(0, 1 - drag * delta);
    b.vx *= keep;
    b.vy *= keep;

    b.x += b.vx * delta;
    b.y += b.vy * delta;
  }

  // Chips shove each other rather than overlapping, printed type has to stay
  // readable, and the jostling is what makes a crowd round the magnet feel
  // like a crowd.
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = (b.y - a.y) * 1.9;
      const min = a.half + b.half + 4;
      const d = Math.hypot(dx, dy);
      if (d >= min || d === 0) continue;

      const push = (min - d) / 2;
      const ux = dx / d;
      const uy = dy / d;
      a.x -= ux * push;
      a.y -= uy * push * 0.4;
      b.x += ux * push;
      b.y += uy * push * 0.4;
      a.vx -= ux * push * 3;
      b.vx += ux * push * 3;
      a.vy -= uy * push * 1.2;
      b.vy += uy * push * 1.2;
    }
  }

  for (const b of bodies) {
    const left = PAD + b.half;
    const right = VIEW_W - PAD - b.half;
    if (b.x < left) {
      b.x = left;
      b.vx = Math.abs(b.vx) * 0.5;
    }
    if (b.x > right) {
      b.x = right;
      b.vx = -Math.abs(b.vx) * 0.5;
    }
    if (b.y < TOP + 13) {
      b.y = TOP + 13;
      b.vy = Math.abs(b.vy) * 0.5;
    }
    if (b.y > VIEW_H - PAD) {
      b.y = VIEW_H - PAD;
      b.vy = -Math.abs(b.vy) * 0.5;
    }
  }

  const chips = scene.chips
    .map((c) => ({
      ...c,
      vy: c.vy + 520 * delta,
      x: c.x + c.vx * delta,
      y: c.y + (c.vy + 520 * delta) * delta,
      angle: c.angle + c.spin * delta,
      life: c.life - delta,
    }))
    .filter((c) => c.life > 0);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - 32 * delta, life: p.life - delta }))
    .filter((p) => p.life > 0);

  return {
    ...scene,
    magnet: m,
    bodies,
    chips,
    pops,
    ring: Math.max(0, scene.ring - delta * 3),
    remaining: Math.max(0, scene.remaining - delta),
  };
}

/** The player pressed grab. Whatever is nearest inside the ring comes out. */
export function grab(scene: MagnetScene, rounds: Round[]): MagnetScene {
  const round = roundAt(rounds, scene.roundIndex);
  const target = targetOf(rounds, scene);
  if (!round || !target) return scene;

  let picked: Body | null = null;
  let best = Infinity;
  for (const b of scene.bodies) {
    const d = Math.hypot(b.x - scene.magnet.x, b.y - scene.magnet.y);
    if (d < RING && d < best) {
      best = d;
      picked = b;
    }
  }

  const { x, y } = scene.magnet;

  if (!picked) {
    return {
      ...scene,
      ring: 1,
      pops: [
        ...scene.pops,
        {
          x,
          y: y - RING - 6,
          text: "ring empty",
          life: 0.6,
          ink: "var(--ink-faint)",
        },
      ],
    };
  }

  const ok = picked.word === target.word;
  const chips = scene.calm
    ? scene.chips
    : [
        ...scene.chips,
        ...spray(
          picked.x,
          picked.y,
          ok ? "var(--teal)" : "var(--ink-faint)",
          ok ? 9 : 4,
        ),
      ];

  const last = {
    grabbed: picked.word,
    grabbedSim: picked.sim,
    target: target.word,
    targetSim: target.sim,
    ok,
  };

  if (!ok) {
    return {
      ...scene,
      ring: 1,
      combo: 0,
      missed: scene.missed + 1,
      last,
      chips,
      pops: [
        ...scene.pops,
        {
          x,
          y: y - RING - 6,
          text: `${picked.word} ${picked.sim.toFixed(2)}`,
          life: 0.9,
          ink: "var(--pink-text)",
        },
      ],
    };
  }

  const gained = 40 + target.rank * 15 + scene.combo * 10;
  const combo = scene.combo + 1;

  // Next target, and once a magnet word's targets are used up, a new word
  // goes on the magnet and the field is rebuilt around it.
  let roundIndex = scene.roundIndex;
  let targetIndex = scene.targetIndex + 1;
  let bodies = scene.bodies;
  if (targetIndex >= round.targets.length) {
    roundIndex += 1;
    targetIndex = 0;
    const nextRound = roundAt(rounds, roundIndex);
    bodies = nextRound ? layout(nextRound) : scene.bodies;
  } else {
    bodies = scene.bodies.filter((b) => b.word !== picked.word);
  }

  return {
    ...scene,
    roundIndex,
    targetIndex,
    bodies,
    ring: 1,
    score: scene.score + gained,
    combo,
    bestCombo: Math.max(scene.bestCombo, combo),
    caught: scene.caught + 1,
    last,
    chips,
    pops: [
      ...scene.pops,
      {
        x,
        y: y - RING - 6,
        text: `+${gained}`,
        life: 0.9,
        ink: "var(--teal)",
      },
    ],
  };
}

/** Pointer steering. */
export function aimAt(scene: MagnetScene, x: number, y: number): MagnetScene {
  return { ...scene, aim: { x, y }, keys: { x: 0, y: 0 } };
}

export function releaseAim(scene: MagnetScene): MagnetScene {
  return scene.aim === null ? scene : { ...scene, aim: null };
}

/** Keyboard steering. Returns the same scene when nothing changed. */
export function steer(scene: MagnetScene, x: number, y: number): MagnetScene {
  if (scene.aim === null && scene.keys.x === x && scene.keys.y === y) {
    return scene;
  }
  return { ...scene, aim: null, keys: { x, y } };
}
