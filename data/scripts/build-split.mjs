/**
 * Generates public/data/split.json
 *
 * The second machine learning module is about the split, and the fastest way to
 * teach it is to build a model that cheats. A lookup table of every training
 * message scores a perfect hundred per cent on the messages it was built from,
 * and on messages it has never seen it collapses to the score you would get by
 * calling everything ordinary. Both numbers are real, and the distance between
 * them is the whole idea.
 *
 * So five models are trained on the same 4,459 messages and scored twice: once
 * on the messages they were trained on, and once on the 1,115 they have never
 * seen. Nothing here is tuned. The point is the gap, and the gap is different
 * for each of them for reasons a beginner can name.
 *
 * The split is the same seed and the same 80/20 as build-spam-bench.mjs and
 * build-features.mjs, so every number across the site describes one experiment.
 *
 * Input: data/raw/SMSSpamCollection, SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-split.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/split.json");

// ------------------------------------------------------------------- corpus --

const text = await readFile(IN, "utf8");
const messages = text
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const tab = line.indexOf("\t");
    return { label: line.slice(0, tab), body: line.slice(tab + 1) };
  })
  .filter((m) => m.label === "ham" || m.label === "spam");

const labels = messages.map((m) => (m.label === "spam" ? 1 : 0));

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const order = messages.map((_, i) => i);
const rand = lcg(20260802);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}
const cut = Math.floor(order.length * 0.8);
const trainIdx = order.slice(0, cut);
const testIdx = order.slice(cut);

function tokenize(body) {
  return body.toLowerCase().match(/[a-z£$']+|\d+/g) ?? [];
}

// ------------------------------------------------------------------- models --

/**
 * The cheat. Remember every training message and its label; on anything else,
 * guess the commoner class. It is not a strawman: it is what a model does when
 * it has enough capacity to memorise its training set, which is the failure
 * this whole module exists to name.
 */
function memoriser() {
  const seen = new Map();
  for (const i of trainIdx) seen.set(messages[i].body, labels[i]);
  return {
    id: "memoriser",
    name: "The memoriser",
    how: "Keeps every training message and its answer. Anything it has not seen before, it calls ordinary.",
    why: "Nothing was learned about spam. The training score is a receipt for the filing, not a measure of skill.",
    predict: (body) => seen.get(body) ?? 0,
  };
}

/** Multinomial naive Bayes, the same one build-spam-bench.mjs trains. */
function naiveBayes(train) {
  const counts = [new Map(), new Map()];
  const totals = [0, 0];
  const docs = [0, 0];
  const vocab = new Set();

  for (const i of train) {
    const y = labels[i];
    docs[y]++;
    for (const w of tokenize(messages[i].body)) {
      counts[y].set(w, (counts[y].get(w) ?? 0) + 1);
      totals[y]++;
      vocab.add(w);
    }
  }
  const V = vocab.size;

  return (body) => {
    let best = 0;
    let bestScore = -Infinity;
    for (let y = 0; y < 2; y++) {
      let score = Math.log(docs[y] / train.length);
      for (const w of tokenize(body)) {
        if (!vocab.has(w)) continue;
        score += Math.log(((counts[y].get(w) ?? 0) + 1) / (totals[y] + V));
      }
      if (score > bestScore) {
        bestScore = score;
        best = y;
      }
    }
    return best;
  };
}

/**
 * Nearest neighbour by word overlap. The other honest way to memorise: it
 * keeps every training message and answers with whichever one it looks most
 * like. Perfect on its own training set for the same reason the lookup table
 * is, because every message's nearest neighbour is itself.
 */
function nearestNeighbour(train) {
  const bags = train.map((i) => ({
    label: labels[i],
    words: new Set(tokenize(messages[i].body)),
  }));

  return (body) => {
    const words = new Set(tokenize(body));
    let best = 0;
    let bestScore = -1;
    for (const bag of bags) {
      let shared = 0;
      for (const w of words) if (bag.words.has(w)) shared++;
      // Jaccard, so a long message does not win by sheer size.
      const union = words.size + bag.words.size - shared;
      const score = union === 0 ? 0 : shared / union;
      if (score > bestScore) {
        bestScore = score;
        best = bag.label;
      }
    }
    return best;
  };
}

const RULES = [
  /\bfree\b/i,
  /\b(win|won|winner|prize|award(ed)?|claim)\b/i,
  /\d{5,}/,
  /[£$]/,
  /\b(urgent|now|today|immediately|expires?|last chance)\b/i,
];

const MODELS = [
  memoriser(),
  {
    id: "nearest",
    name: "Whichever message it looks most like",
    how: "Keeps every training message and copies the answer of the one with the most words in common.",
    why: "The other way to memorise. Its own training messages match themselves perfectly, so the training score is a hundred per cent and says nothing.",
    predict: nearestNeighbour(trainIdx),
  },
  {
    id: "always-spam",
    name: "Flags everything",
    how: "Calls every single message spam.",
    why: "It catches all the spam, which sounds like success until you notice it catches everything else too. The same score on both halves, and useless on both.",
    predict: () => 1,
  },
  {
    id: "all-rules",
    name: "Five hand-written rules, any of them",
    how: "Flags a message if any of five reasonable rules fire.",
    why: "Written by a person, so there is nothing to memorise and the two scores sit on top of each other. Rules do not overfit. They just are not very good.",
    predict: (body) => (RULES.some((r) => r.test(body)) ? 1 : 0),
  },
  {
    id: "nb-200",
    name: "The same model, on two hundred examples",
    how: "The same naive Bayes, shown the first two hundred training messages.",
    why: "Four times the examples, and it has begun to travel. Nothing about the method changed.",
    predict: naiveBayes(trainIdx.slice(0, 200)),
  },
  {
    id: "nb-1000",
    name: "The same model, on a thousand examples",
    how: "The same naive Bayes, shown the first thousand training messages.",
    why: "Closing on the full model. The way to fix a model that has not learned enough is usually to show it more, not to make it cleverer.",
    predict: naiveBayes(trainIdx.slice(0, 1000)),
  },
  {
    id: "always-ham",
    name: "Calls everything ordinary",
    how: "Never flags anything, ever.",
    why: "Most messages are not spam, so doing nothing scores well on both halves. A high score is not evidence of anything on its own.",
    predict: () => 0,
  },
  {
    id: "one-rule",
    name: "One hand-written rule",
    how: "Flags anything containing a run of five or more digits.",
    why: "A person wrote it, so there was nothing to memorise. It scores about the same on both halves, which is what a rule that generalises looks like.",
    predict: (body) => (/\d{5,}/.test(body) ? 1 : 0),
  },
  {
    id: "learned",
    name: "Learned from the examples",
    how: "Multinomial naive Bayes over the words, trained on the training half only.",
    why: "It really did learn something transferable, and it still does a little better on the messages it studied. A small gap is normal and is not a scandal.",
    predict: naiveBayes(trainIdx),
  },
  {
    id: "tiny",
    name: "The same model, on fifty examples",
    how: "The same naive Bayes, but shown only the first fifty training messages.",
    why: "Too little to learn from, so it leans on whatever those fifty happened to contain. Small training sets produce confident models that do not travel.",
    predict: naiveBayes(trainIdx.slice(0, 50)),
  },
];

// ------------------------------------------------------------------ scoring --

function score(predict, idx) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const i of idx) {
    const p = predict(messages[i].body);
    if (p && labels[i]) tp++;
    else if (p && !labels[i]) fp++;
    else if (!p && labels[i]) fn++;
    else tn++;
  }
  return {
    caught: tp,
    falseAlarms: fp,
    missed: fn,
    correct: tp + tn,
    total: idx.length,
    accuracy: Number(((tp + tn) / idx.length).toFixed(4)),
  };
}

const spamAll = labels.reduce((a, b) => a + b, 0);

const out = {
  generatedBy: "data/scripts/build-split.mjs",
  source: {
    name: "SMS Spam Collection v.1",
    authors: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  corpus: {
    total: messages.length,
    spam: spamAll,
    trainSize: trainIdx.length,
    testSize: testIdx.length,
    split: "80/20, seeded, identical to spam-bench.json and features.json",
  },
  models: MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    how: model.how,
    why: model.why,
    train: score(model.predict, trainIdx),
    test: score(model.predict, testIdx),
  })),
};

for (const m of out.models) {
  m.gap = Number((m.train.accuracy - m.test.accuracy).toFixed(4));
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
for (const m of out.models) {
  console.log(
    `${(m.train.accuracy * 100).toFixed(1).padStart(5)}% train  ` +
      `${(m.test.accuracy * 100).toFixed(1).padStart(5)}% test  ` +
      `gap ${(m.gap * 100).toFixed(1).padStart(5)}  ${m.name}`,
  );
}
