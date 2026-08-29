/**
 * Generates public/data/analogy.json
 *
 * The embeddings module asserts that you can do arithmetic with words and shows
 * the answer. This produces the geometry behind the answer, so the module can
 * draw it instead: the two differences, the parallelogram they close, and where
 * the nearest real word actually sits.
 *
 * Three things here are deliberately awkward and are kept rather than tidied
 * away, because they are the honest part:
 *
 * 1. The nearest word to `king - man + woman` is *king*. Every published
 *    demonstration of this trick silently excludes the three input words from
 *    the candidates. That convention comes from Mikolov's original evaluation
 *    and it is load-bearing, without it most analogies return one of their own
 *    inputs. So both answers are computed and both are written out.
 *
 * 2. The picture is two-dimensional and the vectors are not. The plane is
 *    spanned by the two difference vectors, so the parallelogram in the figure
 *    is exact by construction; the answer word is a *shadow* on that plane, and
 *    its distance off the plane is recorded so the module can say so.
 *
 * 3. Some analogies return a stereotype. That is a property of the text the
 *    vectors were counted from, it is measured rather than asserted, and it is
 *    cited (Bolukbasi et al. 2016).
 *
 * Run: node data/scripts/build-analogy.mjs
 */

import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GLOVE = resolve(ROOT, "data/raw/glove.6B.50d.txt");
const OUT = resolve(ROOT, "public/data/analogy.json");

/**
 * GloVe's file is ordered by corpus frequency, so taking the first N lines
 * takes the N commonest words. Past roughly this point the vocabulary is
 * dominated by typos, fragments and numerals, which make for noisy neighbours
 * without making the demonstration any more honest.
 */
const VOCAB = 50000;
const DIMS = 50;

/** a is to b as c is to (?), written here as b - a + c. */
const ANALOGIES = [
  {
    id: "royal",
    a: "man",
    b: "king",
    c: "woman",
    expect: "queen",
    teaches:
      "The canonical one. Whatever separates man from king turns out to be roughly the same displacement that separates woman from queen.",
  },
  {
    id: "capital",
    a: "france",
    b: "paris",
    c: "italy",
    expect: "rome",
    teaches:
      "Nobody stored a table of capitals. The relation is a direction in the space, and it is the same direction for both countries.",
  },
  {
    id: "tense",
    a: "walk",
    b: "walking",
    c: "swim",
    expect: "swimming",
    teaches:
      "Grammar is geometry too: the -ing displacement is its own direction, learnt from nothing but which words share company.",
  },
  {
    id: "comparative",
    a: "big",
    b: "bigger",
    c: "small",
    expect: "smaller",
    teaches:
      "The same trick on a different relation. One direction means more-of-this.",
  },
  {
    id: "occupation",
    a: "man",
    b: "doctor",
    c: "woman",
    expect: null,
    teaches:
      "Run the same arithmetic on an occupation and the geometry answers with a stereotype. Nothing is broken. This is what counting real text produces.",
  },
];

// ------------------------------------------------------------------ loading ---

const wanted = new Set();
for (const { a, b, c, expect } of ANALOGIES) {
  wanted.add(a);
  wanted.add(b);
  wanted.add(c);
  if (expect) wanted.add(expect);
}

const words = [];
const vectors = [];
const byWord = new Map();

const rl = createInterface({
  input: createReadStream(GLOVE, "utf8"),
  crlfDelay: Infinity,
});

let line = 0;
for await (const text of rl) {
  if (line >= VOCAB && wanted.size === 0) break;
  line += 1;
  const parts = text.split(" ");
  const word = parts[0];
  const inVocab = line <= VOCAB;
  if (!inVocab && !wanted.has(word)) continue;

  const v = new Float64Array(DIMS);
  for (let i = 0; i < DIMS; i++) v[i] = Number(parts[i + 1]);
  if (v.length !== DIMS || Number.isNaN(v[0])) {
    throw new Error(`bad vector for ${JSON.stringify(word)} on line ${line}`);
  }

  byWord.set(word, vectors.length);
  words.push(word);
  vectors.push(v);
  wanted.delete(word);
}
rl.close();

console.log(`loaded ${words.length.toLocaleString("en-US")} vectors`);

for (const { a, b, c, expect } of ANALOGIES) {
  for (const w of [a, b, c, expect]) {
    if (w && !byWord.has(w)) throw new Error(`missing vector for ${w}`);
  }
}

// -------------------------------------------------------------------- maths ---

const get = (w) => vectors[byWord.get(w)];
const dot = (x, y) => {
  let s = 0;
  for (let i = 0; i < DIMS; i++) s += x[i] * y[i];
  return s;
};
const norm = (x) => Math.sqrt(dot(x, x));
const cosine = (x, y) => dot(x, y) / (norm(x) * norm(y));
const sub = (x, y) => {
  const o = new Float64Array(DIMS);
  for (let i = 0; i < DIMS; i++) o[i] = x[i] - y[i];
  return o;
};
const add = (x, y) => {
  const o = new Float64Array(DIMS);
  for (let i = 0; i < DIMS; i++) o[i] = x[i] + y[i];
  return o;
};
const scale = (x, k) => {
  const o = new Float64Array(DIMS);
  for (let i = 0; i < DIMS; i++) o[i] = x[i] * k;
  return o;
};

/** Every word in the loaded vocabulary, ranked by cosine to a target vector. */
function nearest(target, { exclude = [], count = 8 } = {}) {
  const banned = new Set(exclude);
  const out = [];
  for (let i = 0; i < words.length; i++) {
    if (banned.has(words[i])) continue;
    out.push({ word: words[i], similarity: cosine(target, vectors[i]) });
  }
  out.sort((p, q) => q.similarity - p.similarity);
  return out.slice(0, count).map((r) => ({
    word: r.word,
    similarity: Number(r.similarity.toFixed(4)),
  }));
}

const results = ANALOGIES.map(({ id, a, b, c, expect, teaches }) => {
  const va = get(a);
  const vb = get(b);
  const vc = get(c);
  const target = add(sub(vb, va), vc);

  // The plane the figure is drawn on: spanned by the two differences, with the
  // first difference as its x-axis. a, b, c and the arithmetic result all lie
  // exactly in it; every other word is a projection.
  const d1 = sub(vb, va);
  const e1 = scale(d1, 1 / norm(d1));
  const u = sub(vc, va);
  const uPerp = sub(u, scale(e1, dot(u, e1)));
  const e2 = scale(uPerp, 1 / norm(uPerp));

  const project = (v) => {
    const rel = sub(v, va);
    const x = dot(rel, e1);
    const y = dot(rel, e2);
    // How much of the word is not in this plane at all.
    const flat = add(scale(e1, x), scale(e2, y));
    const off = norm(sub(rel, flat));
    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      offPlane: Number(off.toFixed(4)),
    };
  };

  const withoutInputs = nearest(target, { exclude: [a, b, c] });
  const withInputs = nearest(target);
  const answer = withoutInputs[0];

  // Everything the figure draws, projected onto the same plane.
  const plotted = [a, b, c, answer.word, ...(expect ? [expect] : [])];
  const points = [...new Set(plotted)].map((w) => ({
    word: w,
    ...project(get(w)),
  }));
  const resultPoint = project(target);

  const row = {
    id,
    a,
    b,
    c,
    expect,
    teaches,
    /** The answer by the usual convention: inputs excluded. */
    answer,
    /** What you get if you do not exclude them. This is the honest one. */
    unfiltered: withInputs[0],
    neighbours: withoutInputs,
    neighboursUnfiltered: withInputs,
    points,
    result: resultPoint,
    /** Cosine between the arithmetic result and the word we hoped for. */
    expectedSimilarity: expect
      ? Number(cosine(target, get(expect)).toFixed(4))
      : null,
    expectedRank: expect
      ? nearest(target, { exclude: [a, b, c], count: words.length }).findIndex(
          (n) => n.word === expect,
        ) + 1
      : null,
  };

  console.log(
    `  ${b} - ${a} + ${c} = ${row.answer.word} (${row.answer.similarity})` +
      `  |  without excluding inputs: ${row.unfiltered.word}` +
      (expect
        ? `  |  ${expect} ranks ${row.expectedRank} at ${row.expectedSimilarity}`
        : ""),
  );

  return row;
});

await mkdir(dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      generatedBy: "data/scripts/build-analogy.mjs",
      source: {
        name: "GloVe 6B, 50 dimensions",
        trainedOn: "Wikipedia 2014 + Gigaword 5, 6 billion tokens",
        url: "https://nlp.stanford.edu/projects/glove/",
        licence: "Public Domain Dedication and Licence v1.0",
      },
      dims: DIMS,
      vocabulary: words.length,
      note:
        "Full-precision GloVe vectors. Neighbours are ranked over the " +
        `${words.length} commonest words. Each analogy is drawn on the plane ` +
        "spanned by its own two difference vectors, so the parallelogram is " +
        "exact and every other word shown is a projection onto it.",
      analogies: results,
    },
    null,
    2,
  ) + "\n",
);

console.log(`\nwrote ${OUT}`);
