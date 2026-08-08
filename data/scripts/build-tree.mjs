/**
 * Generates public/data/tree.json
 *
 * The seventh machine learning module is the decision tree, and it is the first
 * model in this track that a person could execute by hand. It is also the same
 * idea as the first module, applied over and over: ask the question that
 * removes the most uncertainty, then ask again on each of the two piles you are
 * left with.
 *
 * So the tree here is grown greedily on information gain from the same twelve
 * yes-or-no features as `features.json`, on the same training split. Every node
 * records what it saw, what it asked, and what that question was worth in bits,
 * which is what lets the game score a player's choice of split against the
 * real numbers rather than against an opinion.
 *
 * Trees are also the cleanest demonstration of overfitting available, so the
 * whole thing is regrown at every depth from one to twelve and scored on the
 * held-out messages each time. The curve turns.
 *
 * Input: data/raw/SMSSpamCollection — SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-tree.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/tree.json");

/** The same twelve questions as features.json, in the same words. */
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

const MAX_DEPTH = 12;
/** A pile this small is not evidence of anything, so stop splitting it. */
const MIN_LEAF = 5;

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
const rand = lcg(20260802);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
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

function countSpam(idx) {
  let n = 0;
  for (const i of idx) n += labels[i];
  return n;
}

/** What every question would be worth on this pile, measured. */
function gainsOn(idx) {
  const total = idx.length;
  const spam = countSpam(idx);
  const before = entropy(spam, total);

  return FEATURES.map((feature, f) => {
    let yes = 0;
    let yesSpam = 0;
    for (const i of idx) {
      if (answers[i][f]) {
        yes++;
        yesSpam += labels[i];
      }
    }
    const no = total - yes;
    const noSpam = spam - yesSpam;
    const after =
      (yes / total) * entropy(yesSpam, yes) + (no / total) * entropy(noSpam, no);

    return {
      id: feature.id,
      label: feature.label,
      yes,
      yesSpam,
      no,
      noSpam,
      gain: Number((before - after).toFixed(5)),
    };
  });
}

function grow(idx, depth, maxDepth) {
  const total = idx.length;
  const spam = countSpam(idx);
  const node = {
    size: total,
    spam,
    purity: Number((total === 0 ? 0 : spam / total).toFixed(4)),
    says: spam * 2 >= total ? 1 : 0,
    entropy: Number(entropy(spam, total).toFixed(5)),
  };

  if (depth >= maxDepth || spam === 0 || spam === total || total < MIN_LEAF * 2) {
    return node;
  }

  const gains = gainsOn(idx);
  const best = gains.reduce((a, b) => (b.gain > a.gain ? b : a));
  if (best.gain <= 0 || best.yes < MIN_LEAF || best.no < MIN_LEAF) return node;

  const f = FEATURES.findIndex((feature) => feature.id === best.id);
  const yes = idx.filter((i) => answers[i][f]);
  const no = idx.filter((i) => !answers[i][f]);

  return {
    ...node,
    ask: best.id,
    label: best.label,
    gain: best.gain,
    /** Every candidate at this node, so the game can score any choice. */
    candidates: gains
      .map((g) => ({ id: g.id, label: g.label, gain: g.gain }))
      .sort((a, b) => b.gain - a.gain),
    yes: grow(yes, depth + 1, maxDepth),
    no: grow(no, depth + 1, maxDepth),
  };
}

function classify(node, i) {
  if (!node.ask) return node.says;
  const f = FEATURES.findIndex((feature) => feature.id === node.ask);
  return classify(answers[i][f] ? node.yes : node.no, i);
}

function accuracy(node, idx) {
  let right = 0;
  for (const i of idx) if (classify(node, i) === labels[i]) right++;
  return Number((right / idx.length).toFixed(4));
}

function countLeaves(node) {
  return node.ask ? countLeaves(node.yes) + countLeaves(node.no) : 1;
}

const depths = [];
for (let depth = 1; depth <= MAX_DEPTH; depth++) {
  const tree = grow(trainIdx, 0, depth);
  depths.push({
    depth,
    leaves: countLeaves(tree),
    trainAccuracy: accuracy(tree, trainIdx),
    testAccuracy: accuracy(tree, testIdx),
  });
}

const best = depths.reduce((a, b) => (b.testAccuracy > a.testAccuracy ? b : a));
/** The tree the figure draws: deep enough to be interesting, shallow enough to read. */
const shown = grow(trainIdx, 0, 4);

/**
 * The game's nodes: the root and a handful of its descendants.
 *
 * Each one carries the pile it saw and what every question would have been
 * worth on that pile, so a player's choice is scored against measurement. Only
 * nodes with a genuine choice are kept: if one question is worth four times the
 * next, there is nothing to think about.
 */
const rounds = [];
function collect(node, path) {
  if (!node.ask || rounds.length >= 8) return;
  const sorted = [...node.candidates].sort((a, b) => b.gain - a.gain);
  const [first, second] = sorted;
  if (first.gain > 0 && second && second.gain > first.gain * 0.25) {
    rounds.push({
      id: path.join("-") || "root",
      path,
      size: node.size,
      spam: node.spam,
      entropy: node.entropy,
      answer: first.id,
      candidates: sorted.slice(0, 5),
    });
  }
  collect(node.yes, [...path, "yes"]);
  collect(node.no, [...path, "no"]);
}
collect(shown, []);

const out = {
  generatedBy: "data/scripts/build-tree.mjs",
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
    spamInTrain: countSpam(trainIdx),
  },
  features: FEATURES.map((f) => ({ id: f.id, label: f.label })),
  note: "Grown greedily on information gain, the same measure as the features module, applied again to each pile it creates.",
  tree: shown,
  depths,
  best: { depth: best.depth, testAccuracy: best.testAccuracy },
  rounds,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
console.log("depth  leaves   train    test");
for (const d of depths) {
  console.log(
    `${String(d.depth).padStart(5)}  ${String(d.leaves).padStart(6)}  ` +
      `${(d.trainAccuracy * 100).toFixed(2)}%  ${(d.testAccuracy * 100).toFixed(2)}%` +
      (d.depth === best.depth ? "  <- best held-out" : ""),
  );
}
console.log(`\nroot asks: ${shown.label} (${shown.gain} bits)`);
console.log(`${rounds.length} game nodes: ${rounds.map((r) => r.id).join(", ")}`);
