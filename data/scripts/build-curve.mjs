/**
 * Generates public/data/curve.json
 *
 * The last machine learning module asks the question every team argues about:
 * more data, or a better model? It is usually settled by taste, and it does not
 * have to be, because the experiment is cheap.
 *
 * Five models are trained at eight different training set sizes, from twenty
 * messages to the full 4,459, and every one is scored on the same held-out
 * messages. That gives a learning curve per model, and the curves cross. Which
 * side of the crossing you are on is the entire answer, and it depends on how
 * much data you already have rather than on anybody's opinion about
 * algorithms.
 *
 * Every point is an average over five different random draws of the training
 * subset, because at twenty examples a single draw is mostly luck and the
 * chapter would be teaching noise.
 *
 * Input: data/raw/SMSSpamCollection — SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-curve.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/curve.json");

const SIZES = [20, 50, 100, 250, 500, 1000, 2000, 4459];
/** Draws per size, averaged, so a small sample is not a lottery result. */
const REPEATS = 5;

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
const shuffle = lcg(20260802);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(shuffle() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}
const cut = Math.floor(order.length * 0.8);
const trainIdx = order.slice(0, cut);
const testIdx = order.slice(cut);

function tokenize(body) {
  return body.toLowerCase().match(/[a-z£$']+|\d+/g) ?? [];
}

const FEATURES = [
  (t) => /\d{5,}/.test(t),
  (t) => /\bfree\b/i.test(t),
  (t) => /[£$]|\b\d+\s?(p|gbp|pounds?)\b/i.test(t),
  (t) => /\b(win|won|winner|prize|award(ed)?|claim)\b/i.test(t),
  (t) => t.length > 120,
  (t) => (t.match(/\b[A-Z]{3,}\b/g) ?? []).length >= 2,
  (t) => /\b(urgent|now|today|immediately|expires?|last chance)\b/i.test(t),
  (t) => /\b(www\.|https?:\/\/|\.com\b|\.co\.uk\b)/i.test(t),
  (t) => t.includes("?"),
  (t) => /[:;]-?[)(dpDP]|\bx+\b/i.test(t),
  (t) => /\b(txt|text|call|reply|sms)\b[^.]{0,24}?\d{4,}/i.test(t),
  (t) => /\b(i|me|my|i'm|im)\b/i.test(t),
];

const answers = messages.map((m) => FEATURES.map((f) => (f(m.body) ? 1 : 0)));

// ------------------------------------------------------------------- models --

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
  const V = vocab.size || 1;

  return (body) => {
    let best = 0;
    let bestScore = -Infinity;
    for (let y = 0; y < 2; y++) {
      let score = Math.log((docs[y] + 1) / (train.length + 2));
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

function entropy(spam, total) {
  if (total === 0) return 0;
  const p = spam / total;
  if (p === 0 || p === 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

function growTree(idx, depth, maxDepth) {
  let spam = 0;
  for (const i of idx) spam += labels[i];
  const node = { says: spam * 2 >= idx.length ? 1 : 0 };
  if (depth >= maxDepth || spam === 0 || spam === idx.length || idx.length < 8) {
    return node;
  }

  const before = entropy(spam, idx.length);
  let best = null;
  for (let f = 0; f < FEATURES.length; f++) {
    let yes = 0;
    let yesSpam = 0;
    for (const i of idx) {
      if (answers[i][f]) {
        yes++;
        yesSpam += labels[i];
      }
    }
    const no = idx.length - yes;
    if (yes < 4 || no < 4) continue;
    const after =
      (yes / idx.length) * entropy(yesSpam, yes) +
      (no / idx.length) * entropy(spam - yesSpam, no);
    if (!best || before - after > best.gain) best = { f, gain: before - after };
  }
  if (!best || best.gain <= 0) return node;

  return {
    ...node,
    f: best.f,
    yes: growTree(idx.filter((i) => answers[i][best.f]), depth + 1, maxDepth),
    no: growTree(idx.filter((i) => !answers[i][best.f]), depth + 1, maxDepth),
  };
}

function treePredict(node, i) {
  if (node.f === undefined) return node.says;
  return treePredict(answers[i][node.f] ? node.yes : node.no, i);
}

const MODELS = [
  {
    id: "one-rule",
    name: "One hand-written rule",
    how: "Flags anything with five or more digits in a row. It ignores the training data entirely.",
    build: () => (i) => (answers[i][0] ? 1 : 0),
  },
  {
    id: "tree",
    name: "A small decision tree",
    how: "Four questions deep, grown on whatever it is given, from the same twelve features.",
    build: (train) => {
      const tree = growTree(train, 0, 4);
      return (i) => treePredict(tree, i);
    },
  },
  {
    id: "twelve-features",
    name: "All twelve features, learned",
    how: "Naive Bayes over the twelve yes-or-no features rather than over the words.",
    build: (train) => {
      const counts = [new Array(FEATURES.length).fill(1), new Array(FEATURES.length).fill(1)];
      const docs = [1, 1];
      for (const i of train) {
        const y = labels[i];
        docs[y]++;
        for (let f = 0; f < FEATURES.length; f++) counts[y][f] += answers[i][f];
      }
      return (i) => {
        let best = 0;
        let bestScore = -Infinity;
        for (let y = 0; y < 2; y++) {
          let score = Math.log(docs[y] / (docs[0] + docs[1]));
          for (let f = 0; f < FEATURES.length; f++) {
            const p = counts[y][f] / (docs[y] + 2);
            score += Math.log(answers[i][f] ? p : 1 - p);
          }
          if (score > bestScore) {
            bestScore = score;
            best = y;
          }
        }
        return best;
      };
    },
  },
  {
    id: "words",
    name: "Every word, learned",
    how: "Naive Bayes over the whole vocabulary. The most capacity here, and the most to learn from.",
    build: (train) => {
      const predict = naiveBayes(train);
      return (i) => predict(messages[i].body);
    },
  },
];

// ------------------------------------------------------------------- curves --

function accuracy(predict) {
  let right = 0;
  for (const i of testIdx) if (predict(i) === labels[i]) right++;
  return right / testIdx.length;
}

const curves = MODELS.map((model) => {
  const points = SIZES.map((size) => {
    const runs = [];
    for (let r = 0; r < REPEATS; r++) {
      const rand = lcg(1000 + size * 31 + r);
      const pool = [...trainIdx];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      runs.push(accuracy(model.build(pool.slice(0, size))));
      if (size >= trainIdx.length) break; // the full set has only one draw
    }
    const mean = runs.reduce((a, b) => a + b, 0) / runs.length;
    return {
      size,
      accuracy: Number(mean.toFixed(4)),
      spread: Number(
        (Math.max(...runs) - Math.min(...runs)).toFixed(4),
      ),
      draws: runs.length,
    };
  });

  return {
    id: model.id,
    name: model.name,
    how: model.how,
    points,
    atSmallest: points[0].accuracy,
    atLargest: points[points.length - 1].accuracy,
  };
});

/**
 * The question the game asks, at four points along the curve: you have this
 * much data and this model. Which buys more, ten times the data or the best
 * other model on the same data?
 *
 * Both answers are measured. Nothing here is an opinion about algorithms.
 */
const ROUND_SIZES = [20, 100, 500, 2000];
const rounds = ROUND_SIZES.map((size) => {
  const at = (id, s) =>
    curves.find((c) => c.id === id).points.find((p) => p.size === s);

  const start = "tree";
  /**
   * As much more data as the corpus can actually offer.
   *
   * Ten times is the intended offer and there is no 20,000 messages to give,
   * so the largest round gets everything there is instead, and the file records
   * how many times more that really is. Printing "ten times the data" over a
   * 2.2x increase would be the one kind of mistake this site cannot make.
   */
  const bigger = SIZES.find((s) => s >= size * 10) ?? SIZES[SIZES.length - 1];
  const moreData = at(start, bigger);

  const better = curves
    .filter((c) => c.id !== start)
    .map((c) => ({ id: c.id, name: c.name, point: at(c.id, size) }))
    .reduce((a, b) => (b.point.accuracy > a.point.accuracy ? b : a));

  return {
    id: `n${size}`,
    size,
    startModel: start,
    startAccuracy: at(start, size).accuracy,
    moreData: {
      size: bigger,
      times: Number((bigger / size).toFixed(1)),
      accuracy: moreData.accuracy,
      gain: Number((moreData.accuracy - at(start, size).accuracy).toFixed(4)),
    },
    betterModel: {
      id: better.id,
      name: better.name,
      accuracy: better.point.accuracy,
      gain: Number((better.point.accuracy - at(start, size).accuracy).toFixed(4)),
    },
  };
});

const out = {
  generatedBy: "data/scripts/build-curve.mjs",
  source: {
    name: "SMS Spam Collection v.1",
    authors: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  corpus: {
    total: messages.length,
    trainSize: trainIdx.length,
    testSize: testIdx.length,
  },
  note: `Every point is the average of ${REPEATS} different random draws of that many training messages, all scored on the same ${testIdx.length} held-out messages.`,
  sizes: SIZES,
  repeats: REPEATS,
  curves,
  rounds,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
const header = SIZES.map((s) => String(s).padStart(7)).join("");
console.log(`${" ".repeat(26)}${header}`);
for (const curve of curves) {
  console.log(
    curve.name.padEnd(26) +
      curve.points
        .map((p) => `${(p.accuracy * 100).toFixed(1)}%`.padStart(7))
        .join(""),
  );
}
console.log("");
for (const round of rounds) {
  console.log(
    `at ${String(round.size).padStart(4)} examples: ten times the data ` +
      `${(round.moreData.gain * 100).toFixed(2)} points, ` +
      `best other model ${(round.betterModel.gain * 100).toFixed(2)} points (${round.betterModel.id})`,
  );
}
