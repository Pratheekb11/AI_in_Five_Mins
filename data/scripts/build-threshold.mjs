/**
 * Generates public/data/threshold.json
 *
 * The third machine learning module is about the fact that a classifier does
 * not classify. It produces a number, and somebody, usually nobody in
 * particular, chooses the line at which that number becomes a decision. Move
 * the line and every score you care about moves with it, in opposite
 * directions.
 *
 * So the naive Bayes from the previous module is trained once on the same 4,459
 * training messages, asked for a probability on each of the 1,115 held-out
 * ones, and then the line is swept across the whole range. At every position
 * the four counts are recorded: caught, missed, false alarms, and correctly
 * left alone. Everything the page says about precision, recall and accuracy is
 * arithmetic on those four numbers.
 *
 * Nothing here is tuned and nothing is smoothed. The curve is bumpy in places
 * because 1,115 messages is a finite number of messages, and that is worth
 * seeing rather than hiding.
 *
 * Input: data/raw/SMSSpamCollection, SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-threshold.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/threshold.json");

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

// -------------------------------------------------------------- the scorer --

const counts = [new Map(), new Map()];
const totals = [0, 0];
const docs = [0, 0];
const vocab = new Set();

for (const i of trainIdx) {
  const y = labels[i];
  docs[y]++;
  for (const w of tokenize(messages[i].body)) {
    counts[y].set(w, (counts[y].get(w) ?? 0) + 1);
    totals[y]++;
    vocab.add(w);
  }
}
const V = vocab.size;

/**
 * Probability that a message is spam, rather than a yes or a no.
 *
 * The two class log-scores are turned into a probability with a logistic on
 * their difference. Naive Bayes probabilities are famously overconfident,
 * which is why almost every message lands very near 0 or very near 1, and that
 * is exactly the shape the module needs the reader to see: the line has to go
 * somewhere, and most of the range is empty.
 */
function spamProbability(body) {
  const words = tokenize(body);
  const scores = [0, 1].map((y) => {
    let score = Math.log(docs[y] / trainIdx.length);
    for (const w of words) {
      if (!vocab.has(w)) continue;
      score += Math.log(((counts[y].get(w) ?? 0) + 1) / (totals[y] + V));
    }
    return score;
  });
  const diff = scores[1] - scores[0];
  return 1 / (1 + Math.exp(-diff));
}

const scored = testIdx.map((i) => ({
  probability: spamProbability(messages[i].body),
  spam: labels[i],
}));

// ------------------------------------------------------------- the sweep --

function confusionAt(threshold) {
  let caught = 0;
  let falseAlarms = 0;
  let missed = 0;
  let leftAlone = 0;
  for (const s of scored) {
    const flagged = s.probability >= threshold;
    if (flagged && s.spam) caught++;
    else if (flagged && !s.spam) falseAlarms++;
    else if (!flagged && s.spam) missed++;
    else leftAlone++;
  }
  const total = scored.length;
  const flagged = caught + falseAlarms;
  const spam = caught + missed;
  return {
    threshold: Number(threshold.toFixed(4)),
    caught,
    falseAlarms,
    missed,
    leftAlone,
    accuracy: Number(((caught + leftAlone) / total).toFixed(4)),
    /** Of what it flagged, how much really was spam. */
    precision: Number((flagged === 0 ? 1 : caught / flagged).toFixed(4)),
    /** Of all the spam there was, how much it caught. */
    recall: Number((spam === 0 ? 0 : caught / spam).toFixed(4)),
  };
}

/**
 * Thresholds swept on a log scale at both ends.
 *
 * A linear sweep spends ninety-nine of its hundred steps in a region where
 * nothing changes, because the scorer is so confident. Sampling densely near 0
 * and near 1 is what makes the trade visible at all.
 */
const THRESHOLDS = [];
for (let i = 0; i <= 40; i++) THRESHOLDS.push(10 ** (-12 + (i * 12) / 40));
for (let i = 1; i <= 20; i++) THRESHOLDS.push(0.05 * i * 0.999);
for (let i = 1; i <= 20; i++) THRESHOLDS.push(1 - 10 ** (-i / 2));
THRESHOLDS.sort((a, b) => a - b);

const curve = THRESHOLDS.map(confusionAt);

/** Named places on the line, for the walkthrough to stop at. */
const STOPS = [
  {
    id: "everything",
    label: "Flag anything with the faintest smell of spam",
    at: 1e-12,
  },
  { id: "half", label: "The line nobody chose: one half", at: 0.5 },
  { id: "cautious", label: "Only flag what it is nearly certain about", at: 1 - 1e-9 },
];

const stops = STOPS.map((stop) => ({ ...stop, ...confusionAt(stop.at) }));

/**
 * Costs, so the trade has consequences rather than being a matter of taste.
 * Every scenario is scored on the same measured counts, and the best threshold
 * is found by evaluating all of them rather than by argument.
 */
const SCENARIOS = [
  {
    id: "inbox",
    title: "Your own phone",
    says: "A spam that gets through is a mild annoyance. A real message sent to the spam folder is a missed dentist appointment.",
    missedCost: 1,
    falseAlarmCost: 8,
  },
  {
    id: "bank",
    title: "A bank's fraud alerts",
    says: "Missing a fraudulent message costs real money. Flagging a genuine one costs a customer five minutes.",
    missedCost: 20,
    falseAlarmCost: 1,
  },
  {
    id: "marketing",
    title: "A company's shared inbox",
    says: "Both cost about the same: somebody deals with it either way.",
    missedCost: 1,
    falseAlarmCost: 1,
  },
  {
    id: "hospital",
    title: "A hospital paging system",
    says: "A blocked message can be a life. A spam getting through wastes a few seconds.",
    missedCost: 1,
    falseAlarmCost: 60,
  },
];

const scenarios = SCENARIOS.map((scenario) => {
  const costed = curve.map((point) => ({
    threshold: point.threshold,
    cost:
      point.missed * scenario.missedCost +
      point.falseAlarms * scenario.falseAlarmCost,
  }));
  const best = costed.reduce((a, b) => (b.cost < a.cost ? b : a));
  const worst = costed.reduce((a, b) => (b.cost > a.cost ? b : a));
  return {
    ...scenario,
    best: { ...confusionAt(best.threshold), cost: best.cost },
    worstCost: worst.cost,
  };
});

const spamInTest = scored.reduce((n, s) => n + s.spam, 0);

const out = {
  generatedBy: "data/scripts/build-threshold.mjs",
  source: {
    name: "SMS Spam Collection v.1",
    authors: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  model: {
    name: "Multinomial naive Bayes, add-one smoothing, bag of words",
    note: "Trained once on the 4,459 training messages. Every count below is from the 1,115 it never saw.",
  },
  corpus: {
    total: messages.length,
    trainSize: trainIdx.length,
    testSize: scored.length,
    spamInTest,
    hamInTest: scored.length - spamInTest,
  },
  curve,
  stops,
  scenarios,
  /**
   * Every held-out message as one number and one label, so the figure can draw
   * the actual distribution and put the line through it. Rounded to six
   * decimals: enough that a dot lands where it belongs on a log axis, and small
   * enough to ship.
   */
  points: scored.map((s) => [Number(s.probability.toFixed(6)), s.spam]),
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
for (const stop of stops) {
  console.log(
    `${stop.label}\n  threshold ${stop.threshold}  caught ${stop.caught}/${spamInTest}  ` +
      `false alarms ${stop.falseAlarms}  accuracy ${(stop.accuracy * 100).toFixed(1)}%  ` +
      `precision ${(stop.precision * 100).toFixed(1)}%  recall ${(stop.recall * 100).toFixed(1)}%`,
  );
}
console.log("");
for (const s of scenarios) {
  console.log(
    `${s.title}: best threshold ${s.best.threshold}, cost ${s.best.cost} ` +
      `(worst on the curve ${s.worstCost}), catching ${s.best.caught} with ${s.best.falseAlarms} false alarms`,
  );
}
