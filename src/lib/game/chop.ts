/**
 * The rules of Chop, as pure functions.
 *
 * Kept out of the component so the physics and the scoring can be reasoned
 * about — and tested — without a browser. Every frame produces a new scene from
 * the old one; nothing here mutates anything the caller passed in.
 */

import type { Chip } from "@/components/game/assets";

export type ChopWord = {
  word: string;
  pieces: string[];
  /** Character offsets the real tokenizer breaks this word at. */
  cuts: number[];
};

export type Pop = {
  x: number;
  y: number;
  text: string;
  life: number;
  ink: string;
};

export type ChopScene = {
  scroll: number;
  speed: number;
  wordIndex: number;
  hit: number[];
  passed: number[];
  chips: Chip[];
  pops: Pop[];
  flash: number;
  remaining: number;
  score: number;
  combo: number;
  bestCombo: number;
  perfect: number;
  close: number;
  missed: number;
};

export const VIEW_W = 640;
export const VIEW_H = 210;
export const STRIP_Y = 52;
export const STRIP_H = 100;
export const BLADE_X = 250;
export const CHAR_W = 26;
export const ROUND_SECONDS = 45;

/** Pixels from a true boundary. Generous, because the strip is moving. */
export const PERFECT = 10;
export const CLOSE = 24;

export function newScene(wordIndex: number): ChopScene {
  return {
    scroll: 0,
    speed: 74,
    wordIndex,
    hit: [],
    passed: [],
    chips: [],
    pops: [],
    flash: 0,
    remaining: ROUND_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    perfect: 0,
    close: 0,
    missed: 0,
  };
}

/** Where a character offset currently sits on screen. */
export function offsetToX(offset: number, scroll: number): number {
  return VIEW_W - scroll + offset * CHAR_W;
}

export function wordAt(words: ChopWord[], index: number): ChopWord {
  return words[index % words.length];
}

function spray(x: number, y: number, ink: string, count: number): Chip[] {
  const out: Chip[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: x + (Math.random() - 0.5) * 10,
      y,
      vx: (Math.random() - 0.35) * 190,
      vy: -110 - Math.random() * 190,
      spin: (Math.random() - 0.5) * 900,
      angle: Math.random() * 360,
      life: 0.5 + Math.random() * 0.5,
      ink,
    });
  }
  return out;
}

/** One frame of motion, gravity and bookkeeping. */
export function advance(
  scene: ChopScene,
  words: ChopWord[],
  delta: number,
): ChopScene {
  const current = wordAt(words, scene.wordIndex);
  let scroll = scene.scroll + scene.speed * delta;

  // Boundaries that slipped past the blade uncut.
  const passed = [...scene.passed];
  let missed = scene.missed;
  let combo = scene.combo;

  for (const cut of current.cuts) {
    if (scene.hit.includes(cut) || passed.includes(cut)) continue;
    if (offsetToX(cut, scroll) < BLADE_X - CLOSE) {
      passed.push(cut);
      missed += 1;
      combo = 0;
    }
  }

  const chips = scene.chips
    .map((c) => ({
      ...c,
      vy: c.vy + 620 * delta,
      x: c.x + c.vx * delta,
      y: c.y + (c.vy + 620 * delta) * delta,
      angle: c.angle + c.spin * delta,
      life: c.life - delta,
    }))
    .filter((c) => c.life > 0 && c.y < VIEW_H + 40);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - 34 * delta, life: p.life - delta }))
    .filter((p) => p.life > 0);

  let { wordIndex, speed } = scene;
  let hit = scene.hit;
  let cleared = passed;

  // The whole word has left the press — feed the next one.
  if (offsetToX([...current.word].length, scroll) < -40) {
    wordIndex += 1;
    scroll = 0;
    hit = [];
    cleared = [];
    speed = Math.min(speed + 5, 170);
  }

  return {
    ...scene,
    scroll,
    speed,
    wordIndex,
    hit,
    passed: cleared,
    chips,
    pops,
    flash: Math.max(0, scene.flash - delta * 3),
    remaining: Math.max(0, scene.remaining - delta),
    combo,
    missed,
  };
}

/** The player pressed. Score against the nearest uncut boundary. */
export function cut(scene: ChopScene, words: ChopWord[]): ChopScene {
  const current = wordAt(words, scene.wordIndex);

  let target: number | null = null;
  let distance = Infinity;
  for (const c of current.cuts) {
    if (scene.hit.includes(c) || scene.passed.includes(c)) continue;
    const d = Math.abs(offsetToX(c, scene.scroll) - BLADE_X);
    if (d < distance) {
      distance = d;
      target = c;
    }
  }

  const y = STRIP_Y + STRIP_H / 2;

  if (target === null || distance > CLOSE) {
    return {
      ...scene,
      combo: 0,
      missed: scene.missed + 1,
      chips: [...scene.chips, ...spray(BLADE_X, y, "var(--ink-faint)", 3)],
      pops: [
        ...scene.pops,
        {
          x: BLADE_X,
          y: STRIP_Y - 6,
          text: "no boundary",
          life: 0.7,
          ink: "var(--pink-text)",
        },
      ],
    };
  }

  const isPerfect = distance <= PERFECT;
  const gained = (isPerfect ? 100 : 45) + scene.combo * 10;
  const combo = scene.combo + 1;

  return {
    ...scene,
    hit: [...scene.hit, target],
    flash: 1,
    score: scene.score + gained,
    combo,
    bestCombo: Math.max(scene.bestCombo, combo),
    perfect: scene.perfect + (isPerfect ? 1 : 0),
    close: scene.close + (isPerfect ? 0 : 1),
    chips: [
      ...scene.chips,
      ...spray(
        BLADE_X,
        y,
        isPerfect ? "var(--teal)" : "var(--yellow)",
        isPerfect ? 9 : 6,
      ),
    ],
    pops: [
      ...scene.pops,
      {
        x: BLADE_X,
        y: STRIP_Y - 6,
        text: isPerfect ? `PERFECT +${gained}` : `+${gained}`,
        life: 0.85,
        ink: isPerfect ? "var(--teal)" : "var(--yellow-text)",
      },
    ],
  };
}
