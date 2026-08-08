/**
 * The rules of Plinko, as pure functions.
 *
 * A real prompt, a real model's real odds on the next token, and one control:
 * the temperature dial. You are told which token to land on and given eight
 * balls to do it with. Cold makes the top token near-certain and the machine
 * boring; hot gives the tail a chance and makes nothing reliable. Discovering
 * that those are the same dial pointing opposite ways is the entire lesson,
 * and losing four balls in a row teaches it better than a diagram does.
 *
 * HONESTY. Nothing here invents a probability. Every weight comes from the
 * logits recorded in `logits.json`, rescaled by the dial and renormalised over
 * the candidates on the board, which the page states plainly, because the
 * board holds six of the model's 50,257 tokens.
 *
 * PURITY. The reducer never rolls a die. Draws are made by the caller in the
 * event handler and passed in as plain numbers, so `drop` is a function of its
 * arguments alone and is safe to run twice in a state updater.
 */

import { atTemperature, type LogitData, type LogitPrompt } from "@/lib/logits";

/* ------------------------------------------------------------------ rules -- */

/** Balls per prompt. Few enough that a greedy dial setting is tempting. */
export const DROPS = 8;
/** Candidates on the board. The rest of the vocabulary is stated, not shown. */
export const SLOTS = 6;
export const MIN_T = 0.2;
export const MAX_T = 2;
/** A hit is worth more the less likely you made it. Capped so it stays a game. */
const MAX_POINTS = 900;
const MIN_POINTS = 20;
const POINT_BUDGET = 120;

/* ------------------------------------------------------------------ types -- */

export type Landing = {
  /** Slot the ball fell into. */
  index: number;
  /** Slot that was asked for. */
  target: number;
  /** The token it fell on, carried so the message survives a prompt change. */
  text: string;
  /** Which prompt it belonged to, so the board only lights its own landings. */
  at: number;
  temperature: number;
  hit: boolean;
};

export type PlinkoScene = {
  /** Prompt indices, in the order they will be played. */
  order: number[];
  /** How far through `order` we are. */
  at: number;
  /** Slot the current prompt is asking for. */
  target: number;
  temperature: number;
  dropsLeft: number;
  score: number;
  hits: number;
  balls: number;
  /** Most recent landings, newest first. */
  history: Landing[];
  done: boolean;
};

/** The scene before a round starts, no prompt, nothing to drop into. */
export function newScene(): PlinkoScene {
  return {
    order: [],
    at: 0,
    target: 0,
    temperature: 1,
    dropsLeft: DROPS,
    score: 0,
    hits: 0,
    balls: 0,
    history: [],
    done: false,
  };
}

/* ------------------------------------------------------------------- play -- */

/** The prompt a scene is currently on, or undefined before the round starts. */
export function promptOf(
  data: LogitData | null,
  scene: PlinkoScene,
): LogitPrompt | undefined {
  if (!data || scene.order.length === 0) return undefined;
  return data.prompts[scene.order[scene.at]];
}

/** The board's weights: the model's logits at this dial, over the kept slots. */
export function boardWeights(
  prompt: LogitPrompt,
  temperature: number,
): number[] {
  const full = atTemperature(prompt, temperature);
  const kept = full.slice(0, SLOTS);
  const total = kept.reduce((a, b) => a + b, 0);
  return total > 0 ? kept.map((w) => w / total) : kept;
}

/**
 * Which slot a roll in [0, 1) falls into.
 *
 * Exported so the caller can draw the number and the reducer can stay pure.
 */
export function slotFor(weights: number[], roll: number): number {
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return i;
  }
  return Math.max(0, weights.length - 1);
}

/** Which slot to ask for next, from a roll in [0, 1). */
export function targetFor(prompt: LogitPrompt, roll: number): number {
  const reachable = Math.max(1, Math.min(SLOTS, prompt.candidates.length));
  return Math.min(reachable - 1, Math.floor(roll * reachable));
}

/** A shuffled play order, from one roll per position in [0, 1). */
export function orderFrom(count: number, rolls: number[]): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor((rolls[i] ?? 0) * (i + 1)));
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  return order;
}

export function start(
  data: LogitData,
  rolls: number[],
  targetRoll: number,
): PlinkoScene {
  const order = orderFrom(data.prompts.length, rolls);
  return {
    ...newScene(),
    order,
    target: targetFor(data.prompts[order[0]], targetRoll),
  };
}

export function setTemperature(
  scene: PlinkoScene,
  temperature: number,
): PlinkoScene {
  const clamped = Math.min(MAX_T, Math.max(MIN_T, temperature));
  if (clamped === scene.temperature) return scene;
  return { ...scene, temperature: clamped };
}

/**
 * One ball.
 *
 * `roll` places the ball, `targetRoll` picks the next prompt's target. Both are
 * drawn by the caller. The guard is on the scene rather than on a closed-over
 * copy of it, so a burst of clicks in a single tick cannot spend more balls
 * than the round has.
 */
export function drop(
  data: LogitData,
  scene: PlinkoScene,
  roll: number,
  targetRoll: number,
): PlinkoScene {
  const prompt = promptOf(data, scene);
  if (!prompt || scene.done || scene.dropsLeft <= 0) return scene;

  const weights = boardWeights(prompt, scene.temperature);
  const index = slotFor(weights, roll);
  const hit = index === scene.target;
  const chance = weights[scene.target] ?? 0;

  const gained = hit
    ? Math.min(
        MAX_POINTS,
        Math.max(MIN_POINTS, Math.round(POINT_BUDGET / Math.max(0.05, chance))),
      )
    : 0;

  const landed: Landing = {
    index,
    target: scene.target,
    text: prompt.candidates[index]?.text ?? "",
    at: scene.at,
    temperature: scene.temperature,
    hit,
  };

  const spent: PlinkoScene = {
    ...scene,
    dropsLeft: scene.dropsLeft - 1,
    score: scene.score + gained,
    hits: scene.hits + (hit ? 1 : 0),
    balls: scene.balls + 1,
    history: [landed, ...scene.history].slice(0, 6),
  };

  if (spent.dropsLeft > 0) return spent;

  const next = spent.at + 1;
  if (next >= spent.order.length) return { ...spent, done: true };

  return {
    ...spent,
    at: next,
    dropsLeft: DROPS,
    target: targetFor(data.prompts[spent.order[next]], targetRoll),
  };
}
