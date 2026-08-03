/**
 * One sentence, actually being written, one word at a time.
 *
 * The site's central claim is that a model reads what is there, scores what
 * could come next, takes one, sticks it on the end, and goes again. Showing
 * that with a handful of unrelated prompts does not demonstrate it — the
 * sentence has to visibly grow, or the loop is just a diagram with a spinner.
 *
 * So this records a real chain. A short seed goes in, the model is run, the top
 * candidates and their real probabilities are written down, the likeliest is
 * appended, and the whole thing runs again on the longer text. Every step in
 * the output is a real forward pass over the text the previous step produced.
 *
 * Greedy, not sampled, so a rerun gives exactly this file and anyone can check
 * it. The site says elsewhere — and measures — that real systems sample; that
 * is a different lesson and it has its own game.
 *
 * Run with:  node data/scripts/build-loop.mjs
 * Output:    public/data/loop.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../public/data/loop.json");

const MODEL_ID = "Xenova/distilgpt2";

/** Words to add per chain. Long enough to feel like writing, short enough to watch. */
const STEPS = 14;
/** Candidates shown at each step. The rest of the vocabulary is stated, not drawn. */
const TOP_K = 5;

/**
 * Seeds chosen to be ordinary. The point of this panel is the mechanism, not a
 * gotcha — there are three whole worlds of gotchas elsewhere.
 */
const SEEDS = [
  "The best thing about living in a small town is",
  "She opened the letter and",
  "The recipe is simple. First you",
];

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

/** Shannon entropy in bits — how spread out the guess was at this step. */
function entropy(probabilities) {
  let sum = 0;
  for (const p of probabilities) if (p > 0) sum -= p * Math.log2(p);
  return sum;
}

const main = async () => {
  console.log(`Loading ${MODEL_ID} …`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp32",
  });

  const chains = [];

  for (const seed of SEEDS) {
    console.log(`\n"${seed}"`);
    let text = seed;
    const steps = [];

    for (let i = 0; i < STEPS; i++) {
      const output = await model(await tokenizer(text));
      const [, positions, vocab] = output.logits.dims;
      const row = Array.from(
        output.logits.data.slice((positions - 1) * vocab, positions * vocab),
      );
      const full = softmax(row);

      const ranked = row
        .map((logit, id) => ({ id, p: full[id] }))
        .sort((a, b) => b.p - a.p)
        .slice(0, TOP_K)
        .map((c) => ({
          text: tokenizer.decode([c.id]),
          probability: Number(c.p.toFixed(6)),
        }));

      // Greedy: the one it thought likeliest is the one that gets appended.
      const taken = ranked[0];
      steps.push({
        // The text the model was looking at when it made this guess.
        before: text,
        candidates: ranked,
        taken: taken.text,
        entropyBits: Number(entropy(full).toFixed(3)),
      });

      text += taken.text;
      process.stdout.write(taken.text);
    }

    console.log("");
    chains.push({ seed, steps, final: text });
  }

  const payload = {
    generatedBy: "data/scripts/build-loop.mjs",
    model: {
      id: MODEL_ID,
      name: "DistilGPT-2",
      url: "https://huggingface.co/distilbert/distilgpt2",
      licence: "Apache 2.0",
    },
    note: "Each step is a real forward pass over the text the step before it produced. The likeliest token is appended every time, so a rerun reproduces this file exactly.",
    topK: TOP_K,
    vocabSize: 50257,
    chains,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${OUT}: ${chains.length} chains of ${STEPS} steps.`);
};

main().catch((error) => {
  console.error("\nGeneration failed. Nothing was written.\n");
  console.error(error);
  process.exit(1);
});
