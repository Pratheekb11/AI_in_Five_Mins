/**
 * Generates public/data/nextword.json
 *
 * Module 1 claims an LLM is a very good next-word guesser. The fastest way to
 * believe that is to play against a bad one.
 *
 * So this builds an actual next-word model — a bigram model, counted from a
 * real book — and exports rounds where the player guesses the next word and
 * then sees what the model guessed and how sure it was. It is the same idea as
 * a language model with essentially none of the machinery: no meaning, no
 * context beyond one word, just counts.
 *
 * That gap is the teaching. The model gets a surprising number right from
 * counting alone, and fails in exactly the way the module describes — fluent,
 * confident, and sometimes nonsense.
 *
 * Input: data/raw/alice.txt — Project Gutenberg ebook 11, public domain.
 *   mkdir -p data/raw
 *   curl -Lo data/raw/alice.txt https://www.gutenberg.org/files/11/11-0.txt
 *
 * Run: node data/scripts/build-nextword.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/alice.txt");
const OUT = resolve(ROOT, "public/data/nextword.json");

const ROUNDS = 24;

const raw = await readFile(IN, "utf8");
const start = raw.indexOf("*** START OF THE PROJECT GUTENBERG EBOOK");
const end = raw.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
const book = raw.slice(raw.indexOf("\n", start) + 1, end === -1 ? undefined : end);

const words = book
  .replace(/[“”"’]/g, (m) => (m === "’" ? "'" : ""))
  .replace(/\s+/g, " ")
  .toLowerCase()
  .match(/[a-z']+/g);

console.log(`${words.length} words`);

// --------------------------------------------------------------- the model --

/** word -> (next word -> how often it followed) */
const counts = new Map();
const unigram = new Map();

for (let i = 0; i < words.length - 1; i++) {
  const a = words[i];
  const b = words[i + 1];
  unigram.set(a, (unigram.get(a) ?? 0) + 1);
  if (!counts.has(a)) counts.set(a, new Map());
  const row = counts.get(a);
  row.set(b, (row.get(b) ?? 0) + 1);
}

/** The model's ranked guesses after `word`, with real probabilities. */
function predict(word, top = 4) {
  const row = counts.get(word);
  if (!row) return [];
  const total = [...row.values()].reduce((s, n) => s + n, 0);
  return [...row.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([next, n]) => ({
      word: next,
      probability: Number((n / total).toFixed(4)),
    }));
}

/** Fixed seed so the same rounds come out every run. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rand = lcg(20260802);

// Common words make dull distractors; these are the ones worth choosing between.
const contentWords = [...unigram.entries()]
  .filter(([w, n]) => n >= 6 && w.length >= 4)
  .map(([w]) => w);

// --------------------------------------------------------------- the rounds --

const rounds = [];
const usedPrefix = new Set();

for (let attempt = 0; attempt < 60000 && rounds.length < ROUNDS; attempt++) {
  const i = 4 + Math.floor(rand() * (words.length - 8));
  const cue = words[i];
  const truth = words[i + 1];

  if (usedPrefix.has(cue)) continue;
  if (cue.length < 3 || truth.length < 3) continue;

  const guesses = predict(cue, 4);
  if (guesses.length < 2) continue;

  // Keep rounds where the model has a real opinion — otherwise there is
  // nothing to be right or wrong about.
  const top = guesses[0];
  if (top.probability < 0.12) continue;

  // Four options: the word that really came next, plus three real words from
  // the same book. Never an invented word.
  const options = new Set([truth]);
  while (options.size < 4) {
    const candidate = contentWords[Math.floor(rand() * contentWords.length)];
    if (candidate !== truth) options.add(candidate);
  }

  usedPrefix.add(cue);
  rounds.push({
    /** The few words before, so the player has something to read. */
    lead: words.slice(Math.max(0, i - 6), i).join(" "),
    cue,
    truth,
    options: [...options].sort(() => rand() - 0.5),
    modelGuess: top.word,
    modelConfidence: top.probability,
    modelTop: guesses,
  });
}

const output = {
  generatedBy: "data/scripts/build-nextword.mjs",
  source: {
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    via: "Project Gutenberg ebook 11",
    licence: "Public domain",
  },
  model: {
    kind: "Bigram: counts of which word followed which, nothing else",
    vocabulary: unigram.size,
    trainedOnWords: words.length,
  },
  rounds,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(output, null, 1)}\n`, "utf8");

const modelRight = rounds.filter((r) => r.modelGuess === r.truth).length;
console.log(`Wrote ${OUT}`);
console.log(`${rounds.length} rounds · vocabulary ${unigram.size}`);
console.log(
  `the bigram model gets ${modelRight}/${rounds.length} of these right`,
);
