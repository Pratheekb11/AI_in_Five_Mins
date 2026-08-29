/**
 * Generates public/data/logistic.json
 *
 * The sixth machine learning module is the step from a line to a probability.
 * Two features are enough to draw the whole thing: how long a message is, and
 * how many digits are in it. Every message becomes a point on a plane, and
 * logistic regression finds a straight line through that plane, then turns
 * distance from the line into a probability with the logistic curve.
 *
 * Both halves of that are worth seeing, so both are exported. The boundary is
 * saved at every step of training, so the figure can animate the real descent
 * rather than a scripted one, and every held-out message ships with its
 * coordinates and the probability the finished model gives it.
 *
 * Two features rather than the full bag of words, on purpose. A model over
 * 7,000 words cannot be drawn, and the point of this module is that it can.
 * The accuracy is correspondingly modest, and the page says so.
 *
 * Input: data/raw/SMSSpamCollection, SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-logistic.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/logistic.json");

const STEPS = 400;
const RATE = 0.5;
/** How many snapshots of the boundary to keep, spread across training. */
const SNAPSHOTS = 24;

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

// ----------------------------------------------------------------- features --

/** Two numbers per message, both readable off the message by eye. */
function featuresOf(body) {
  const digits = (body.match(/\d/g) ?? []).length;
  return { length: body.length, digits };
}

const raw = messages.map((m) => featuresOf(m.body));

/**
 * Standardised on the training messages only.
 *
 * Length runs to hundreds and digit counts to tens, so without scaling the
 * gradient is dominated by length and training crawls. Using the training
 * statistics rather than the whole corpus keeps the held-out messages properly
 * held out, including from the scaling.
 */
function stats(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length,
  );
  return { mean, sd: sd || 1 };
}

const lengthStats = stats(trainIdx.map((i) => raw[i].length));
const digitStats = stats(trainIdx.map((i) => raw[i].digits));

const scaled = raw.map((f) => ({
  x: (f.length - lengthStats.mean) / lengthStats.sd,
  y: (f.digits - digitStats.mean) / digitStats.sd,
}));

// ------------------------------------------------------------------ fitting --

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

let w = { bias: 0, length: 0, digits: 0 };
const snapshots = [];

function accuracyOn(weights, idx) {
  let right = 0;
  for (const i of idx) {
    const p = sigmoid(
      weights.bias + weights.length * scaled[i].x + weights.digits * scaled[i].y,
    );
    if ((p >= 0.5 ? 1 : 0) === labels[i]) right++;
  }
  return right / idx.length;
}

function lossOn(weights, idx) {
  let sum = 0;
  for (const i of idx) {
    const p = sigmoid(
      weights.bias + weights.length * scaled[i].x + weights.digits * scaled[i].y,
    );
    const clipped = Math.min(1 - 1e-12, Math.max(1e-12, p));
    sum += -(labels[i] * Math.log(clipped) + (1 - labels[i]) * Math.log(1 - clipped));
  }
  return sum / idx.length;
}

const every = Math.max(1, Math.floor(STEPS / (SNAPSHOTS - 1)));

for (let step = 0; step <= STEPS; step++) {
  if (step % every === 0 || step === STEPS) {
    snapshots.push({
      step,
      bias: Number(w.bias.toFixed(5)),
      length: Number(w.length.toFixed(5)),
      digits: Number(w.digits.toFixed(5)),
      trainLoss: Number(lossOn(w, trainIdx).toFixed(5)),
      trainAccuracy: Number(accuracyOn(w, trainIdx).toFixed(4)),
      testAccuracy: Number(accuracyOn(w, testIdx).toFixed(4)),
    });
  }
  if (step === STEPS) break;

  let gBias = 0;
  let gLength = 0;
  let gDigits = 0;
  for (const i of trainIdx) {
    const p = sigmoid(w.bias + w.length * scaled[i].x + w.digits * scaled[i].y);
    const error = p - labels[i];
    gBias += error;
    gLength += error * scaled[i].x;
    gDigits += error * scaled[i].y;
  }
  const n = trainIdx.length;
  w = {
    bias: w.bias - (RATE * gBias) / n,
    length: w.length - (RATE * gLength) / n,
    digits: w.digits - (RATE * gDigits) / n,
  };
}

const final = snapshots[snapshots.length - 1];

// ------------------------------------------------------- points and rounds --

function probabilityOf(i) {
  return sigmoid(final.bias + final.length * scaled[i].x + final.digits * scaled[i].y);
}

const points = testIdx.map((i) => [
  raw[i].length,
  raw[i].digits,
  labels[i],
  Number(probabilityOf(i).toFixed(4)),
]);

/**
 * Twelve real held-out messages for the game, spread across the probability
 * range so the rounds are not all obvious.
 *
 * Messages containing seven or more digits in a row are excluded, the same rule
 * `build-spam-bench.mjs` uses, so no real phone number is reprinted.
 */
const safe = testIdx.filter((i) => !/\d{7,}/.test(messages[i].body));

/**
 * Targets spread across the probability range, not across the ranking.
 *
 * Most held-out messages sit under five per cent, so picking every hundredth
 * message by rank produces twelve rounds that all look the same. Choosing the
 * nearest real message to each of twelve target probabilities gives a game that
 * covers the range, and every round is still a real message with its real
 * score.
 */
const TARGETS = [0.01, 0.05, 0.12, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 0.96, 0.995];
const picks = [];

for (const target of TARGETS) {
  let best = null;
  let bestGap = Infinity;
  for (const i of safe) {
    if (picks.some((p) => p.index === i)) continue;
    const gap = Math.abs(probabilityOf(i) - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  if (best === null) continue;
  picks.push({
    index: best,
    target,
    text:
      messages[best].body.length > 180
        ? `${messages[best].body.slice(0, 180)}…`
        : messages[best].body,
    length: raw[best].length,
    digits: raw[best].digits,
    spam: labels[best],
    probability: Number(probabilityOf(best).toFixed(4)),
  });
}

const out = {
  generatedBy: "data/scripts/build-logistic.mjs",
  source: {
    name: "SMS Spam Collection v.1",
    authors: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  model: {
    name: "Logistic regression on two features",
    features: ["message length in characters", "how many digits it contains"],
    steps: STEPS,
    learningRate: RATE,
    note: "Two features so the whole model can be drawn. A bag of words does better and cannot be put on a page.",
  },
  scaling: {
    length: { mean: Number(lengthStats.mean.toFixed(4)), sd: Number(lengthStats.sd.toFixed(4)) },
    digits: { mean: Number(digitStats.mean.toFixed(4)), sd: Number(digitStats.sd.toFixed(4)) },
    note: "Both features are standardised using the training messages only.",
  },
  corpus: {
    total: messages.length,
    trainSize: trainIdx.length,
    testSize: testIdx.length,
    spamInTest: testIdx.reduce((n, i) => n + labels[i], 0),
  },
  snapshots,
  final: {
    bias: final.bias,
    length: final.length,
    digits: final.digits,
    trainAccuracy: final.trainAccuracy,
    testAccuracy: final.testAccuracy,
  },
  points,
  rounds: picks,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
console.log(
  `after ${STEPS} steps: bias ${final.bias}, length ${final.length}, digits ${final.digits}`,
);
console.log(
  `train ${(final.trainAccuracy * 100).toFixed(1)}%  test ${(final.testAccuracy * 100).toFixed(1)}%  loss ${final.trainLoss}`,
);
console.log(`\n${picks.length} game rounds, probabilities:`);
console.log(picks.map((p) => `${(p.probability * 100).toFixed(1)}%${p.spam ? " spam" : ""}`).join("  "));
