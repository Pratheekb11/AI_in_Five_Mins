"use client";

/**
 * The measured next-token distributions.
 *
 * Every probability in `logits.json` is DistilGPT-2's own output for the prompt
 * beside it. This file loads them and reshapes them for the temperature dial —
 * it never invents a candidate and never smooths a distribution.
 */

export type Candidate = {
  id: number;
  text: string;
  logit: number;
  probability: number;
};

export type LogitPrompt = {
  id: string;
  text: string;
  why: string;
  tokens: { id: number; text: string }[];
  candidates: Candidate[];
  byTemperature: Record<string, number[]>;
  topProbability: number;
  entropyBits: number;
  vocabSize: number;
};

export type LogitData = {
  model: {
    id: string;
    name: string;
    url: string;
    licence: string;
    note: string;
  };
  topK: number;
  temperatures: number[];
  prompts: LogitPrompt[];
};

let dataPromise: Promise<LogitData> | null = null;

export function loadLogits(): Promise<LogitData> {
  if (!dataPromise) {
    dataPromise = fetch("/data/logits.json").then((r) => {
      if (!r.ok) throw new Error(`logits: ${r.status}`);
      return r.json() as Promise<LogitData>;
    });
  }
  return dataPromise;
}

/**
 * The candidates re-weighted at a temperature, from the recorded logits.
 *
 * These are renormalised over the kept candidates rather than the whole
 * 50,257-token vocabulary, which is stated on the page. At temperature 1 the
 * shape is the model's; the dial only ever stretches or flattens it.
 */
export function atTemperature(
  prompt: LogitPrompt,
  temperature: number,
): number[] {
  const t = Math.max(0.05, temperature);
  const scaled = prompt.candidates.map((c) => c.logit / t);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}
