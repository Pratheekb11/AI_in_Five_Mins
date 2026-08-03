/**
 * Show it, do not ask it.
 *
 * The usual advice about prompting is a list of things to say — give it a role,
 * state your constraints, be specific. Some of that works and some of it is
 * folklore, and you cannot tell which from the advice itself. So measure.
 *
 * Every item here is one goal with several phrasings. The goal is a specific
 * piece of text we want out of the model, and each phrasing is scored on the
 * probability the model actually produces it. Nothing is judged by eye.
 *
 * The finding, and it is consistent: polite requests do close to nothing to a
 * base model, and format does a great deal. "Answer in one word." is a wish.
 * "Q: … A:" is a pattern the model has seen a million times and can continue.
 * Asking is conversation; showing is delegation.
 *
 * This is worth saying plainly on the page. A base model has had no training
 * to follow instructions at all — that is a separate stage, and it is the whole
 * difference between this and the assistant you actually use. So what is being
 * measured is where the floor is: what works even on a model that is not
 * trying to please you.
 *
 * Run with:  node data/scripts/build-listen.mjs
 * Output:    public/data/listen.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../public/data/listen.json");

const MODEL_ID = "Xenova/distilgpt2";

/**
 * One goal, several phrasings.
 *
 * `style` records what each phrasing is an example of, so the game can group
 * the finding afterwards. It plays no part in the measurement.
 */
const ITEMS = [
  {
    id: "capital",
    goal: "Get it to answer with the city, and nothing else.",
    target: " Paris",
    variants: [
      { id: "bare", style: "bare", prompt: "What is the capital of France?" },
      { id: "polite", style: "request", prompt: "Please answer in one word. What is the capital of France?" },
      { id: "role", style: "role", prompt: "You are a helpful geography expert. What is the capital of France?" },
      { id: "qa", style: "pattern", prompt: "Q: What is the capital of Japan?\nA: Tokyo\nQ: What is the capital of France?\nA:" },
      { id: "colon", style: "pattern", prompt: "The capital of France is" },
    ],
  },
  {
    id: "translate",
    goal: "Get it to give the French word for cat.",
    target: " chat",
    variants: [
      { id: "bare", style: "bare", prompt: "How do you say cat in French?" },
      { id: "polite", style: "request", prompt: "Translate accurately and give only the word. How do you say cat in French?" },
      { id: "role", style: "role", prompt: "You are a professional French translator. How do you say cat in French?" },
      { id: "qa", style: "pattern", prompt: "English: dog\nFrench: chien\nEnglish: cat\nFrench:" },
      { id: "colon", style: "pattern", prompt: "The French word for cat is" },
    ],
  },
  {
    id: "opposite",
    goal: "Get it to give the opposite of hot.",
    target: " cold",
    variants: [
      { id: "bare", style: "bare", prompt: "What is the opposite of hot?" },
      { id: "polite", style: "request", prompt: "Reply with a single word and no explanation. What is the opposite of hot?" },
      { id: "role", style: "role", prompt: "You are an expert lexicographer. What is the opposite of hot?" },
      { id: "qa", style: "pattern", prompt: "Opposite of up: down\nOpposite of big: small\nOpposite of hot:" },
      { id: "colon", style: "pattern", prompt: "The opposite of hot is" },
    ],
  },
  {
    id: "plural",
    goal: "Get it to give the plural of mouse.",
    target: " mice",
    variants: [
      { id: "bare", style: "bare", prompt: "What is the plural of mouse?" },
      { id: "polite", style: "request", prompt: "Answer with just the plural form, nothing else. What is the plural of mouse?" },
      { id: "role", style: "role", prompt: "You are an English grammar teacher. What is the plural of mouse?" },
      { id: "qa", style: "pattern", prompt: "Singular: goose\nPlural: geese\nSingular: mouse\nPlural:" },
      { id: "colon", style: "pattern", prompt: "The plural of mouse is" },
    ],
  },
  {
    id: "colourof",
    goal: "Get it to say what colour the sky is.",
    target: " blue",
    variants: [
      { id: "bare", style: "bare", prompt: "What colour is the sky?" },
      { id: "polite", style: "request", prompt: "Answer in exactly one word. What colour is the sky?" },
      { id: "role", style: "role", prompt: "You are a careful scientist. What colour is the sky?" },
      { id: "qa", style: "pattern", prompt: "Q: What colour is grass?\nA: green\nQ: What colour is the sky?\nA:" },
      { id: "colon", style: "pattern", prompt: "The colour of the sky is" },
    ],
  },
  {
    id: "counting",
    goal: "Get it to say how many legs a spider has.",
    target: " eight",
    variants: [
      { id: "bare", style: "bare", prompt: "How many legs does a spider have?" },
      { id: "polite", style: "request", prompt: "Answer with the number word only. How many legs does a spider have?" },
      { id: "role", style: "role", prompt: "You are a biologist. How many legs does a spider have?" },
      { id: "qa", style: "pattern", prompt: "Q: How many legs does a dog have?\nA: four\nQ: How many legs does a spider have?\nA:" },
      { id: "colon", style: "pattern", prompt: "A spider has" },
    ],
  },
];

export const STYLES = {
  bare: "Just the question",
  request: "The question, plus an instruction about how to answer",
  role: "The question, plus a role to play",
  pattern: "The same thing shown as a pattern to continue",
};

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

const main = async () => {
  console.log(`Loading ${MODEL_ID} …`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp32",
  });

  const idsOf = async (text) =>
    Array.from((await tokenizer(text)).input_ids.data ?? []).map(Number);

  const score = async (prompt, target) => {
    const promptIds = await idsOf(prompt);
    const fullIds = await idsOf(prompt + target);
    for (let i = 0; i < promptIds.length; i++) {
      if (fullIds[i] !== promptIds[i]) {
        throw new Error(`Token boundary moved for ${JSON.stringify(target)}.`);
      }
    }
    const targetIds = fullIds.slice(promptIds.length);

    const output = await model(await tokenizer(prompt + target));
    const [, , vocab] = output.logits.dims;
    const flat = output.logits.data;

    let joint = 1;
    let topText = "";
    let rank = 0;

    for (let step = 0; step < targetIds.length; step++) {
      const at = promptIds.length - 1 + step;
      const row = Array.from(flat.slice(at * vocab, (at + 1) * vocab));
      joint *= softmax(row)[targetIds[step]];
      if (step === 0) {
        const ranked = row
          .map((logit, id) => ({ id, logit }))
          .sort((a, b) => b.logit - a.logit);
        rank = ranked.findIndex((c) => c.id === targetIds[0]);
        topText = tokenizer.decode([ranked[0].id]);
      }
    }
    return { probability: joint, rank, topText };
  };

  const rounds = [];

  for (const item of ITEMS) {
    const variants = [];
    for (const variant of item.variants) {
      const result = await score(variant.prompt, item.target);
      variants.push({
        ...variant,
        probability: Number(result.probability.toFixed(8)),
        rank: result.rank,
        topText: result.topText,
      });
      console.log(
        `  ${item.id.padEnd(10)} ${variant.id.padEnd(8)} ` +
          `${(result.probability * 100).toFixed(3)}%  rank ${result.rank}  ` +
          `says ${JSON.stringify(result.topText)}`,
      );
    }

    const best = variants.reduce((a, b) => (b.probability > a.probability ? b : a));
    rounds.push({
      ...item,
      variants,
      best: best.id,
      bestStyle: best.style,
    });
    console.log(`  -> best: ${best.id} (${best.style})\n`);
  }

  // The headline, computed rather than claimed.
  const byStyle = {};
  for (const round of rounds) {
    for (const variant of round.variants) {
      byStyle[variant.style] ??= [];
      // How much better than just asking the question, in multiples.
      const bare = round.variants.find((v) => v.style === "bare");
      byStyle[variant.style].push(
        bare && bare.probability > 0 ? variant.probability / bare.probability : 0,
      );
    }
  }
  const summary = Object.entries(byStyle).map(([style, values]) => ({
    style,
    label: STYLES[style],
    medianTimesBare: Number(
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)].toFixed(2),
    ),
    wins: rounds.filter((r) => r.bestStyle === style).length,
  }));

  console.log("How each style did, against just asking the question:");
  for (const row of summary) {
    console.log(
      `  ${row.style.padEnd(9)} median ${row.medianTimesBare}x  best on ${row.wins}/${rounds.length}`,
    );
  }

  const payload = {
    generatedBy: "data/scripts/build-listen.mjs",
    model: {
      id: MODEL_ID,
      name: "DistilGPT-2",
      url: "https://huggingface.co/distilbert/distilgpt2",
      licence: "Apache 2.0",
      note: "A base model. It has had no training to follow instructions — that is a separate stage, and it is the difference between this and the assistant you use. What is measured here is the floor: what works even on a model that is not trying to please you.",
    },
    styles: STYLES,
    summary,
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
