/**
 * Generates public/data/token-examples.json
 *
 * The lesson needs a handful of tokenizations rendered before the ~2MB merge
 * table finishes downloading, and it needs the multilingual cost comparison to
 * be a measurement rather than a claim. Both come from here.
 *
 * Nothing in the output is written by hand: the sentences below are the only
 * input, and every count and split is produced by the same `o200k_base`
 * encoding the browser loads.
 *
 * Run: node data/scripts/build-token-examples.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, encode } from "gpt-tokenizer/encoding/o200k_base";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "public/data/token-examples.json");

/**
 * One sentence, translated. Same meaning in every row, so the only thing that
 * varies is the script it is written in — which is what makes the token counts
 * comparable.
 */
const MULTILINGUAL = [
  { language: "English", text: "Artificial intelligence is changing how we work." },
  {
    language: "Spanish",
    text: "La inteligencia artificial está cambiando cómo trabajamos.",
  },
  {
    language: "Hindi",
    text: "आर्टिफिशियल इंटेलिजेंस हमारे काम करने के तरीके को बदल रहा है।",
  },
  {
    language: "Kannada",
    text: "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ನಾವು ಕೆಲಸ ಮಾಡುವ ರೀತಿಯನ್ನು ಬದಲಾಯಿಸುತ್ತಿದೆ.",
  },
  { language: "Japanese", text: "人工知能は私たちの働き方を変えています。" },
];

/** Short strings that each expose one surprising property of the tokenizer. */
const CURIOSITIES = [
  {
    id: "strawberry",
    text: "strawberry",
    note: "Split mid-word, so the model never sees the letters in a row.",
  },
  {
    id: "strawberry-spaced",
    text: " strawberry",
    note: "The same word with a leading space is a single token. Spaces belong to the token after them.",
  },
  {
    id: "number",
    text: "The year 2024 cost $1,299.99",
    note: "Long numbers get chopped into pieces, which is why arithmetic is hard.",
  },
  {
    id: "code",
    text: "const total = items.reduce((a, b) => a + b, 0);",
    note: "Code tokenizes densely — common syntax has its own tokens.",
  },
  {
    id: "emoji",
    text: "Ship it 🚀🚀🚀",
    note: "One emoji can cost several tokens.",
  },
  {
    id: "typo",
    text: "teh quick brwon fox",
    note: "Misspellings shatter into fragments the model has rarely seen together.",
  },
];

/** Prompts for the guessing game, kept short enough to estimate by eye. */
const GUESSABLE = [
  "Hello, world!",
  "The quick brown fox jumps over the lazy dog.",
  "antidisestablishmentarianism",
  "こんにちは世界",
  "AI won't replace you.",
  "2 + 2 = 4",
  "Supercalifragilisticexpialidocious",
  "Please summarise this email in three bullet points.",
];

/**
 * Words for the cutting game. Chosen so the round keeps teaching: some are a
 * single token however long they look, some shatter in places nobody would
 * guess. Only words that actually split are kept — a one-token word has no
 * boundary to aim at.
 */
const CHOP_CANDIDATES =
  `strawberry unbelievable tokenization pneumonia rhythm giraffe blockchain
   antidisestablishmentarianism kubernetes espresso bureaucracy onomatopoeia
   mississippi photosynthesis quesadilla wednesday entrepreneur hallucination
   asymptotic jalapeno bangalore embeddings juxtapose serendipity nightingale
   thunderstorm archipelago kaleidoscope questionnaire mischievous`
    .split(/\s+/)
    .filter(Boolean);

function tokenize(text) {
  return encode(text).map((id, index) => ({
    index,
    id,
    text: decode([id]),
  }));
}

function measure(text) {
  const tokens = tokenize(text);
  const chars = [...text].length;
  return {
    text,
    chars,
    tokenCount: tokens.length,
    charsPerToken: Number((chars / tokens.length).toFixed(2)),
    tokens,
  };
}

const output = {
  encoding: "o200k_base",
  generatedBy: "data/scripts/build-token-examples.mjs",
  multilingual: MULTILINGUAL.map((row) => ({
    language: row.language,
    ...measure(row.text),
  })),
  curiosities: CURIOSITIES.map((row) => ({
    id: row.id,
    note: row.note,
    ...measure(row.text),
  })),
  guessable: GUESSABLE.map((text) => {
    const m = measure(text);
    return { text, chars: m.chars, tokenCount: m.tokenCount, tokens: m.tokens };
  }),
  /**
   * Each word with the character offsets its tokens break at. The game aims at
   * these offsets, so a hit means the player cut exactly where the real
   * tokenizer does.
   */
  chop: CHOP_CANDIDATES.map((word) => {
    const tokens = tokenize(word);
    let at = 0;
    const cuts = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      at += [...tokens[i].text].length;
      cuts.push(at);
    }
    return { word, pieces: tokens.map((t) => t.text), cuts };
  }).filter((entry) => entry.cuts.length > 0),
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Wrote ${OUT}`);
console.log(
  output.multilingual
    .map((r) => `  ${r.language.padEnd(9)} ${r.chars} chars → ${r.tokenCount} tokens`)
    .join("\n"),
);
