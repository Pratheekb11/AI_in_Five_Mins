/**
 * Generates public/data/embeddings.json
 *
 * Lesson 4 lets the learner search for a word's nearest neighbours and do
 * arithmetic on meaning. Both run in the browser against real GloVe vectors, so
 * the answers are found rather than scripted — including the ones that are
 * wrong or uncomfortable.
 *
 * Input: data/raw/glove.6B.50d.txt — not committed (171MB). Fetch it first:
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://nlp.stanford.edu/data/glove.6B.zip
 *   unzip glove.6B.zip glove.6B.50d.txt && rm glove.6B.zip
 *
 * Run: node data/scripts/build-embeddings.mjs
 */

import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/glove.6B.50d.txt");
const OUT = resolve(ROOT, "public/data/embeddings.json");

const DIMS = 50;
const FILL_TARGET = 1500;
/** GloVe 50d values sit within roughly ±3.5; this covers that in an int8. */
const SCALE = 0.03;

/**
 * Words grouped by what they are, so the map has clusters a learner can
 * recognise and check. The grouping is only used for colour and for the
 * "does this look right?" test — every neighbour and every analogy is computed
 * from the vectors, never from these lists.
 */
const GROUPS = {
  animals: "cat dog horse cow sheep pig chicken duck lion tiger bear wolf fox rabbit mouse elephant monkey snake frog fish shark whale dolphin eagle owl bird bee ant spider deer goat camel donkey",
  food: "bread rice pasta pizza cheese butter milk egg apple banana orange mango grape lemon potato tomato onion garlic pepper salt sugar coffee tea wine beer soup salad cake chocolate honey",
  countries: "france germany italy spain portugal england scotland ireland japan china india brazil canada mexico russia egypt kenya nigeria australia norway sweden poland turkey greece thailand vietnam korea",
  cities: "paris london rome madrid berlin moscow tokyo beijing delhi mumbai bangalore sydney toronto chicago boston cairo nairobi istanbul athens lisbon vienna dublin",
  jobs: "doctor nurse teacher lawyer engineer farmer soldier police driver chef waiter artist writer singer dancer scientist banker plumber carpenter architect journalist pilot",
  emotions: "happy sad angry afraid calm excited nervous proud ashamed lonely joyful miserable anxious relaxed furious delighted worried content bitter grateful",
  colours: "red blue green yellow orange purple pink brown black white grey silver gold violet crimson scarlet turquoise",
  body: "head hand foot arm leg eye ear nose mouth finger knee shoulder heart brain skin hair tooth back neck",
  transport: "car bus train plane bicycle motorcycle boat ship truck taxi helicopter subway tram ferry",
  sports: "football cricket tennis golf swimming running cycling boxing rugby hockey basketball baseball chess wrestling",
  weather: "rain snow sun wind storm cloud fog thunder lightning hail frost drought flood breeze",
  family: "mother father sister brother son daughter aunt uncle cousin grandmother grandfather wife husband child baby parent",
  music: "guitar piano violin drum flute trumpet cello song music melody rhythm concert orchestra band album",
  time: "monday tuesday wednesday thursday friday saturday sunday january february march april june july august september october november december morning evening night today tomorrow yesterday week month year century",
  royalty: "king queen prince princess emperor empress duke duchess lord lady knight throne crown palace castle kingdom",
  tech: "computer internet software phone screen keyboard robot machine data network server code program digital",
};

/** Words the lesson's own examples depend on. Always included. */
const REQUIRED =
  "man woman boy girl he she his her uncle aunt nephew niece actor actress waiter waitress big bigger biggest small smaller walk walked walking swim swam swimming go went run ran hot cold good bad".split(
    " ",
  );

const groupOf = new Map();
for (const [group, words] of Object.entries(GROUPS)) {
  for (const w of words.split(" ")) groupOf.set(w, group);
}

const wanted = new Set([...groupOf.keys(), ...REQUIRED]);

// ------------------------------------------------------------------- read ---

/** Rank in the file is frequency rank — GloVe ships most-common first. */
const vectors = new Map();
const fill = [];
let rank = 0;

const rl = createInterface({
  input: createReadStream(IN),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  const sp = line.indexOf(" ");
  const word = line.slice(0, sp);
  rank++;

  const isWanted = wanted.has(word);

  // Fill vocabulary: ordinary lowercase words in the common band. Skipping the
  // first 150 drops "the", "of", "and" and friends, whose vectors encode
  // grammar rather than meaning and would sit in a meaningless clump.
  const isFill =
    !isWanted &&
    fill.length < FILL_TARGET &&
    rank > 150 &&
    rank < 12000 &&
    /^[a-z]{3,12}$/.test(word);

  if (!isWanted && !isFill) continue;

  const vec = new Float32Array(DIMS);
  const parts = line.slice(sp + 1).split(" ");
  for (let i = 0; i < DIMS; i++) vec[i] = Number(parts[i]);

  vectors.set(word, vec);
  if (isFill) fill.push(word);
}

const missing = [...wanted].filter((w) => !vectors.has(w));
if (missing.length) console.warn(`not in vocabulary: ${missing.join(", ")}`);

const words = [...vectors.keys()];
console.log(`${words.length} words (${fill.length} fill)`);

// -------------------------------------------------------------------- PCA ---

const mean = new Float64Array(DIMS);
for (const v of vectors.values()) for (let i = 0; i < DIMS; i++) mean[i] += v[i];
for (let i = 0; i < DIMS; i++) mean[i] /= words.length;

const centred = words.map((w) => {
  const v = vectors.get(w);
  const out = new Float64Array(DIMS);
  for (let i = 0; i < DIMS; i++) out[i] = v[i] - mean[i];
  return out;
});

/** Top eigenvector of the covariance, by power iteration. */
function principalAxis(rows, previous) {
  let v = new Float64Array(DIMS).fill(1 / Math.sqrt(DIMS));

  for (let iter = 0; iter < 200; iter++) {
    const next = new Float64Array(DIMS);
    for (const row of rows) {
      let d = 0;
      for (let i = 0; i < DIMS; i++) d += row[i] * v[i];
      for (let i = 0; i < DIMS; i++) next[i] += d * row[i];
    }
    // Remove any component along axes already found, so this one is orthogonal.
    for (const prev of previous) {
      let d = 0;
      for (let i = 0; i < DIMS; i++) d += next[i] * prev[i];
      for (let i = 0; i < DIMS; i++) next[i] -= d * prev[i];
    }
    let n = 0;
    for (let i = 0; i < DIMS; i++) n += next[i] * next[i];
    n = Math.sqrt(n);
    if (n === 0) break;
    for (let i = 0; i < DIMS; i++) next[i] /= n;
    v = next;
  }
  return v;
}

const axis1 = principalAxis(centred, []);
const axis2 = principalAxis(centred, [axis1]);

const coords = centred.map((row) => {
  let x = 0;
  let y = 0;
  for (let i = 0; i < DIMS; i++) {
    x += row[i] * axis1[i];
    y += row[i] * axis2[i];
  }
  return [x, y];
});

const xs = coords.map((c) => c[0]);
const ys = coords.map((c) => c[1]);
const range = (a) => [Math.min(...a), Math.max(...a)];
const [x0, x1] = range(xs);
const [y0, y1] = range(ys);

/** Normalised to 0–1 so the component does not have to know about the data. */
const points = coords.map(([x, y]) => [
  Number(((x - x0) / (x1 - x0)).toFixed(4)),
  Number(((y - y0) / (y1 - y0)).toFixed(4)),
]);

// -------------------------------------------------------------- quantise ---

/**
 * The full vectors ship too, because nearest neighbours and analogies have to
 * be computed in all 50 dimensions to be true — the 2D map is a shadow, and the
 * lesson says so. int8 keeps that payload near 110KB instead of 700KB; the
 * error it introduces is far below anything a ranking would notice.
 */
const packed = new Int8Array(words.length * DIMS);
for (let w = 0; w < words.length; w++) {
  const v = vectors.get(words[w]);
  for (let i = 0; i < DIMS; i++) {
    packed[w * DIMS + i] = Math.max(
      -128,
      Math.min(127, Math.round(v[i] / SCALE)),
    );
  }
}

const output = {
  generatedBy: "data/scripts/build-embeddings.mjs",
  source: {
    name: "GloVe 6B, 50 dimensions",
    trainedOn: "Wikipedia 2014 + Gigaword 5, 6 billion tokens",
    url: "https://nlp.stanford.edu/projects/glove/",
    licence: "Public Domain Dedication and Licence v1.0",
  },
  dims: DIMS,
  scale: SCALE,
  words,
  groups: words.map((w) => groupOf.get(w) ?? null),
  points,
  vectors: Buffer.from(packed.buffer).toString("base64"),
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Wrote ${OUT}`);
