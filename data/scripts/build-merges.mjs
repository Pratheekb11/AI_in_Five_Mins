/**
 * Generates public/data/merges.json
 *
 * The tokens module used to assert that a word "gets chopped into chunks the
 * model had memorised" and then show the finished chunks. That is the answer
 * without the working. This file produces the working: the actual sequence of
 * byte-pair merges o200k_base performs, in order, so the module can play it
 * back one merge at a time.
 *
 * Nothing here is a reconstruction of what BPE probably does. tiktoken's merge
 * table IS a rank table — the id of a token is its rank, and the algorithm
 * repeatedly merges whichever adjacent pair produces the lowest-ranked token in
 * the vocabulary. So replaying it needs no model and no guesswork: read the
 * ranks, run the same loop, and you get the same answer the tokenizer gets.
 *
 * Which is exactly what the check at the end asserts. Every trace is re-encoded
 * with the real tokenizer and compared id for id. A word whose replay disagrees
 * is not written out with a caveat — the script throws, because a merge
 * sequence that does not reproduce the tokenizer is not evidence of anything.
 *
 * Run: node data/scripts/build-merges.mjs
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "gpt-tokenizer/encoding/o200k_base";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RANKS = resolve(ROOT, "node_modules/gpt-tokenizer/data/o200k_base.tiktoken");
const OUT = resolve(ROOT, "public/data/merges.json");

/**
 * The words traced, and why each one is worth a trace.
 *
 * Every one of these is a single pre-token — one regex chunk — because that is
 * the unit BPE actually runs on. Feeding it a phrase would silently trace
 * something the tokenizer never does in one piece.
 */
const WORDS = [
  {
    word: "strawberry",
    teaches:
      "The word behind the letter-counting failure. Three chunks, none of which is a letter.",
  },
  {
    word: " strawberry",
    teaches:
      "The same word with a leading space. The space is part of the token, and the whole thing collapses to one.",
  },
  {
    word: "unbelievable",
    teaches:
      "A long word that is still cheap, because its parts are common.",
  },
  {
    word: "Ashwatthama",
    teaches:
      "A rare proper noun. Nothing here was worth memorising, so it shatters.",
  },
  {
    word: "hallucination",
    teaches:
      "A word this whole site uses constantly, and the tokenizer still does not know it in one piece.",
  },
];

/**
 * Numbers are handled separately, and deliberately not traced.
 *
 * BPE runs on pre-tokens — the chunks a regex cuts the text into first — and
 * o200k's regex breaks a run of digits into groups of at most three. So a long
 * number is never one merge problem, it is several, and replaying it as one
 * produces a split the tokenizer disagrees with. The first version of this
 * script did exactly that and the check below caught it, which is the only
 * reason the check exists.
 *
 * These therefore come straight from the tokenizer, with no replay.
 */
const NUMBERS = ["7", "2024", "3141592", "1000000"];

/** latin1 keeps one byte per character, so a byte string can index a Map. */
const bytesToKey = (bytes) => String.fromCharCode(...bytes);

const utf8 = new TextDecoder("utf-8", { fatal: false });

/** A byte string back to something printable. Lone bytes of a multi-byte
 *  character decode to the replacement character, which is honest: at that
 *  point in the merge the tokenizer really is holding half a character. */
function keyToText(key) {
  const bytes = Uint8Array.from(key, (c) => c.charCodeAt(0));
  return utf8.decode(bytes);
}

async function loadRanks() {
  const text = await readFile(RANKS, "utf8");
  const ranks = new Map();
  const byId = new Map();
  for (const line of text.split("\n")) {
    if (!line) continue;
    const [b64, rank] = line.split(" ");
    const key = bytesToKey(Buffer.from(b64, "base64"));
    ranks.set(key, Number(rank));
    byId.set(Number(rank), key);
  }
  return { ranks, byId };
}

/**
 * tiktoken's byte_pair_merge, with the working shown.
 *
 * Start with one piece per byte. Repeatedly find the adjacent pair whose
 * concatenation is in the vocabulary with the lowest rank, and merge it. Stop
 * when no adjacent pair is in the vocabulary at all.
 */
function trace(word, ranks) {
  let pieces = [...Buffer.from(word, "utf8")].map((b) => String.fromCharCode(b));
  const steps = [];

  for (;;) {
    let bestAt = -1;
    let bestRank = Infinity;
    for (let i = 0; i < pieces.length - 1; i++) {
      const rank = ranks.get(pieces[i] + pieces[i + 1]);
      if (rank !== undefined && rank < bestRank) {
        bestRank = rank;
        bestAt = i;
      }
    }
    if (bestAt < 0) break;

    const merged = pieces[bestAt] + pieces[bestAt + 1];
    steps.push({
      /** Where the join happens, as an index into the pieces before this step. */
      at: bestAt,
      left: keyToText(pieces[bestAt]),
      right: keyToText(pieces[bestAt + 1]),
      into: keyToText(merged),
      /** Rank and id are the same number in tiktoken. Lower means it was
       *  worth memorising earlier — i.e. it is more common in the text the
       *  table was built from. */
      id: bestRank,
      pieces: pieces.map(keyToText),
    });
    pieces = [
      ...pieces.slice(0, bestAt),
      merged,
      ...pieces.slice(bestAt + 2),
    ];
  }

  const ids = pieces.map((p) => {
    const id = ranks.get(p);
    if (id === undefined) throw new Error(`no id for final piece of "${word}"`);
    return id;
  });

  return { steps, final: pieces.map(keyToText), ids };
}

const { ranks, byId: idToKey } = await loadRanks();
console.log(`ranks loaded: ${ranks.size.toLocaleString("en-US")}`);

const traces = WORDS.map(({ word, teaches }) => {
  const { steps, final, ids } = trace(word, ranks);

  // The check that makes this data worth showing. Replay must equal tokenizer.
  const expected = encode(word);
  if (expected.length !== ids.length || expected.some((id, i) => id !== ids[i])) {
    throw new Error(
      `replay disagrees with the tokenizer for "${word}": ` +
        `replay ${JSON.stringify(ids)} vs tiktoken ${JSON.stringify(expected)}`,
    );
  }

  console.log(
    `  ${JSON.stringify(word)} — ${Buffer.byteLength(word)} bytes, ` +
      `${steps.length} merges, ${final.length} tokens: ${final.join("|")}`,
  );

  return {
    word,
    teaches,
    bytes: Buffer.byteLength(word),
    /** Every piece the tokenizer starts from: one per byte. */
    start: [...Buffer.from(word, "utf8")].map((b) =>
      keyToText(String.fromCharCode(b)),
    ),
    steps,
    final,
    ids,
  };
});

const numbers = NUMBERS.map((text) => {
  const ids = encode(text);
  return {
    text,
    ids,
    pieces: ids.map((id) => keyToText(idToKey.get(id))),
  };
});
console.log(
  "\nnumbers: " +
    numbers.map((n) => `${n.text} -> ${n.pieces.join("|")}`).join(", "),
);

await mkdir(dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      encoding: "o200k_base",
      generatedBy: "data/scripts/build-merges.mjs",
      vocabularySize: ranks.size,
      note:
        "Each trace is tiktoken's own byte-pair merge loop replayed against the " +
        "published o200k_base rank table, then checked token-for-token against " +
        "the tokenizer's own output.",
      traces,
      numbers,
    },
    null,
    2,
  ) + "\n",
);

console.log(`\nwrote ${OUT}`);
