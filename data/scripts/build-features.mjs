/**
 * Generates public/data/features.json
 *
 * The first machine learning module is about the step everybody skips: before
 * anything can be learned, the thing in front of you has to become numbers.
 * A text message becomes a row of yes-or-no answers, and the whole of what a
 * model can ever know about that message is what survives that translation.
 *
 * So every candidate feature here is measured on the real corpus: how often it
 * fires, how spammy the pile it catches is, how spammy the pile it leaves
 * behind is, and how many bits of uncertainty it removes. The last of those is
 * the number the game is scored on, because it is the one that says how much
 * a feature actually separates rather than how loud it looks.
 *
 * The split is the same seed and the same 80/20 as build-spam-bench.mjs, so
 * numbers on this page and numbers on the what-is-ai page describe the same
 * experiment and can be compared without a footnote.
 *
 * Input: data/raw/SMSSpamCollection — SMS Spam Collection v.1, not committed.
 *
 *   mkdir -p data/raw && cd data/raw
 *   curl -LO https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip
 *   unzip sms+spam+collection.zip
 *
 * Run: node data/scripts/build-features.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "data/raw/SMSSpamCollection");
const OUT = resolve(ROOT, "public/data/features.json");

/**
 * Candidate features, written as a person would describe them out loud.
 *
 * The set deliberately mixes obviously good ones with obviously plausible ones
 * that turn out to be nearly useless, because a game where every guess is
 * right teaches nothing. None of them were chosen after seeing the scores.
 */
const FEATURES = [
  {
    id: "shortcode",
    label: "Has a five digit number in it",
    plain: "Numbers like 87121, the short codes premium services reply to.",
    test: (t) => /\d{5,}/.test(t),
  },
  {
    id: "free",
    label: "Uses the word free",
    plain: "The word everybody thinks of first.",
    test: (t) => /\bfree\b/i.test(t),
  },
  {
    id: "money",
    label: "Mentions money",
    plain: "A currency symbol, or an amount in pounds.",
    test: (t) => /[£$]|\b\d+\s?(p|gbp|pounds?)\b/i.test(t),
  },
  {
    id: "prize",
    label: "Mentions winning something",
    plain: "Win, won, winner, prize, award, claim.",
    test: (t) => /\b(win|won|winner|prize|award(ed)?|claim)\b/i.test(t),
  },
  {
    id: "long",
    label: "Longer than 120 characters",
    plain: "Nothing about the words. Just how much of the screen it fills.",
    test: (t) => t.length > 120,
  },
  {
    id: "shouting",
    label: "Two or more shouted words",
    plain: "Three letters or more, all capitals, twice over.",
    test: (t) => (t.match(/\b[A-Z]{3,}\b/g) ?? []).length >= 2,
  },
  {
    id: "urgent",
    label: "Sounds urgent",
    plain: "Urgent, now, today, immediately, expires, last chance.",
    test: (t) => /\b(urgent|now|today|immediately|expires?|last chance)\b/i.test(t),
  },
  {
    id: "url",
    label: "Contains a web address",
    plain: "Anything with www, http or a dot com in it.",
    test: (t) => /\b(www\.|https?:\/\/|\.com\b|\.co\.uk\b)/i.test(t),
  },
  {
    id: "question",
    label: "Asks a question",
    plain: "Ends with, or contains, a question mark.",
    test: (t) => t.includes("?"),
  },
  {
    id: "smiley",
    label: "Has a smiley in it",
    plain: "The kind of thing a friend writes and a marketer does not.",
    test: (t) => /[:;]-?[)(dpDP]|\bx+\b/i.test(t),
  },
  {
    id: "reply",
    label: "Tells you to reply or call",
    plain: "An instruction, followed by digits.",
    test: (t) => /\b(txt|text|call|reply|sms)\b[^.]{0,24}?\d{4,}/i.test(t),
  },
  {
    id: "i",
    label: "Says I or me",
    plain: "Somebody talking about themselves.",
    test: (t) => /\b(i|me|my|i'm|im)\b/i.test(t),
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

const labels = messages.map((m) => (m.label === "spam" ? 1 : 0));

/** The same fixed-seed shuffle build-spam-bench.mjs uses, for the same split. */
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

console.log(
  `${messages.length} messages, ${labels.reduce((a, b) => a + b, 0)} spam · ` +
    `${trainIdx.length} train / ${testIdx.length} test`,
);

// ------------------------------------------------------------------ measures --

/** Entropy of a two-class split, in bits. Zero is a pure pile. */
function entropy(spam, total) {
  if (total === 0) return 0;
  const p = spam / total;
  if (p === 0 || p === 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

function measure(feature, idx) {
  let firesSpam = 0;
  let fires = 0;
  let quietSpam = 0;
  let quiet = 0;

  for (const i of idx) {
    if (feature.test(messages[i].body)) {
      fires++;
      firesSpam += labels[i];
    } else {
      quiet++;
      quietSpam += labels[i];
    }
  }

  const total = fires + quiet;
  const spam = firesSpam + quietSpam;
  const before = entropy(spam, total);
  const after =
    (fires / total) * entropy(firesSpam, fires) +
    (quiet / total) * entropy(quietSpam, quiet);

  return {
    fires,
    firesSpam,
    quiet,
    quietSpam,
    /** Share of the pile it catches that really is spam. */
    purity: fires === 0 ? 0 : firesSpam / fires,
    /** Share of the pile it leaves behind that is spam anyway. */
    leftoverRate: quiet === 0 ? 0 : quietSpam / quiet,
    /** Share of all the spam that this feature catches at all. */
    recall: spam === 0 ? 0 : firesSpam / spam,
    /** Bits of uncertainty removed. The number the game is scored on. */
    gain: Number((before - after).toFixed(5)),
  };
}

/** What using this one feature alone as the whole filter would score. */
function aloneOn(feature, idx) {
  let right = 0;
  for (const i of idx) {
    const predicted = feature.test(messages[i].body) ? 1 : 0;
    if (predicted === labels[i]) right++;
  }
  return Number((right / idx.length).toFixed(4));
}

const spamAll = labels.reduce((a, b) => a + b, 0);

const out = {
  generatedBy: "data/scripts/build-features.mjs",
  source: {
    name: "SMS Spam Collection v.1",
    authors: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  corpus: {
    total: messages.length,
    spam: spamAll,
    ham: messages.length - spamAll,
    trainSize: trainIdx.length,
    testSize: testIdx.length,
    split: "80/20, seeded, identical to spam-bench.json",
    baseEntropy: Number(entropy(spamAll, messages.length).toFixed(5)),
  },
  features: FEATURES.map((feature) => ({
    id: feature.id,
    label: feature.label,
    plain: feature.plain,
    train: measure(feature, trainIdx),
    test: measure(feature, testIdx),
    aloneAccuracy: aloneOn(feature, testIdx),
  })),
};

out.features.sort((a, b) => b.train.gain - a.train.gain);

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`);

console.log(`\nwrote ${OUT}`);
for (const f of out.features) {
  console.log(
    `${f.train.gain.toFixed(3)} bits  ${(f.train.purity * 100)
      .toFixed(1)
      .padStart(5)}% pure  ${f.label}`,
  );
}
