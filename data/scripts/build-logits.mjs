/**
 * Real next-token probabilities from a real language model.
 *
 * Runs DistilGPT-2 over a handful of prompts and records, for each one, the
 * top candidate tokens and the probability the model actually assigned them —
 * plus what those probabilities become at several sampling temperatures.
 *
 * Everything written out is a measurement. Nothing here is smoothed, rounded
 * for effect, or hand-picked to make a nicer curve: if a prompt produces a
 * boring flat distribution, the lesson gets a boring flat distribution, because
 * that is what the model did.
 *
 * Run with:  node data/scripts/build-logits.mjs
 * Output:    public/data/logits.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../public/data/logits.json");

const MODEL_ID = "Xenova/distilgpt2";

/** How many candidates to keep per prompt. */
const TOP_K = 12;

/** The dial the lesson lets you turn. 1.0 is the model's own distribution. */
const TEMPERATURES = [0.2, 0.5, 1, 1.5];

/**
 * Prompts chosen to span the range the lesson is about, and then kept
 * regardless of what came back. The `why` lines were written after the numbers
 * were measured, not before — two of these do the opposite of what you would
 * expect, and that is the most useful thing on the page.
 */
const PROMPTS = [
  {
    id: "memorised",
    text: "In the beginning God created the heaven and the",
    why: "Text the model has seen over and over. Almost the entire distribution lands on one token.",
  },
  {
    id: "certain",
    text: "The United States of",
    why: "Not memorised scripture, just an overwhelmingly common phrase. The effect is the same.",
  },
  {
    id: "torn",
    text: "I would like a cup of",
    why: "Two answers neck and neck. This is what a genuine coin-flip looks like from the inside — and you never see it in the reply.",
  },
  {
    id: "open",
    text: "Once upon a",
    why: "You expect a landslide here. There is not one. Being obvious to a person and being likely to a model are different things.",
  },
  {
    id: "fact",
    text: "Paris is the capital of",
    why: "The model is not looking anything up, so it continues the grammar rather than the fact. Watch where the correct answer actually ranks.",
  },
];

function softmax(values, temperature) {
  const scaled = values.map((v) => v / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

/** Shannon entropy in bits — how undecided the model is, in one number. */
function entropy(probabilities) {
  let sum = 0;
  for (const p of probabilities) {
    if (p > 0) sum -= p * Math.log2(p);
  }
  return sum;
}

const main = async () => {
  console.log(`Loading ${MODEL_ID} …`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp32",
  });

  const prompts = [];

  for (const prompt of PROMPTS) {
    const inputs = await tokenizer(prompt.text);
    const output = await model(inputs);

    const logits = output.logits;
    const [, positions, vocab] = logits.dims;
    const flat = logits.data;

    // The distribution over the next token is the last position's row.
    const offset = (positions - 1) * vocab;
    const row = Array.from(flat.slice(offset, offset + vocab));

    // Full-vocabulary softmax first, so the reported probabilities are the
    // model's real ones rather than a renormalised top-k.
    const full = softmax(row, 1);

    const ranked = row
      .map((logit, id) => ({ id, logit, p: full[id] }))
      .sort((a, b) => b.logit - a.logit)
      .slice(0, TOP_K);

    const tokens = ranked.map((entry) => ({
      id: entry.id,
      text: tokenizer.decode([entry.id]),
      logit: Number(entry.logit.toFixed(4)),
      probability: Number(entry.p.toFixed(6)),
    }));

    // What the same logits become once the temperature dial is turned. These
    // are renormalised over the kept candidates, which is stated in the lesson.
    const keptLogits = ranked.map((entry) => entry.logit);
    const byTemperature = {};
    for (const t of TEMPERATURES) {
      byTemperature[String(t)] = softmax(keptLogits, t).map((p) =>
        Number(p.toFixed(6)),
      );
    }

    const inputIds = Array.from(inputs.input_ids.data ?? []).map(Number);

    prompts.push({
      ...prompt,
      tokens: inputIds.map((id) => ({ id, text: tokenizer.decode([id]) })),
      candidates: tokens,
      byTemperature,
      topProbability: tokens[0].probability,
      /** Over the whole vocabulary, not just the candidates kept above. */
      entropyBits: Number(entropy(full).toFixed(4)),
      vocabSize: vocab,
    });

    console.log(
      `  ${prompt.id}: top “${tokens[0].text}” at ${(tokens[0].probability * 100).toFixed(1)}%, entropy ${prompts.at(-1).entropyBits} bits`,
    );
  }

  const payload = {
    generatedBy: "data/scripts/build-logits.mjs",
    model: {
      id: MODEL_ID,
      name: "DistilGPT-2",
      url: "https://huggingface.co/distilbert/distilgpt2",
      licence: "Apache 2.0",
      note: "A distilled, 82M-parameter version of GPT-2. Small enough to run honestly on a laptop, and wrong often enough to be instructive.",
    },
    topK: TOP_K,
    temperatures: TEMPERATURES,
    prompts,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${OUT}`);
};

main().catch((error) => {
  console.error("\nExtraction failed. Nothing was written.\n");
  console.error(error);
  process.exit(1);
});
