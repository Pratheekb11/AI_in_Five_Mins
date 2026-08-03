/**
 * Guessed, looked up, or calculated?
 *
 * The practical question this feeds is the one worth carrying out of the whole
 * site: for any given question, does the thing already know the answer, does it
 * need to be handed the source, or does it need a tool that can actually do the
 * work?
 *
 * That is measured three ways for every item.
 *
 *   BARE      the model is asked cold. Whatever probability it puts on the true
 *             answer is what it knows from training and nothing else.
 *   SOURCED   the same question with the relevant fact placed in front of it —
 *             the thing a search tool or a document upload actually does.
 *   TOOL      arithmetic, where handing it the sum does not help, because the
 *             work is not recall. Measured as accuracy over a sample of
 *             problems rather than asserted.
 *
 * The teaching is in the gaps. A fact it knows barely moves when you hand it a
 * source. A fact it does not know goes from nothing to near-certain. And
 * arithmetic does not respond to either, which is why calculators got bolted on.
 *
 * Facts cite Wikipedia and the article revision is recorded, so every claim can
 * be checked. A citation that does not resolve keeps its round off the board.
 *
 * Run with:  node data/scripts/build-provenance.mjs
 * Output:    public/data/provenance.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../public/data/provenance.json");

const MODEL_ID = "Xenova/distilgpt2";

/** Arithmetic problems to measure accuracy over. */
const SUMS = 200;
/** Seed, so a rerun produces the same problems and the same figure. */
const SEED = 20260803;

/**
 * Questions, with the source that answers them.
 *
 * Which bucket each one lands in is NOT written here. It is decided by the
 * measurement at the bottom of this file, because guessing in advance which
 * facts a model happens to know is exactly the mistake the game is about.
 */
const ITEMS = [
  {
    id: "usa-capital",
    ask: "What is the capital of the United States?",
    question: "The capital of the United States is",
    answer: " Washington",
    fact: "The capital of the United States is Washington, D.C.",
    article: "Washington, D.C.",
  },
  {
    id: "india-capital",
    ask: "What is the capital of India?",
    question: "The capital of India is New",
    answer: " Delhi",
    fact: "The capital of India is New Delhi.",
    article: "New Delhi",
  },
  {
    id: "australia-capital",
    ask: "What is the capital of Australia?",
    question: "The capital of Australia is",
    answer: " Canberra",
    fact: "The capital of Australia is Canberra.",
    article: "Canberra",
  },
  {
    id: "brazil-capital",
    ask: "What is the capital of Brazil?",
    question: "The capital of Brazil is",
    answer: " Brasilia",
    fact: "The capital of Brazil is Brasilia.",
    article: "Brasília",
  },
  {
    id: "photosynthesis",
    ask: "How do plants make their food?",
    question: "Plants make their own food by a process called",
    answer: " photosynthesis",
    fact: "Plants make their own food by a process called photosynthesis.",
    article: "Photosynthesis",
  },
  {
    id: "gravity",
    ask: "What holds the planets in orbit around the Sun?",
    question: "The force that keeps the planets in orbit around the Sun is",
    answer: " gravity",
    fact: "The force that keeps the planets in orbit around the Sun is gravity.",
    article: "Gravity",
  },
  {
    id: "penicillin",
    ask: "Who discovered penicillin?",
    question: "Penicillin was discovered by Alexander",
    answer: " Fleming",
    fact: "Penicillin was discovered by Alexander Fleming in 1928.",
    article: "Alexander Fleming",
  },
  {
    id: "everest",
    ask: "What is the highest mountain in the world?",
    question: "The highest mountain in the world is Mount",
    answer: " Everest",
    fact: "The highest mountain in the world is Mount Everest.",
    article: "Mount Everest",
  },
  {
    id: "longest-river",
    ask: "What is the longest river in Africa?",
    question: "The longest river in Africa is the",
    answer: " Nile",
    fact: "The longest river in Africa is the Nile.",
    article: "Nile",
  },
  {
    id: "relativity",
    ask: "Who published the theory of general relativity?",
    question: "The theory of general relativity was published by Albert",
    answer: " Einstein",
    fact: "The theory of general relativity was published by Albert Einstein in 1915.",
    article: "General relativity",
  },
  {
    id: "largest-planet",
    ask: "Which is the largest planet in the solar system?",
    question: "The largest planet in the solar system is",
    answer: " Jupiter",
    fact: "The largest planet in the solar system is Jupiter.",
    article: "Jupiter",
  },
  {
    id: "boiling",
    ask: "At what temperature does water boil at sea level?",
    question: "At sea level, water boils at one hundred degrees",
    answer: " Celsius",
    fact: "At sea level, water boils at one hundred degrees Celsius.",
    article: "Boiling point",
  },
];

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const main = async () => {
  console.log(`Loading ${MODEL_ID} …`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp32",
  });

  const idsOf = async (text) =>
    Array.from((await tokenizer(text)).input_ids.data ?? []).map(Number);

  /** Probability of the whole answer, teacher-forced. See build-context.mjs. */
  const score = async (context, answer) => {
    const contextIds = await idsOf(context);
    const fullIds = await idsOf(context + answer);
    for (let i = 0; i < contextIds.length; i++) {
      if (fullIds[i] !== contextIds[i]) {
        throw new Error(`Token boundary moved for ${JSON.stringify(answer)}.`);
      }
    }
    const answerIds = fullIds.slice(contextIds.length);

    const output = await model(await tokenizer(context + answer));
    const [, , vocab] = output.logits.dims;
    const flat = output.logits.data;

    let joint = 1;
    let topText = "";
    let rank = 0;

    for (let step = 0; step < answerIds.length; step++) {
      const at = contextIds.length - 1 + step;
      const row = Array.from(flat.slice(at * vocab, (at + 1) * vocab));
      joint *= softmax(row)[answerIds[step]];
      if (step === 0) {
        const ranked = row
          .map((logit, id) => ({ id, logit }))
          .sort((a, b) => b.logit - a.logit);
        rank = ranked.findIndex((c) => c.id === answerIds[0]);
        topText = tokenizer.decode([ranked[0].id]);
      }
    }
    return { probability: joint, topText, rank };
  };

  // ---------------------------------------------------------- the citations --

  const cited = new Map();
  for (const item of ITEMS) {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json" +
      "&formatversion=2&prop=revisions&rvprop=ids&redirects=1&titles=" +
      encodeURIComponent(item.article);
    let response;
    for (let attempt = 0; attempt < 6; attempt++) {
      response = await fetch(url, {
        headers: { "User-Agent": "LearnLoopAI/1.0 (educational)" },
      });
      if (response.status !== 429) break;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
    const page = response?.ok
      ? (await response.json())?.query?.pages?.[0]
      : null;
    if (!page || page.missing) {
      console.log(`  citation failed: ${item.article}`);
      continue;
    }
    cited.set(item.id, {
      title: page.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      revision: page.revisions?.[0]?.revid ?? null,
    });
    await new Promise((r) => setTimeout(r, 900));
  }

  // ------------------------------------------------------------- the rounds --

  const rounds = [];
  for (const item of ITEMS) {
    const citation = cited.get(item.id);
    if (!citation) {
      console.log(`  dropping ${item.id}: no verified citation.`);
      continue;
    }

    const bare = await score(item.question, item.answer);
    const sourced = await score(`${item.fact}\n${item.question}`, item.answer);

    // The bucket is decided here, by the measurement, not by anyone's hunch.
    // "Knows it" means the answer is already the model's own top choice.
    const knows = bare.rank === 0;

    rounds.push({
      id: item.id,
      kind: knows ? "memory" : "lookup",
      ask: item.ask,
      question: item.question,
      answerLabel: item.answer.trim(),
      answerTokens: (await idsOf(item.question + item.answer)).length -
        (await idsOf(item.question)).length,
      fact: item.fact,
      citation,
      bare: {
        probability: Number(bare.probability.toFixed(6)),
        rank: bare.rank,
        topText: bare.topText,
      },
      sourced: {
        probability: Number(sourced.probability.toFixed(6)),
        rank: sourced.rank,
        topText: sourced.topText,
      },
    });

    console.log(
      `  ${item.id.padEnd(20)} ${knows ? "MEMORY " : "LOOKUP "} ` +
        `bare ${(bare.probability * 100).toFixed(2)}% (rank ${bare.rank})  ` +
        `sourced ${(sourced.probability * 100).toFixed(2)}%`,
    );
  }

  // --------------------------------------------------------- the arithmetic --

  console.log(`\nMeasuring arithmetic over ${SUMS} problems …`);
  const random = seeded(SEED);
  let correct = 0;
  const examples = [];

  for (let i = 0; i < SUMS; i++) {
    const a = 10 + Math.floor(random() * 89);
    const b = 10 + Math.floor(random() * 89);
    const truth = String(a + b);
    const prompt = `${a} + ${b} =`;

    // Greedy continuation. Read long enough to see what it does instead of
    // arithmetic, because that turns out to be the interesting part: it
    // answers "41 + 45 =" with " 0.5%", having read the pattern as a table.
    let produced = "";
    let context = prompt;
    for (let step = 0; step < 5; step++) {
      const output = await model(await tokenizer(context));
      const [, positions, vocab] = output.logits.dims;
      const row = Array.from(
        output.logits.data.slice((positions - 1) * vocab, positions * vocab),
      );
      let bestId = 0;
      for (let id = 1; id < row.length; id++) if (row[id] > row[bestId]) bestId = id;
      const piece = tokenizer.decode([bestId]);
      produced += piece;
      context += piece;
    }

    const got = produced.trim().match(/^\d+/)?.[0] ?? "";
    const right = got === truth;
    if (right) correct += 1;
    if (examples.length < 12) {
      examples.push({
        prompt,
        truth,
        got: got || produced.trim(),
        raw: produced.replace(/\n/g, " ").trim(),
        right,
      });
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${SUMS}: ${correct} right so far`);
    }
  }

  const accuracy = correct / SUMS;
  console.log(
    `\nArithmetic: ${correct}/${SUMS} = ${(accuracy * 100).toFixed(1)}%`,
  );

  const payload = {
    generatedBy: "data/scripts/build-provenance.mjs",
    model: {
      id: MODEL_ID,
      name: "DistilGPT-2",
      url: "https://huggingface.co/distilbert/distilgpt2",
      licence: "Apache 2.0",
    },
    note: "Which bucket a question falls in was decided by the measurement, not chosen in advance. A question counts as known if the true answer is already the model's own first choice with no help.",
    arithmetic: {
      problems: SUMS,
      correct,
      accuracy: Number(accuracy.toFixed(4)),
      description:
        "Two-digit addition, seeded so the same problems come back on a rerun. The model is read greedily and its answer compared with the real sum.",
      examples,
    },
    rounds,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${OUT}: ${rounds.length} rounds.`);
};

main().catch((error) => {
  console.error("\nMeasurement failed. Nothing was written.\n");
  console.error(error);
  process.exit(1);
});
