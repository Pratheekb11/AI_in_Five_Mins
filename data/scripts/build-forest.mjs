/**
 * Generates public/data/forest.json
 *
 * The eighth machine learning module is about why a crowd of poor models beats
 * a good one, and about the condition that makes it work. Four forests are
 * grown here, all on the same corpus and the same split, differing only in how
 * much the trees inside them disagree with each other.
 *
 * That is the variable that matters, and it is the one everybody skips. A
 * hundred identical trees are worth exactly one tree. A hundred trees grown on
 * different samples with different questions available to them are worth far
 * more than any of them, and the gap between those two facts is the whole idea
 * of an ensemble.
 *
 * So one of the four forests is deliberately built without any randomness, and
 * it is the one that gains nothing. It is not a strawman. It is the control.
 *
 * Input: data/raw/SMSSpamCollection, SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-forest.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/forest.json");

const TREES = 60;
const MIN_LEAF = 5;

/** The same twelve questions as features.json and tree.json. */
const FEATURES = [
  { id: "shortcode", label: "Has a five digit number in it", test: (t) => /\d{5,}/.test(t) },
  { id: "free", label: "Uses the word free", test: (t) => /\bfree\b/i.test(t) },
  { id: "money", label: "Mentions money", test: (t) => /[£$]|\b\d+\s?(p|gbp|pounds?)\b/i.test(t) },
  { id: "prize", label: "Mentions winning something", test: (t) => /\b(win|won|winner|prize|award(ed)?|claim)\b/i.test(t) },
  { id: "long", label: "Longer than 120 characters", test: (t) => t.length > 120 },
  { id: "shouting", label: "Two or more shouted words", test: (t) => (t.match(/\b[A-Z]{3,}\b/g) ?? []).length >= 2 },
  { id: "urgent", label: "Sounds urgent", test: (t) => /\b(urgent|now|today|immediately|expires?|last chance)\b/i.test(t) },
  { id: "url", label: "Contains a web address", test: (t) => /\b(www\.|https?:\/\/|\.com\b|\.co\.uk\b)/i.test(t) },
  { id: "question", label: "Asks a question", test: (t) => t.includes("?") },
  { id: "smiley", label: "Has a smiley in it", test: (t) => /[:;]-?[)(dpDP]|\bx+\b/i.test(t) },
  { id: "reply", label: "Tells you to reply or call", test: (t) => /\b(txt|text|call|reply|sms)\b[^.]{0,24}?\d{4,}/i.test(t) },
  { id: "i", label: "Says I or me", test: (t) => /\b(i|me|my|i'm|im)\b/i.test(t) },
];

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
const answers = messages.map((m) => FEATURES.map((f) => (f.test(m.body) ? 1 : 0)));

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

// ------------------------------------------------------------------ growing --

function entropy(spam, total) {
  if (total === 0) return 0;
  const p = spam / total;
  if (p === 0 || p === 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

/**
 * One tree.
 *
 * `available` is the list of feature indices this split may consider. Passing a
 * random subset of them at every node is what makes two trees on the same data
 * disagree, and disagreement is the ingredient the whole module is about.
 */
function grow(idx, depth, maxDepth, tryFeatures, rand) {
  let spam = 0;
  for (const i of idx) spam += labels[i];
  const node = { says: spam * 2 >= idx.length ? 1 : 0 };

  if (depth >= maxDepth || spam === 0 || spam === idx.length || idx.length < MIN_LEAF * 2) {
    return node;
  }

  const pool = FEATURES.map((_, f) => f);
  if (tryFeatures < pool.length) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  const available = pool.slice(0, tryFeatures);

  const before = entropy(spam, idx.length);
  let best = null;

  for (const f of available) {
    let yes = 0;
    let yesSpam = 0;
    for (const i of idx) {
      if (answers[i][f]) {
        yes++;
        yesSpam += labels[i];
      }
    }
    const no = idx.length - yes;
    if (yes < MIN_LEAF || no < MIN_LEAF) continue;
    const after =
      (yes / idx.length) * entropy(yesSpam, yes) +
      (no / idx.length) * entropy(spam - yesSpam, no);
    const gain = before - after;
    if (!best || gain > best.gain) best = { f, gain };
  }

  if (!best || best.gain <= 0) return node;

  const yes = idx.filter((i) => answers[i][best.f]);
  const no = idx.filter((i) => !answers[i][best.f]);

  return {
    ...node,
    f: best.f,
    yes: grow(yes, depth + 1, maxDepth, tryFeatures, rand),
    no: grow(no, depth + 1, maxDepth, tryFeatures, rand),
  };
}

function classify(node, i) {
  if (node.f === undefined) return node.says;
  return classify(answers[i][node.f] ? node.yes : node.no, i);
}

/** A bootstrap sample: draw the same number of messages, with replacement. */
function bootstrap(rand) {
  return Array.from(
    { length: trainIdx.length },
    () => trainIdx[Math.floor(rand() * trainIdx.length)],
  );
}

const FORESTS = [
  {
    id: "stumps",
    name: "Sixty one-question trees",
    how: "Each tree asks a single question, chosen from four at random, on its own sample of the messages.",
    depth: 1,
    tryFeatures: 4,
    bag: true,
    seed: 11,
  },
  {
    id: "shallow",
    name: "Sixty small trees",
    how: "Four questions deep, four features to choose from at each split, each on its own sample.",
    depth: 4,
    tryFeatures: 4,
    bag: true,
    seed: 22,
  },
  {
    id: "deep",
    name: "Sixty deep trees",
    how: "Grown until the piles run out, four features to choose from at each split, each on its own sample.",
    depth: 12,
    tryFeatures: 4,
    bag: true,
    seed: 33,
  },
  {
    id: "identical",
    name: "Sixty identical trees",
    how: "The same depth, but no sampling and every feature available, so every tree comes out the same.",
    depth: 12,
    tryFeatures: FEATURES.length,
    bag: false,
    seed: 44,
  },
];

const results = FORESTS.map((spec) => {
  const rand = lcg(spec.seed);
  const trees = [];

  for (let t = 0; t < TREES; t++) {
    const sample = spec.bag ? bootstrap(rand) : trainIdx;
    trees.push(grow(sample, 0, spec.depth, spec.tryFeatures, rand));
  }

  /** Every tree's vote on every held-out message, so votes can be counted. */
  const votes = trees.map((tree) => testIdx.map((i) => classify(tree, i)));

  const alone = votes.map((v) => {
    let right = 0;
    for (let k = 0; k < testIdx.length; k++) {
      if (v[k] === labels[testIdx[k]]) right++;
    }
    return Number((right / testIdx.length).toFixed(4));
  });

  /** Accuracy of the majority vote as trees are added one at a time. */
  const running = [];
  const tally = new Array(testIdx.length).fill(0);
  for (let t = 0; t < TREES; t++) {
    for (let k = 0; k < testIdx.length; k++) tally[k] += votes[t][k];
    let right = 0;
    for (let k = 0; k < testIdx.length; k++) {
      const says = tally[k] * 2 >= t + 1 ? 1 : 0;
      if (says === labels[testIdx[k]]) right++;
    }
    running.push(Number((right / testIdx.length).toFixed(4)));
  }

  /** How often two trees disagree, averaged over every pair. */
  let disagreements = 0;
  let pairs = 0;
  for (let a = 0; a < Math.min(TREES, 20); a++) {
    for (let b = a + 1; b < Math.min(TREES, 20); b++) {
      let differ = 0;
      for (let k = 0; k < testIdx.length; k++) {
        if (votes[a][k] !== votes[b][k]) differ++;
      }
      disagreements += differ / testIdx.length;
      pairs++;
    }
  }

  const mean = alone.reduce((a, b) => a + b, 0) / alone.length;

  return {
    id: spec.id,
    name: spec.name,
    how: spec.how,
    depth: spec.depth,
    tryFeatures: spec.tryFeatures,
    bagged: spec.bag,
    trees: TREES,
    alone,
    meanAlone: Number(mean.toFixed(4)),
    bestAlone: Number(Math.max(...alone).toFixed(4)),
    worstAlone: Number(Math.min(...alone).toFixed(4)),
    together: running[running.length - 1],
    running,
    disagreement: Number((disagreements / Math.max(1, pairs)).toFixed(4)),
    gain: Number((running[running.length - 1] - mean).toFixed(4)),
  };
});

/**
 * A few real messages with the vote split, for the figure.
 *
 * Chosen from the shallow forest, spread from unanimous to nearly tied, so the
 * figure can show what a close vote looks like rather than only a landslide.
 * Messages with seven or more consecutive digits are excluded, as everywhere
 * else on this site, so no real phone number is reprinted.
 */
const shallow = FORESTS.findIndex((f) => f.id === "shallow");
const shallowRand = lcg(FORESTS[shallow].seed);
const shallowTrees = [];
for (let t = 0; t < TREES; t++) {
  shallowTrees.push(
    grow(bootstrap(shallowRand), 0, FORESTS[shallow].depth, FORESTS[shallow].tryFeatures, shallowRand),
  );
}

const scored = testIdx
  .filter((i) => !/\d{7,}/.test(messages[i].body))
  .map((i) => {
    const yes = shallowTrees.reduce((n, tree) => n + classify(tree, i), 0);
    return { index: i, yes, spam: labels[i] };
  });

const TARGET_SPLITS = [0.03, 0.25, 0.45, 0.55, 0.75, 0.97];
const examples = [];
for (const target of TARGET_SPLITS) {
  let best = null;
  let bestGap = Infinity;
  for (const s of scored) {
    if (examples.some((e) => e.index === s.index)) continue;
    const gap = Math.abs(s.yes / TREES - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = s;
    }
  }
  if (!best) continue;
  examples.push({
    index: best.index,
    text:
      messages[best.index].body.length > 150
        ? `${messages[best.index].body.slice(0, 150)}…`
        : messages[best.index].body,
    votesForSpam: best.yes,
    spam: best.spam,
  });
}

const out = {
  generatedBy: "data/scripts/build-forest.mjs",
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
  note: "Every forest is grown on the same training messages and scored on the same held-out ones. The only differences between them are how deep each tree goes, how many questions it may choose from, and whether it gets its own sample.",
  treesPerForest: TREES,
  forests: results,
  examples,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
console.log("alone (mean)   together   gain    disagree   forest");
for (const f of results) {
  console.log(
    `${(f.meanAlone * 100).toFixed(2)}%        ${(f.together * 100).toFixed(2)}%   ` +
      `${(f.gain * 100).toFixed(2)}   ${(f.disagreement * 100).toFixed(2)}%      ${f.name}`,
  );
}
console.log(
  `\nvote splits in examples: ${examples.map((e) => `${e.votesForSpam}/${TREES}`).join(", ")}`,
);
