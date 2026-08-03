"use client";

/**
 * Loading and reading the extracted attention weights.
 *
 * Everything in `attention.json` came out of a forward pass over DistilGPT-2's
 * published parameters, checked against the same model run through
 * `@huggingface/transformers` before it was written. This file only decodes it
 * and picks rounds out of it — it never invents a number, and it never chooses
 * a head because the picture is prettier.
 */

export type AttentionToken = { id: number; text: string };

export type AttentionSentence = {
  id: string;
  text: string;
  ask: string;
  tokens: AttentionToken[];
  /** [layer][head] → base64 of an n×n row-major uint8 matrix. */
  attention: string[][];
};

export type AttentionData = {
  model: {
    id: string;
    name: string;
    url: string;
    licence: string;
    layers: number;
    heads: number;
    headDim: number;
  };
  verification: { method: string; tolerance: number };
  sentences: AttentionSentence[];
};

let dataPromise: Promise<AttentionData> | null = null;

export function loadAttention(): Promise<AttentionData> {
  if (!dataPromise) {
    dataPromise = fetch("/data/attention.json").then((r) => {
      if (!r.ok) throw new Error(`attention: ${r.status}`);
      return r.json() as Promise<AttentionData>;
    });
  }
  return dataPromise;
}

/** One attention matrix, decoded to weights in 0…1. */
export function matrixOf(
  sentence: AttentionSentence,
  layer: number,
  head: number,
): number[][] {
  const n = sentence.tokens.length;
  const binary = atob(sentence.attention[layer][head]);
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) row.push(binary.charCodeAt(i * n + j) / 255);
    rows.push(row);
  }
  return rows;
}

export type BeamRound = {
  sentence: AttentionSentence;
  layer: number;
  head: number;
  /** The token whose attention is being asked about. */
  query: number;
  /** Where its beam actually goes, first token excluded. */
  answer: number;
  weights: number[];
  answerWeight: number;
  runnerUpWeight: number;
  /** How much of this row went to the very first token regardless. */
  sinkWeight: number;
};

/**
 * Finds rounds worth asking about: a query token whose strongest link — once
 * the first-token sink is set aside — is clearly ahead of the next one.
 *
 * The threshold is a playability rule, not a claim: a row where the top two
 * are within a hair of each other is a coin flip, and a coin flip teaches
 * nothing. Every number reported is still the model's own.
 */
export function buildRounds(
  data: AttentionData,
  margin = 0.06,
  minimum = 0.18,
): BeamRound[] {
  const rounds: BeamRound[] = [];

  for (const sentence of data.sentences) {
    const n = sentence.tokens.length;
    for (let layer = 0; layer < data.model.layers; layer++) {
      for (let head = 0; head < data.model.heads; head++) {
        const rows = matrixOf(sentence, layer, head);
        // Only later tokens have enough history to make the question fair.
        for (let query = Math.max(3, Math.floor(n / 2)); query < n; query++) {
          const row = rows[query];
          let best = -1;
          let bestWeight = 0;
          let second = 0;
          for (let j = 1; j <= query; j++) {
            if (j === query) continue;
            if (row[j] > bestWeight) {
              second = bestWeight;
              bestWeight = row[j];
              best = j;
            } else if (row[j] > second) {
              second = row[j];
            }
          }
          if (best < 0 || bestWeight < minimum) continue;
          if (bestWeight - second < margin) continue;

          rounds.push({
            sentence,
            layer,
            head,
            query,
            answer: best,
            weights: row,
            answerWeight: bestWeight,
            runnerUpWeight: second,
            sinkWeight: row[0],
          });
        }
      }
    }
  }

  return rounds;
}

/** Fisher–Yates. Called from events only — it draws random numbers. */
export function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/** Average share of every row that lands on the first token, across the set. */
export function sinkShare(data: AttentionData): number {
  let total = 0;
  let count = 0;
  for (const sentence of data.sentences) {
    const n = sentence.tokens.length;
    for (let layer = 0; layer < data.model.layers; layer++) {
      for (let head = 0; head < data.model.heads; head++) {
        const rows = matrixOf(sentence, layer, head);
        // Row 0 can only attend to itself, so it would flatter the figure.
        for (let i = 1; i < n; i++) {
          total += rows[i][0];
          count += 1;
        }
      }
    }
  }
  return count === 0 ? 0 : total / count;
}
