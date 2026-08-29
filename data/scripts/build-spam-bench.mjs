/**
 * Generates public/data/spam-bench.json
 *
 * Lesson 1 asks the learner to write spam rules by hand, watch them fail, and
 * then compare against something that learned from examples instead. For that
 * comparison to mean anything, both numbers have to be real, so both are
 * measured here against the same 5,574 genuine SMS messages.
 *
 * Input: data/raw/SMSSpamCollection, the SMS Spam Collection v.1, which is not
 * committed (it is somebody else's corpus). Fetch it first:
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-spam-bench.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/spam-bench.json");

/**
 * The rules a person actually reaches for when asked to catch spam by hand.
 * They are deliberately reasonable, the lesson lands only if the rules are
 * ones the learner would have written themselves.
 */
const RULES = [
  {
    id: "free",
    label: "Says “free”",
    test: (t) => /\bfree\b/i.test(t),
  },
  {
    id: "prize",
    label: "Mentions winning a prize",
    test: (t) => /\b(win|won|winner|prize|award(ed)?|claim)\b/i.test(t),
  },
  {
    id: "shortcode",
    label: "Has a 5+ digit number",
    test: (t) => /\d{5,}/.test(t),
  },
  {
    id: "money",
    label: "Mentions money",
    test: (t) => /[£$]|\b\d+\s?(p|gbp|pounds?)\b/i.test(t),
  },
  {
    id: "texting",
    label: "Tells you to text or call a number",
    test: (t) => /\b(txt|text|call|reply|sms)\b[^.]{0,24}?\d{4,}/i.test(t),
  },
  {
    id: "shouting",
    label: "Two or more SHOUTED words",
    test: (t) => (t.match(/\b[A-Z]{3,}\b/g) ?? []).length >= 2,
  },
  {
    id: "urgent",
    label: "Sounds urgent",
    test: (t) => /\b(urgent|now|today|immediately|expires?|last chance)\b/i.test(t),
  },
  {
    id: "long",
    label: "Longer than 120 characters",
    test: (t) => t.length > 120,
  },
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

console.log(
  `${messages.length} messages, ${messages.filter((m) => m.label === "spam").length} spam`,
);

/** Bitmask of which rules fire, so the browser can score any combination. */
function maskFor(body) {
  let mask = 0;
  RULES.forEach((rule, i) => {
    if (rule.test(body)) mask |= 1 << i;
  });
  return mask;
}

const masks = messages.map((m) => maskFor(m.body));
const labels = messages.map((m) => (m.label === "spam" ? 1 : 0));

// --------------------------------------------------------- the learned model --

/** Fixed-seed PRNG so the train/test split, and therefore the headline
    accuracy, is identical every time this script runs. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function tokenize(body) {
  return body.toLowerCase().match(/[a-z£$']+|\d+/g) ?? [];
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

/**
 * Multinomial naive Bayes with add-one smoothing, about as simple as
 * "learning from examples" gets, which is the point. Nothing here is tuned to
 * flatter the result.
 */
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

function classify(body) {
  let best = 0;
  let bestScore = -Infinity;
  for (let y = 0; y < 2; y++) {
    let score = Math.log(docs[y] / trainIdx.length);
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
}

let nbTp = 0;
let nbFp = 0;
let nbFn = 0;
let nbTn = 0;
for (const i of testIdx) {
  const pred = classify(messages[i].body);
  if (pred && labels[i]) nbTp++;
  else if (pred && !labels[i]) nbFp++;
  else if (!pred && labels[i]) nbFn++;
  else nbTn++;
}

const learned = {
  method: "Multinomial naive Bayes, add-one smoothing, bag of words",
  trainSize: trainIdx.length,
  testSize: testIdx.length,
  caught: nbTp,
  falseAlarms: nbFp,
  missed: nbFn,
  accuracy: Number(((nbTp + nbTn) / testIdx.length).toFixed(4)),
};

console.log(`naive Bayes test accuracy: ${(learned.accuracy * 100).toFixed(1)}%`);

// -------------------------------------------- rules, scored on the same split

/**
 * Rules are scored on the held-out split too, not on the whole corpus.
 * Measuring hand-written rules in-sample and the learned model out-of-sample
 * would stack the comparison in the model's favour, and the lesson does not
 * need a rigged result to make its point.
 */
function score(fires) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const i of testIdx) {
    const flagged = fires(masks[i]);
    if (flagged && labels[i]) tp++;
    else if (flagged && !labels[i]) fp++;
    else if (!flagged && labels[i]) fn++;
    else tn++;
  }
  return {
    caught: tp,
    falseAlarms: fp,
    missed: fn,
    accuracy: Number(((tp + tn) / testIdx.length).toFixed(4)),
  };
}

const perRule = RULES.map((rule, i) => ({
  id: rule.id,
  label: rule.label,
  ...score((mask) => (mask & (1 << i)) !== 0),
}));

/**
 * The best any OR-combination of these rules can do, the ceiling on writing
 * them by hand, found by trying all 255 non-empty subsets. Worth knowing so the
 * lesson can say what beating it actually took.
 */
let bestSubset = { mask: 0, accuracy: 0 };
for (let subset = 1; subset < 1 << RULES.length; subset++) {
  const s = score((mask) => (mask & subset) !== 0);
  if (s.accuracy > bestSubset.accuracy) {
    bestSubset = {
      mask: subset,
      rules: RULES.filter((_, i) => subset & (1 << i)).map((r) => r.id),
      ...s,
    };
  }
}

/**
 * Flag nothing at all. On a corpus that is 86.6% ordinary messages this scores
 * suspiciously well, which is exactly why accuracy alone is the wrong number to
 * judge any of this by.
 */
const baseline = score(() => false);

console.log(
  `best rule combination: ${(bestSubset.accuracy * 100).toFixed(1)}% (${bestSubset.rules.join(" + ")})`,
);
console.log(`flag nothing baseline: ${(baseline.accuracy * 100).toFixed(1)}%`);

// ------------------------------------------------------- messages on display --

/**
 * A dozen messages the learner actually reads. Picked to include the cases that
 * make hand-written rules fail: spam that trips none of the obvious rules, and
 * ordinary messages that trip several.
 *
 * Only messages without a recognisable personal phone number are eligible,
 * the corpus is public, but there is no reason to reprint someone's number.
 */
const safe = (body) => !/\b\d{7,}\b/.test(body);

function pick(predicate, n) {
  const out = [];
  for (let i = 0; i < messages.length && out.length < n; i++) {
    if (!safe(messages[i].body)) continue;
    if (predicate(messages[i], masks[i], labels[i])) {
      out.push({
        body: messages[i].body,
        spam: labels[i] === 1,
        mask: masks[i],
      });
    }
  }
  return out;
}

const ruleCount = (mask) => {
  let n = 0;
  for (let i = 0; i < RULES.length; i++) if (mask & (1 << i)) n++;
  return n;
};

const examples = [
  // Spam that any rule set catches, the easy win that builds false confidence.
  ...pick((m, mask, y) => y === 1 && ruleCount(mask) >= 4, 3),
  // Spam that slips through almost everything.
  ...pick((m, mask, y) => y === 1 && ruleCount(mask) <= 1, 3),
  // Ordinary messages that trip the rules anyway, the cost nobody expects.
  ...pick((m, mask, y) => y === 0 && ruleCount(mask) >= 3, 3),
  // Ordinary messages that stay clean.
  ...pick((m, mask, y) => y === 0 && ruleCount(mask) === 0 && m.body.length > 40, 3),
];

const output = {
  generatedBy: "data/scripts/build-spam-bench.mjs",
  corpus: {
    name: "SMS Spam Collection v.1",
    total: messages.length,
    spam: labels.filter(Boolean).length,
    ham: labels.length - labels.filter(Boolean).length,
  },
  rules: RULES.map((r) => ({ id: r.id, label: r.label })),
  perRule,
  bestSubset,
  baseline,
  learned,
  examples,
  /**
   * The held-out messages, one entry each: the rule bitmask in the low bits and
   * the true label above them. The browser scores whatever combination the
   * learner selects against exactly the same messages the model was judged on.
   */
  testSet: testIdx.map((i) => masks[i] | (labels[i] << RULES.length)),
  ruleCount: RULES.length,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Wrote ${OUT}`);
console.log(
  perRule
    .map((r) => `  ${r.label.padEnd(34)} caught ${String(r.caught).padStart(3)}  false alarms ${r.falseAlarms}`)
    .join("\n"),
);
