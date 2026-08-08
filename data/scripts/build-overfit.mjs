/**
 * Generates public/data/overfit.json
 *
 * The fourth machine learning module is the U-shaped curve, and it is worth
 * building on data the reader has already met. `regression.json` holds 140 real
 * sentences from Alice in Wonderland, each with a character count and a token
 * count, and the relationship between the two is close to a straight line.
 *
 * So a straight line is the right answer, and everything past it is the model
 * inventing structure that is not there. Fitting polynomials of rising degree
 * to a small sample of those sentences produces the classic picture honestly:
 * training error falls all the way to nothing while error on the held-out
 * sentences bottoms out early and then climbs.
 *
 * The training sample is deliberately small, thirty sentences, because that is
 * the situation the failure actually happens in. With all 140 the wiggling
 * still occurs but the picture is less clear, and the honest way to make a
 * point is to pick the conditions and say you picked them, which the page does.
 *
 * Input: public/data/regression.json, itself built by build-regression-data.mjs
 * from the Project Gutenberg text of Alice in Wonderland.
 *
 * Run: node data/scripts/build-overfit.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "public/data/regression.json");
const OUT = resolve(ROOT, "public/data/overfit.json");

const regression = JSON.parse(await readFile(IN, "utf8"));

/** How many sentences the models are allowed to learn from. */
const TRAIN_SIZE = 30;
/** Straight line is degree 1. Twelve is far past anything defensible. */
const MAX_DEGREE = 12;

// --------------------------------------------------------------- the sample --

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const order = regression.points.map((_, i) => i);
const rand = lcg(20260808);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}

const train = order.slice(0, TRAIN_SIZE).map((i) => regression.points[i]);
const test = order.slice(TRAIN_SIZE).map((i) => regression.points[i]);

/**
 * Characters are scaled into [0, 1] before fitting.
 *
 * Raw character counts run to several hundred, so a twelfth power of them
 * overflows the useful range of a double long before the fit is interesting.
 * Scaling is not a trick: it is the same model, in different units, and the
 * figure scales back before it draws anything.
 */
const maxChars = Math.max(...regression.points.map((p) => p.chars));

const scale = (chars) => chars / maxChars;

// ------------------------------------------------------------------ fitting --

/** Solves a small dense system by Gaussian elimination with partial pivoting. */
function solve(matrix, rhs) {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-14) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];

    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / a[col][col];
      for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
    }
  }

  const out = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = a[row][n];
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * out[k];
    out[row] = sum / a[row][row];
  }
  return out;
}

/** Ordinary least squares for a polynomial of the given degree. */
function fit(points, degree) {
  const n = degree + 1;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  const rhs = new Array(n).fill(0);

  for (const point of points) {
    const x = scale(point.chars);
    const powers = [];
    for (let i = 0; i < n; i++) powers.push(x ** i);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) matrix[i][j] += powers[i] * powers[j];
      rhs[i] += powers[i] * point.tokens;
    }
  }

  return solve(matrix, rhs);
}

function predict(coefficients, chars) {
  const x = scale(chars);
  let out = 0;
  for (let i = 0; i < coefficients.length; i++) out += coefficients[i] * x ** i;
  return out;
}

function rmse(coefficients, points) {
  let sum = 0;
  for (const point of points) {
    const error = predict(coefficients, point.chars) - point.tokens;
    sum += error * error;
  }
  return Math.sqrt(sum / points.length);
}

/** Fits every degree to one sample, and scores each on what it never saw. */
function sweep(trainSet, testSet) {
  const out = [];
  for (let degree = 0; degree <= MAX_DEGREE; degree++) {
    const coefficients = fit(trainSet, degree);
    if (!coefficients) continue;
    out.push({
      degree,
      coefficients: coefficients.map((c) => Number(c.toFixed(6))),
      trainError: Number(rmse(coefficients, trainSet).toFixed(4)),
      testError: Number(rmse(coefficients, testSet).toFixed(4)),
    });
  }
  return out;
}

const degrees = sweep(train, test);
const best = degrees.reduce((a, b) => (b.testError < a.testError ? b : a));

/**
 * The game's rounds: the same question at six different amounts of data.
 *
 * Four samples of the same size would have made the answer identical every
 * time, because on this data a straight line wins at thirty examples and keeps
 * winning. What actually moves the answer is how much you were given. With
 * eight sentences a cubic is already nonsense; with a hundred and ten it costs
 * almost nothing. That is the real relationship between data and capacity, and
 * it is the thing worth putting money on.
 *
 * Every round holds out everything it was not trained on, so the sizes differ
 * on both sides, and the page says so.
 */
const ROUND_SIZES = [8, 12, 20, 30, 60, 110];
const ROUND_SEED = 20260202;
/** The degrees the game offers. Small enough to draw, wide enough to fail. */
const OFFERED = [1, 3, 5, 8];

const shuffled = regression.points.map((_, k) => k);
const roundRand = lcg(ROUND_SEED);
for (let k = shuffled.length - 1; k > 0; k--) {
  const j = Math.floor(roundRand() * (k + 1));
  [shuffled[k], shuffled[j]] = [shuffled[j], shuffled[k]];
}

const rounds = ROUND_SIZES.map((size) => {
  const roundTrain = shuffled.slice(0, size).map((k) => regression.points[k]);
  const roundTest = shuffled.slice(size).map((k) => regression.points[k]);
  const swept = sweep(roundTrain, roundTest).filter((d) =>
    OFFERED.includes(d.degree),
  );
  const winner = swept.reduce((a, b) => (b.testError < a.testError ? b : a));
  return {
    id: `n${size}`,
    trainSize: roundTrain.length,
    testSize: roundTest.length,
    train: roundTrain,
    candidates: swept,
    bestDegree: winner.degree,
    bestError: winner.testError,
  };
});

const out = {
  generatedBy: "data/scripts/build-overfit.mjs",
  source: regression.source,
  note: "The same 140 sentences as regression.json. Thirty of them, drawn at a fixed seed, are what each model learns from; the rest are held out.",
  maxChars,
  trainSize: train.length,
  testSize: test.length,
  offered: OFFERED,
  train,
  test,
  degrees,
  best: { degree: best.degree, testError: best.testError },
  worst: degrees[degrees.length - 1],
  rounds,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`wrote ${OUT}\n`);
console.log("degree  train   test");
for (const d of degrees) {
  console.log(
    `${String(d.degree).padStart(5)}  ${d.trainError.toFixed(3).padStart(6)}  ` +
      `${d.testError.toFixed(3).padStart(7)}${d.degree === best.degree ? "  <- best on held-out" : ""}`,
  );
}
console.log("");
for (const round of rounds) {
  console.log(
    `${round.trainSize} examples: best offered is degree ${round.bestDegree} ` +
      `(${round.candidates
        .map((c) => `${c.degree}:${c.testError.toFixed(2)}`)
        .join("  ")})`,
  );
}
