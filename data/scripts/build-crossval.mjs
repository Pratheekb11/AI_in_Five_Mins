/**
 * Generates public/data/crossval.json
 *
 * The fifth machine learning module is about how much to trust a single number.
 * One 80/20 split gives you one accuracy, and it is quietly a sample of size
 * one: run the same experiment with a different slice held out and the number
 * moves. Sometimes it moves far enough to change which of two models you would
 * ship.
 *
 * So every model here is run through ten-fold cross-validation on the whole
 * corpus: the messages are cut into ten blocks, and each block takes a turn
 * being the held-out one while the other nine train. That gives ten accuracies
 * per model instead of one, and the spread of those ten is the thing the page
 * is really about.
 *
 * The game then hands the player a single fold, which is exactly the evidence a
 * report usually gives them, and asks which model is better. On some pairs the
 * fold points the wrong way. Those pairs are found by measurement here, not
 * chosen, and the file records which ones they are.
 *
 * Input: data/raw/SMSSpamCollection — SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-crossval.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/crossval.json");

const FOLDS = 10;

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

function shuffled(seed) {
  const order = messages.map((_, i) => i);
  const rand = lcg(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** The same seeded shuffle the rest of the site uses, cut into ten blocks. */
const order = shuffled(20260802);
const blocks = Array.from({ length: FOLDS }, (_, k) =>
  order.filter((_, i) => i % FOLDS === k),
);

function tokenize(body) {
  return body.toLowerCase().match(/[a-z£$']+|\d+/g) ?? [];
}

// ------------------------------------------------------------------- models --

function naiveBayes(train, limit = Infinity) {
  const used = train.slice(0, Math.min(train.length, limit));
  const counts = [new Map(), new Map()];
  const totals = [0, 0];
  const docs = [0, 0];
  const vocab = new Set();

  for (const i of used) {
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
      let score = Math.log((docs[y] || 1) / used.length);
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

const RULES = [
  /\bfree\b/i,
  /\b(win|won|winner|prize|award(ed)?|claim)\b/i,
  /\d{5,}/,
  /[£$]/,
  /\b(urgent|now|today|immediately|expires?|last chance)\b/i,
];

const MODELS = [
  {
    id: "learned",
    name: "Learned from all the examples",
    how: "Naive Bayes over the words, trained on the nine blocks it is given.",
    build: (train) => naiveBayes(train),
  },
  {
    id: "nb-300",
    name: "The same model, on three hundred examples",
    how: "Naive Bayes, but shown only the first three hundred of its nine blocks.",
    build: (train) => naiveBayes(train, 300),
  },
  {
    id: "nb-80",
    name: "The same model, on eighty examples",
    how: "Naive Bayes, shown eighty messages and no more.",
    build: (train) => naiveBayes(train, 80),
  },
  {
    id: "nb-500",
    name: "The same model, on five hundred examples",
    how: "Naive Bayes, shown five hundred messages.",
    build: (train) => naiveBayes(train, 500),
  },
  {
    id: "two-rules",
    name: "Two hand-written rules",
    how: "Flags anything with five or more digits in a row, or a currency symbol.",
    build: () => (body) =>
      /\d{5,}/.test(body) || /[£$]/.test(body) ? 1 : 0,
  },
  {
    id: "one-rule",
    name: "One hand-written rule",
    how: "Flags anything with a run of five or more digits.",
    build: () => (body) => (/\d{5,}/.test(body) ? 1 : 0),
  },
  {
    id: "all-rules",
    name: "Five hand-written rules",
    how: "Flags a message if any of five reasonable rules fire.",
    build: () => (body) => (RULES.some((r) => r.test(body)) ? 1 : 0),
  },
];

function accuracy(predict, idx) {
  let right = 0;
  for (const i of idx) {
    if (predict(messages[i].body) === labels[i]) right++;
  }
  return right / idx.length;
}

// ------------------------------------------------------------ the ten folds --

const results = MODELS.map((model) => {
  const folds = blocks.map((held, k) => {
    const train = blocks.filter((_, j) => j !== k).flat();
    const predict = model.build(train);
    return {
      fold: k + 1,
      trainSize: train.length,
      testSize: held.length,
      accuracy: Number(accuracy(predict, held).toFixed(4)),
    };
  });

  const values = folds.map((f) => f.accuracy);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);

  return {
    id: model.id,
    name: model.name,
    how: model.how,
    folds,
    mean: Number(mean.toFixed(4)),
    sd: Number(Math.sqrt(variance).toFixed(4)),
    worstFold: Number(Math.min(...values).toFixed(4)),
    bestFold: Number(Math.max(...values).toFixed(4)),
  };
});

/**
 * Pairs where a single fold disagrees with the ten of them together.
 *
 * These are the rounds worth playing, and they are found rather than written:
 * the script checks every pair on every fold and records the ones where the
 * fold's verdict is the opposite of the average's.
 */
const pairs = [];
for (let a = 0; a < results.length; a++) {
  for (let b = a + 1; b < results.length; b++) {
    const left = results[a];
    const right = results[b];
    const truth = left.mean >= right.mean ? left.id : right.id;

    const misleading = left.folds
      .map((fold, k) => ({
        fold: fold.fold,
        left: fold.accuracy,
        right: right.folds[k].accuracy,
      }))
      .filter((f) => (f.left >= f.right ? left.id : right.id) !== truth);

    pairs.push({
      id: `${left.id}-vs-${right.id}`,
      left: left.id,
      right: right.id,
      truth,
      gap: Number(Math.abs(left.mean - right.mean).toFixed(4)),
      misleadingFolds: misleading.map((f) => f.fold),
      folds: left.folds.map((fold, k) => ({
        fold: fold.fold,
        left: fold.accuracy,
        right: right.folds[k].accuracy,
      })),
    });
  }
}

const spamAll = labels.reduce((a, b) => a + b, 0);

const out = {
  generatedBy: "data/scripts/build-crossval.mjs",
  source: {
    name: "SMS Spam Collection v.1",
    authors: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  corpus: {
    total: messages.length,
    spam: spamAll,
    folds: FOLDS,
    blockSize: blocks[0].length,
    note: "The corpus is shuffled once at the same seed the rest of the site uses, then dealt into ten blocks. Every model sees exactly the same blocks.",
  },
  models: results,
  pairs,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
for (const r of results) {
  console.log(
    `${(r.mean * 100).toFixed(2)}% ± ${(r.sd * 100).toFixed(2)}  ` +
      `(worst fold ${(r.worstFold * 100).toFixed(1)}, best ${(r.bestFold * 100).toFixed(1)})  ${r.name}`,
  );
}
console.log("");
for (const p of pairs) {
  console.log(
    `${p.id}: gap ${(p.gap * 100).toFixed(2)} points, ` +
      `${p.misleadingFolds.length} of ${FOLDS} folds point the wrong way` +
      (p.misleadingFolds.length ? ` (${p.misleadingFolds.join(", ")})` : ""),
  );
}
