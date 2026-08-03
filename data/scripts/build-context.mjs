/**
 * What goes in the window, and what it costs you.
 *
 * The game this feeds gives you five slots and a pile of cards — the question,
 * the document that actually contains the answer, some chit-chat, an
 * instruction that was superseded, and a decoy document that looks right and
 * says the wrong thing. You choose what goes in. Then you find out.
 *
 * "Find out" here is a real measurement, not a story. For every combination
 * the player can build, the model is actually run on that context and the
 * probability it puts on the correct answer is recorded. Adding the right
 * document sends that number up. Adding junk alongside it sends it down. That
 * second effect is the one nobody believes until they watch it, and it is the
 * whole reason the game exists.
 *
 * WHAT IS AUTHORED AND WHAT IS MEASURED. The cards are written by us — they
 * have to be, since no public dataset contains "a plausible-looking decoy memo
 * about a fictional company". The page says so. Every number attached to them
 * is measured by running DistilGPT-2 over the assembled context, and the answer
 * being scored is the one the relevant card states, so the ground truth comes
 * from the cards rather than from anybody's judgement.
 *
 * Run with:  node data/scripts/build-context.mjs
 * Output:    public/data/context.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../public/data/context.json");

const MODEL_ID = "Xenova/distilgpt2";

/** Slots in the window. The constraint is the entire lesson. */
const SLOTS = 5;

/**
 * Scenarios. Cards are authored; the `answer` is a single token so that "did
 * the context help" is one number rather than a judgement call.
 *
 * `kind` drives nothing in the measurement — it is only there so the game can
 * explain, afterwards, what each card was.
 */
const SCENARIOS = [
  {
    id: "invoice",
    ask: "Which invoice number should be quoted on the payment?",
    question: "The invoice number to quote on the payment is",
    answer: " QX-4471",
    answerLabel: "QX-4471",
    cards: [
      { id: "doc", kind: "relevant", label: "The invoice memo", text: "Memo: the invoice for the Marigold booking is numbered QX-4471 and is due on the 14th." },
      { id: "chat1", kind: "noise", label: "Chit-chat", text: "Mo: on my way, five minutes late, sorry all." },
      { id: "chat2", kind: "noise", label: "More chit-chat", text: "Sam: sounds good. Does anyone have the projector?" },
      { id: "stale", kind: "stale", label: "Superseded instruction", text: "Earlier instruction, now cancelled: quote invoice QX-9002 on everything." },
      { id: "decoy", kind: "decoy", label: "A similar memo", text: "Memo: the invoice for the Harbourside booking is numbered QX-8830 and is paid." },
      { id: "example", kind: "example", label: "An example of the format", text: "Example of a good answer: The invoice number to quote on the payment is QX-1234." },
      { id: "policy", kind: "noise", label: "Unrelated policy", text: "Reminder: expense claims must be submitted within thirty days of travel." },
    ],
  },
  {
    id: "wifi",
    ask: "What is the wifi code for the venue?",
    question: "The wifi code for the venue is",
    answer: " BLUEHERON",
    answerLabel: "BLUEHERON",
    cards: [
      { id: "doc", kind: "relevant", label: "The venue email", text: "From the venue: your wifi code for the whole weekend is BLUEHERON, all one word." },
      { id: "chat1", kind: "noise", label: "Chit-chat", text: "Dev: I have the adapter, do not worry about it." },
      { id: "chat2", kind: "noise", label: "More chit-chat", text: "Priya: thanks all, see you Thursday." },
      { id: "stale", kind: "stale", label: "Superseded instruction", text: "Old note, no longer valid: the wifi code was GREENFINCH last year." },
      { id: "decoy", kind: "decoy", label: "A similar email", text: "From the other venue: their wifi code is REDKITE, but we are not going there." },
      { id: "example", kind: "example", label: "An example of the format", text: "Example of a good answer: The wifi code for the venue is EXAMPLEWORD." },
      { id: "policy", kind: "noise", label: "Unrelated policy", text: "Reminder: the building closes to visitors at ten in the evening." },
    ],
  },
  {
    id: "platform",
    ask: "Which platform does the train leave from?",
    question: "The train leaves from platform",
    answer: " 9",
    answerLabel: "platform 9",
    cards: [
      { id: "doc", kind: "relevant", label: "The travel note", text: "Travel note: the train to the venue leaves from platform 9 at twenty past six." },
      { id: "chat1", kind: "noise", label: "Chit-chat", text: "Ruth: got it, thanks. Running five minutes late." },
      { id: "chat2", kind: "noise", label: "More chit-chat", text: "Mo: who is bringing the printed copies?" },
      { id: "stale", kind: "stale", label: "Superseded instruction", text: "Cancelled plan: we were going to take the train from platform 2." },
      { id: "decoy", kind: "decoy", label: "A similar note", text: "Travel note for the return trip: that train leaves from platform 6." },
      { id: "example", kind: "example", label: "An example of the format", text: "Example of a good answer: The train leaves from platform 4." },
      { id: "policy", kind: "noise", label: "Unrelated policy", text: "Reminder: keep your ticket until you have left the station." },
    ],
  },
];

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

/** Every subset of `items` with at most `max` members, as arrays of index. */
function subsetsUpTo(count, max) {
  const out = [];
  const walk = (start, chosen) => {
    out.push([...chosen]);
    if (chosen.length === max) return;
    for (let i = start; i < count; i++) {
      chosen.push(i);
      walk(i + 1, chosen);
      chosen.pop();
    }
  };
  walk(0, []);
  return out;
}

const main = async () => {
  console.log(`Loading ${MODEL_ID} …`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp32",
  });

  /**
   * The probability the model puts on the whole answer, not just its first
   * token.
   *
   * Scoring one token was a mistake worth recording: the invoice answer began
   * with "-", and any card that merely mentioned "QX-" made that token
   * near-certain, so a card containing none of the right information scored
   * 99.95%. The answer is teacher-forced through the model and the per-token
   * probabilities multiplied, which is the actual likelihood of the model
   * producing that answer.
   */
  const idsOf = async (text) =>
    Array.from((await tokenizer(text)).input_ids.data ?? []).map(Number);

  /**
   * The probability the model puts on the whole answer, not just its first
   * token.
   *
   * Scoring one token was a mistake worth recording: the invoice answer began
   * with "-", and any card that merely mentioned "QX-" made that token
   * near-certain, so a card carrying none of the right information scored
   * 99.95%. The answer is teacher-forced through the model and the per-token
   * probabilities multiplied, which is the actual likelihood of it producing
   * that answer.
   *
   * The context and the answer are tokenized together and the boundary is
   * checked rather than assumed — byte-pair encoding does not always split a
   * joined string where you spliced it, and a silent shift by one token would
   * quietly score the wrong thing.
   */
  const probabilityOf = async (context, answer) => {
    const contextIds = await idsOf(context);
    const fullIds = await idsOf(context + answer);

    for (let i = 0; i < contextIds.length; i++) {
      if (fullIds[i] !== contextIds[i]) {
        throw new Error(
          `Token boundary moved when the answer was appended, at ${i}. ` +
            `Context ends ${JSON.stringify(context.slice(-24))}.`,
        );
      }
    }
    const answerIds = fullIds.slice(contextIds.length);
    if (answerIds.length === 0) throw new Error("Answer tokenized to nothing.");

    const output = await model(await tokenizer(context + answer));
    const [, , vocab] = output.logits.dims;
    const flat = output.logits.data;

    let joint = 1;
    let firstRank = 0;
    let topText = "";
    let topProbability = 0;

    for (let step = 0; step < answerIds.length; step++) {
      // The row that predicts answer token `step` is the one before it.
      const at = contextIds.length - 1 + step;
      const row = Array.from(flat.slice(at * vocab, (at + 1) * vocab));
      const full = softmax(row);
      joint *= full[answerIds[step]];

      if (step === 0) {
        const ranked = row
          .map((logit, id) => ({ id, logit }))
          .sort((a, b) => b.logit - a.logit);
        firstRank = ranked.findIndex((c) => c.id === answerIds[0]);
        topText = tokenizer.decode([ranked[0].id]);
        topProbability = full[ranked[0].id];
      }
    }

    return {
      probability: joint,
      tokens: answerIds.length,
      rank: firstRank,
      topText,
      topProbability,
    };
  };

  const scenarios = [];

  for (const scenario of SCENARIOS) {

    const combinations = subsetsUpTo(scenario.cards.length, SLOTS);
    console.log(
      `${scenario.id}: ${combinations.length} combinations to measure …`,
    );

    const measured = [];
    for (const indices of combinations) {
      // Cards go in pool order regardless of the order they were picked, so
      // one combination is one number. Position effects are real and are a
      // separate lesson; conflating them here would make the game unreadable.
      const context =
        indices.map((i) => scenario.cards[i].text).join("\n") +
        (indices.length ? "\n" : "") +
        scenario.question;

      const result = await probabilityOf(context, scenario.answer);
      measured.push({
        tokens: result.tokens,
        cards: indices.map((i) => scenario.cards[i].id),
        probability: Number(result.probability.toFixed(6)),
        rank: result.rank,
        topText: result.topText,
        topProbability: Number(result.topProbability.toFixed(6)),
      });

      if (measured.length % 40 === 0) {
        console.log(`  ${measured.length}/${combinations.length}`);
      }
    }

    const empty = measured.find((m) => m.cards.length === 0);
    const best = measured.reduce((a, b) =>
      b.probability > a.probability ? b : a,
    );
    const docOnly = measured.find(
      (m) => m.cards.length === 1 && m.cards[0] === "doc",
    );

    console.log(
      `  nothing: ${(empty.probability * 100).toFixed(2)}%  ` +
        `document alone: ${(docOnly.probability * 100).toFixed(2)}%  ` +
        `best: ${(best.probability * 100).toFixed(2)}% with [${best.cards.join(", ")}]`,
    );

    scenarios.push({
      ...scenario,
      answerTokens: measured[0]?.tokens ?? 0,
      combinations: measured,
    });
  }

  const payload = {
    generatedBy: "data/scripts/build-context.mjs",
    model: {
      id: MODEL_ID,
      name: "DistilGPT-2",
      url: "https://huggingface.co/distilbert/distilgpt2",
      licence: "Apache 2.0",
    },
    slots: SLOTS,
    note: "The cards are written for the game. Every probability is measured by running the model on the context those cards make, and the answer being scored is the one the relevant card states.",
    scenarios,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
  console.log(`\nWrote ${OUT}`);
};

main().catch((error) => {
  console.error("\nMeasurement failed. Nothing was written.\n");
  console.error(error);
  process.exit(1);
});
