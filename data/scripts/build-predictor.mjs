/**
 * Beat the Predictor — real rounds, real odds.
 *
 * Two kinds of round, and both of them have ground truth that does not depend
 * on anybody's opinion.
 *
 * CORPUS rounds come from Alice's Adventures in Wonderland, which is public
 * domain and sitting in `data/raw`. A sentence is cut before its last word, the
 * model is asked what comes next, and the right answer is simply what Carroll
 * wrote. The three wrong options are not invented — they are the model's own
 * next-best candidates, so every option on screen is a word the model seriously
 * considered.
 *
 * FACT rounds are prompts where the likeliest continuation and the true one
 * come apart. The right answer is a checkable fact, cited in the output. These
 * are the rounds that teach hallucination: the model is not lying, it is
 * finishing a sentence, and the shape of the sentence beats the fact.
 *
 * Nothing here is filtered for looking good. Rounds are selected by how far
 * apart the model and the truth are, spanning the whole range, because a game
 * where the model is always wrong teaches as little as one where it is always
 * right.
 *
 * Run with:  node data/scripts/build-predictor.mjs
 * Output:    public/data/predictor.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";

const HERE = dirname(fileURLToPath(import.meta.url));
const ALICE = resolve(HERE, "../raw/alice.txt");
const OUT = resolve(HERE, "../../public/data/predictor.json");

const MODEL_ID = "Xenova/distilgpt2";
const OPTIONS = 4;
/** How many candidate sentences to measure before choosing the round set. */
const SAMPLE = 400;
/** How many corpus rounds to keep, spread across the difficulty range. */
const KEEP = 40;
/** How deep into the model's ranking a round may draw its wrong options. */
const FIELD = 60;

/**
 * Prompts where being likely and being right are different things.
 *
 * The fact and its source are written here; the probabilities are measured.
 * If a prompt turns out not to trap the model, it is dropped rather than
 * dressed up — see the filter below.
 */
const PHRASE_PROMPTS = [
  { id: "usa", text: "The United States of", truth: " America" },
  { id: "genesis", text: "In the beginning God created the heaven and the", truth: " earth" },
  { id: "york", text: "The Statue of Liberty stands in New", truth: " York" },
  { id: "once", text: "It was raining, so she opened her", truth: " umbrella" },
  { id: "birthday", text: "He blew out the candles on his birthday", truth: " cake" },
  { id: "doctor", text: "She felt ill, so she went to see the", truth: " doctor" },
  { id: "keys", text: "He could not start the car because he had lost his", truth: " keys" },
  { id: "coffee", text: "She could not wake up properly without a cup of", truth: " coffee" },
  { id: "letter", text: "She sealed the envelope and put on a", truth: " stamp" },
  { id: "shoes", text: "Before going into the temple, everyone took off their", truth: " shoes" },
  { id: "library", text: "He wanted a quiet place to study, so he went to the", truth: " library" },
  { id: "teeth", text: "Every night before bed he brushes his", truth: " teeth" },
  { id: "airport", text: "They arrived two hours early at the", truth: " airport" },
  { id: "kettle", text: "She filled the kettle and switched it", truth: " on" },
  { id: "window", text: "The room was stuffy, so he opened the", truth: " window" },
  { id: "guitar", text: "He picked up the guitar and began to", truth: " play" },
  { id: "monday", text: "The day after Sunday is", truth: " Monday" },
  { id: "winter", text: "The coldest season of the year is", truth: " winter" },
  { id: "salt", text: "The soup was bland, so she added a little", truth: " salt" },
  { id: "bicycle", text: "He was late, so he rode to school on his", truth: " bicycle" },
];

const FACT_PROMPTS = [
  { id: "paris", text: "Paris is the capital of", truth: " France",
    fact: "Paris is the capital of France.",
    article: "Paris" },
  { id: "everest", text: "The highest mountain in the world is Mount", truth: " Everest",
    fact: "Mount Everest is the highest mountain above sea level.",
    article: "Mount Everest" },
  { id: "planet", text: "The largest planet in the solar system is", truth: " Jupiter",
    fact: "Jupiter is the largest planet in the Solar System.",
    article: "Jupiter" },
  { id: "moon", text: "The first person to walk on the Moon was Neil", truth: " Armstrong",
    fact: "Neil Armstrong was the first person to walk on the Moon, in July 1969.",
    article: "Neil Armstrong" },
  { id: "boil", text: "At sea level, water boils at one hundred degrees", truth: " Celsius",
    fact: "Water boils at 100 degrees Celsius at standard atmospheric pressure.",
    article: "Boiling point" },
  { id: "author", text: "Alice's Adventures in Wonderland was written by Lewis", truth: " Carroll",
    fact: "Alice's Adventures in Wonderland was written by Lewis Carroll.",
    article: "Alice's Adventures in Wonderland" },
  { id: "delhi", text: "The capital of India is New", truth: " Delhi",
    fact: "New Delhi is the capital of India.",
    article: "New Delhi" },
  { id: "tokyo", text: "The capital of Japan is", truth: " Tokyo",
    fact: "Tokyo is the capital of Japan.",
    article: "Tokyo" },
  { id: "canberra", text: "The capital of Australia is", truth: " Canberra",
    fact: "Canberra is the capital of Australia, not Sydney, which is the largest city.",
    article: "Canberra" },
  { id: "brasilia", text: "The capital of Brazil is", truth: " Bras",
    fact: "Brasília is the capital of Brazil, not Rio de Janeiro, which was the capital until 1960.",
    article: "Brasília" },
  { id: "ottawa", text: "The capital of Canada is", truth: " Ottawa",
    fact: "Ottawa is the capital of Canada, not Toronto, which is the largest city.",
    article: "Ottawa" },
  { id: "nile", text: "The longest river in Africa is the", truth: " Nile",
    fact: "The Nile is the longest river in Africa.",
    article: "Nile" },
  { id: "ocean", text: "The largest ocean on Earth is the", truth: " Pacific",
    fact: "The Pacific is the largest and deepest of Earth's oceans.",
    article: "Pacific Ocean" },
  { id: "relativity", text: "The theory of general relativity was published by Albert", truth: " Einstein",
    fact: "Albert Einstein published the general theory of relativity in 1915.",
    article: "General relativity" },
  { id: "penicillin", text: "Penicillin was discovered by Alexander", truth: " Fleming",
    fact: "Alexander Fleming discovered penicillin in 1928.",
    article: "Alexander Fleming" },
  { id: "gravity", text: "The force that keeps the planets in orbit around the Sun is", truth: " gravity",
    fact: "Gravity holds the planets in orbit around the Sun.",
    article: "Gravity" },
  { id: "photosynthesis", text: "Plants make their own food by a process called", truth: " photos",
    fact: "Plants make food from light by photosynthesis.",
    article: "Photosynthesis" },
  { id: "sun", text: "The star at the centre of our solar system is called the", truth: " Sun",
    fact: "The Sun is the star at the centre of the Solar System.",
    article: "Sun" },
];

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

/** Deterministic shuffle, so a rerun produces a byte-identical file. */
function seededShuffle(items, seed) {
  const out = [...items];
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/**
 * Sentences from Alice, cleaned of the Gutenberg wrapper and of anything that
 * would make a bad round — too short to give the model a chance, too long to
 * print, or ending on punctuation rather than a word.
 */
function sentencesFrom(text) {
  const start = text.indexOf("CHAPTER I.");
  const end = text.indexOf("THE END");
  const body = text.slice(start > 0 ? start : 0, end > 0 ? end : text.length);

  return body
    .replace(/\r/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => {
      if (s.length < 40 || s.length > 190) return false;
      if (!/^[A-Z]/.test(s)) return false;
      if (/["_*\[\]]/.test(s)) return false;
      if (/CHAPTER|Gutenberg|PROJECT/i.test(s)) return false;
      // Must end "… word." so there is a single word to blank.
      return /\s[a-z]{4,}\.$/.test(s);
    });
}

const main = async () => {
  console.log(`Loading ${MODEL_ID} …`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp32",
  });

  /** Runs the model and returns the full next-token distribution. */
  const distribution = async (text) => {
    const inputs = await tokenizer(text);
    const output = await model(inputs);
    const [, positions, vocab] = output.logits.dims;
    const offset = (positions - 1) * vocab;
    const row = Array.from(output.logits.data.slice(offset, offset + vocab));
    return { probabilities: softmax(row), vocab };
  };

  const raw = readFileSync(ALICE, "utf8");
  const pool = seededShuffle(sentencesFrom(raw), 20260803).slice(0, SAMPLE);
  console.log(`${pool.length} candidate sentences from Alice.`);

  const measured = [];

  for (const sentence of pool) {
    const withoutStop = sentence.slice(0, -1);
    const cut = withoutStop.lastIndexOf(" ");
    const prefix = withoutStop.slice(0, cut);
    const answer = withoutStop.slice(cut); // keeps the leading space

    // Only single-token answers, so "the right answer" is one thing the model
    // could have put its whole weight on rather than a multi-step guess.
    const answerIds = Array.from(
      (await tokenizer(answer)).input_ids.data ?? [],
    ).map(Number);
    if (answerIds.length !== 1) continue;
    const answerId = answerIds[0];

    const { probabilities } = await distribution(prefix);
    const truthP = probabilities[answerId];

    const ranked = probabilities
      .map((p, id) => ({ id, p }))
      .sort((a, b) => b.p - a.p);
    const rank = ranked.findIndex((c) => c.id === answerId);

    // Candidates the model seriously considered, kept deep enough to build
    // both a hard round and a fair one out of the same sentence.
    const pool = ranked
      .filter((c) => c.id !== answerId)
      .slice(0, FIELD)
      .map((c) => ({
        id: c.id,
        text: tokenizer.decode([c.id]),
        probability: c.p,
      }))
      .filter(
        (d) => d.text.trim().toLowerCase() !== answer.trim().toLowerCase(),
      )
      // Whole words only. The tail of the ranking is full of subword scraps
      // like " SS" and " re", and putting those on screen would make the game
      // trivially easy for the wrong reason.
      .filter((d) => /^ ?[a-z]{3,}$/i.test(d.text));

    if (pool.length < OPTIONS - 1) continue;

    measured.push({
      kind: "corpus",
      prefix,
      answer: { id: answerId, text: answer, probability: truthP },
      answerRank: rank,
      pool,
      topProbability: ranked[0].p,
    });

    if (measured.length % 25 === 0) {
      console.log(`  measured ${measured.length}…`);
    }
  }

  console.log(`${measured.length} usable corpus sentences.`);

  // Spread the kept rounds across the range of how well the model did, so the
  // game is not a run of gimmes or a run of impossibilities.
  const sorted = [...measured].sort(
    (a, b) => a.answer.probability - b.answer.probability,
  );
  // Evenly across the whole range, ends included. Stepping by a fixed stride
  // silently truncated the top of the list and produced a set where the model
  // lost almost every round, which is its own kind of lie.
  const want = Math.min(KEEP, sorted.length);
  const chosen = [];
  for (let i = 0; i < want; i++) {
    chosen.push(sorted[Math.round((i * (sorted.length - 1)) / (want - 1))]);
  }

  const corpusRounds = chosen.map((m, i) => {
    // Alternating fields, so the round set is a genuine contest rather than a
    // rigged one. HARD rounds put the model's three favourite tokens against
    // the truth and the model nearly always takes them. FAIR rounds draw the
    // three from further down its own ranking, where the truth stands a
    // chance of being the model's pick too. Every option in both is a token
    // the model actually considered — nothing is invented for either.
    // The model's own three favourite continuations. It will take one of them
    // nearly every time, and the word Carroll wrote is nearly never among
    // them — which is the whole point of this act.
    const field = m.pool.slice(0, OPTIONS - 1);
    if (new Set(field.map((d) => d.id)).size < OPTIONS - 1) return null;

    const options = seededShuffle(
      [
        { text: m.answer.text, probability: m.answer.probability, truth: true },
        ...field.map((d) => ({
          text: d.text,
          probability: d.probability,
          truth: false,
        })),
      ],
      20260803 + i,
    );
    const modelPick = options.reduce(
      (best, o, at) => (o.probability > options[best].probability ? at : best),
      0,
    );
    return {
      id: `alice-${i}`,
      kind: "corpus",
      prefix: m.prefix,
      options: options.map((o) => ({
        text: o.text,
        probability: Number(o.probability.toFixed(6)),
      })),
      truth: options.findIndex((o) => o.truth),
      modelPick,
      /** Where the true word sat in the model's whole 50,257-token ranking. */
      answerRank: m.answerRank,
      because:
        "The right answer is the word Lewis Carroll actually wrote. The other three are tokens the model itself ranked highly for this sentence.",
    };
  }).filter(Boolean);

  // ---------------------------------------------------------- phrase rounds --

  /**
   * Builds one round from a prompt whose answer is known in advance.
   *
   * Shared by the phrase and fact acts. Wrong options are the model's own top
   * candidates, minus anything that is the answer wearing different clothes.
   */
  const roundFor = async (prompt, seed) => {
    const truthIds = Array.from(
      (await tokenizer(prompt.truth)).input_ids.data ?? [],
    ).map(Number);
    if (truthIds.length !== 1) return null;
    const truthId = truthIds[0];

    const { probabilities } = await distribution(prompt.text);
    const ranked = probabilities
      .map((p, id) => ({ id, p }))
      .sort((a, b) => b.p - a.p);
    const rank = ranked.findIndex((c) => c.id === truthId);

    const field = ranked
      .filter((c) => c.id !== truthId)
      .map((c) => ({ text: tokenizer.decode([c.id]), probability: c.p }))
      .filter(
        (d) =>
          d.text.trim().toLowerCase() !== prompt.truth.trim().toLowerCase() &&
          /^ ?[a-z]{3,}$/i.test(d.text),
      )
      .slice(0, OPTIONS - 1);
    if (field.length < OPTIONS - 1) return null;

    const options = seededShuffle(
      [
        { text: prompt.truth, probability: probabilities[truthId], truth: true },
        ...field.map((d) => ({ ...d, truth: false })),
      ],
      seed,
    );
    const truth = options.findIndex((o) => o.truth);
    const modelPick = options.reduce(
      (best, o, at) => (o.probability > options[best].probability ? at : best),
      0,
    );

    return {
      id: prompt.id,
      prefix: prompt.text,
      options: options.map((o) => ({
        text: o.text,
        probability: Number(o.probability.toFixed(6)),
      })),
      truth,
      modelPick,
      answerRank: rank,
      trapped: modelPick !== truth,
    };
  };

  const phraseRounds = [];
  for (const prompt of PHRASE_PROMPTS) {
    const round = await roundFor(prompt, 20260803 + phraseRounds.length);
    if (!round) {
      console.log(`  skipping ${prompt.id}: no clean round.`);
      continue;
    }
    phraseRounds.push({
      ...round,
      kind: "phrase",
      because:
        "The right answer is the ordinary completion of an extremely common phrase, which is exactly the territory where a next-word predictor is strong.",
    });
    console.log(
      `  ${prompt.id}: truth rank ${round.answerRank} at ${(round.options[round.truth].probability * 100).toFixed(1)}%${round.trapped ? "  <- model misses" : "  <- model wins"}`,
    );
  }

  // ------------------------------------------------------------ fact rounds --

  // Provenance is checked, not assumed.
  //
  // Every fact cites a Wikipedia article, and the article is looked up through
  // the API so the exact revision the claim was checked against is recorded.
  // A citation that does not resolve keeps its round off the board, and the run
  // says which one was dropped. An earlier version pointed at Britannica, which
  // answers non-browser requests with 403 — a citation nobody can verify
  // programmatically is not much of a citation.
  const cited = new Map();
  for (const prompt of FACT_PROMPTS) {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json" +
      "&formatversion=2&prop=revisions&rvprop=ids&redirects=1&titles=" +
      encodeURIComponent(prompt.article);
    try {
      let response;
      for (let attempt = 0; attempt < 6; attempt++) {
        response = await fetch(url, {
          headers: { "User-Agent": "LearnLoopAI/1.0 (educational)" },
        });
        if (response.status !== 429) break;
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      }
      if (!response || !response.ok) {
        console.log(`  citation lookup failed (${response?.status}): ${prompt.article}`);
        continue;
      }
      const page = (await response.json())?.query?.pages?.[0];
      if (!page || page.missing) {
        console.log(`  no such article: ${prompt.article}`);
        continue;
      }
      cited.set(prompt.id, {
        title: page.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        revision: page.revisions?.[0]?.revid ?? null,
      });
      await new Promise((r) => setTimeout(r, 900));
    } catch {
      console.log(`  citation lookup failed: ${prompt.article}`);
    }
  }

  const factRounds = [];
  for (const prompt of FACT_PROMPTS) {
    const citation = cited.get(prompt.id);
    if (!citation) {
      console.log(`  dropping ${prompt.id}: citation did not check out.`);
      continue;
    }
    const round = await roundFor(prompt, 20260803 + 100 + factRounds.length);
    if (!round) {
      console.log(`  skipping ${prompt.id}: no clean round.`);
      continue;
    }
    factRounds.push({
      ...round,
      kind: "fact",
      fact: prompt.fact,
      citation,
      because:
        "The right answer is a checkable fact, cited below. The other three are the model's own likeliest continuations.",
    });
    console.log(
      `  ${prompt.id}: truth rank ${round.answerRank} at ${(round.options[round.truth].probability * 100).toFixed(2)}%${round.trapped ? "  <- trap" : ""}`,
    );
  }

  const payload = {
    generatedBy: "data/scripts/build-predictor.mjs",
    model: {
      id: MODEL_ID,
      name: "DistilGPT-2",
      url: "https://huggingface.co/distilbert/distilgpt2",
      licence: "Apache 2.0",
      note: "82 million parameters. Small enough to run honestly on a laptop, and wrong often enough to be instructive.",
    },
    corpus: {
      name: "Alice's Adventures in Wonderland",
      author: "Lewis Carroll",
      url: "https://www.gutenberg.org/ebooks/11",
      licence: "Public domain",
    },
    optionCount: OPTIONS,
    measuredSentences: measured.length,
    rounds: [...phraseRounds, ...corpusRounds, ...factRounds],
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `\nWrote ${OUT}: ${phraseRounds.length} phrase, ${corpusRounds.length} corpus, ${factRounds.length} fact.`,
  );
};

main().catch((error) => {
  console.error("\nExtraction failed. Nothing was written.\n");
  console.error(error);
  process.exit(1);
});
