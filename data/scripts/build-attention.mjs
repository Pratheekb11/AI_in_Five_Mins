/**
 * Real attention weights, extracted from DistilGPT-2's published parameters.
 *
 * The ONNX build of this model does not expose attention, so this script runs
 * the forward pass itself, straight out of the safetensors file: embeddings,
 * layer norm, the QKV projection, the causal mask, softmax, the MLP, the lot.
 * The attention matrices it records are therefore the model's own, not an
 * illustration of what attention might look like.
 *
 * That is a strong claim, so the script checks itself. After the forward pass
 * it compares its own next-token logits against the same model run through
 * @huggingface/transformers. If the two disagree beyond a tight tolerance the
 * script writes nothing and exits non-zero, because a plausible-looking
 * attention map that came out of a buggy matrix multiply is exactly the kind
 * of invented data this project refuses to ship.
 *
 * Run with:  node data/scripts/build-attention.mjs
 * Needs:     data/raw/distilgpt2.safetensors  (see data/PROVENANCE.md)
 * Output:    public/data/attention.json
 */

import { openSync, readSync, closeSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AutoModelForCausalLM, AutoTokenizer } from "@huggingface/transformers";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEIGHTS = resolve(HERE, "../raw/distilgpt2.safetensors");
const OUT = resolve(HERE, "../../public/data/attention.json");

const MODEL_ID = "Xenova/distilgpt2";
const LAYERS = 6;
const HEADS = 12;
const DIM = 768;
const HEAD_DIM = DIM / HEADS;
const EPS = 1e-5;

/** How far the hand-rolled logits may differ from the library's, per token. */
const TOLERANCE = 0.02;

/**
 * Sentences where attention has something to resolve. Each one contains a
 * dependency a reader has to carry across several words, which is the thing
 * the lesson is about, and the thing a bag of word vectors cannot do.
 */
const SENTENCES = [
  {
    id: "pronoun",
    text: "The cat sat on the mat because it was tired",
    ask: "Which earlier word does “it” belong to?",
  },
  {
    id: "winograd",
    text: "The trophy did not fit in the suitcase because it was too big",
    ask: "Same sentence shape, opposite answer. Where does “it” point now?",
  },
  {
    id: "agreement",
    text: "The key to the cabinets is on the table",
    ask: "“is”, not “are”. Which noun is the verb agreeing with?",
  },
  {
    id: "names",
    text: "When Mary and John went to the shop, John gave a drink to",
    ask: "Two names went in, one has already been used. Which one is left?",
  },
];

/* ---------------------------------------------------------- safetensors -- */

function openSafetensors(path) {
  const fd = openSync(path, "r");
  const head = Buffer.alloc(8);
  readSync(fd, head, 0, 8, 0);
  const headerLength = Number(head.readBigUInt64LE(0));
  const headerBuf = Buffer.alloc(headerLength);
  readSync(fd, headerBuf, 0, headerLength, 8);
  const header = JSON.parse(headerBuf.toString("utf8"));
  const base = 8 + headerLength;

  return {
    close: () => closeSync(fd),
    /** A tensor as a Float32Array, read straight out of the file. */
    get(name) {
      const entry = header[name];
      if (!entry) throw new Error(`missing tensor: ${name}`);
      if (entry.dtype !== "F32") {
        throw new Error(`${name} is ${entry.dtype}; this script only reads F32`);
      }
      const [start, end] = entry.data_offsets;
      const bytes = Buffer.alloc(end - start);
      readSync(fd, bytes, 0, end - start, base + start);
      return {
        shape: entry.shape,
        data: new Float32Array(
          bytes.buffer,
          bytes.byteOffset,
          (end - start) / 4,
        ),
      };
    },
  };
}

/* ------------------------------------------------------------------ maths -- */

function layerNorm(vec, weight, bias) {
  const n = vec.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += vec[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = vec[i] - mean;
    variance += d * d;
  }
  variance /= n;
  const scale = 1 / Math.sqrt(variance + EPS);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (vec[i] - mean) * scale * weight[i] + bias[i];
  return out;
}

/** HF's Conv1D: weight is [in, out], so this is a plain row-times-matrix. */
function linear(vec, weight, bias, inDim, outDim) {
  const out = new Float32Array(outDim);
  for (let o = 0; o < outDim; o++) out[o] = bias[o];
  for (let i = 0; i < inDim; i++) {
    const v = vec[i];
    if (v === 0) continue;
    const row = i * outDim;
    for (let o = 0; o < outDim; o++) out[o] += v * weight[row + o];
  }
  return out;
}

/** `gelu_new`, the tanh approximation GPT-2 was trained with. */
function gelu(x) {
  const c = Math.sqrt(2 / Math.PI);
  return 0.5 * x * (1 + Math.tanh(c * (x + 0.044715 * x * x * x)));
}

function softmaxInPlace(values, upTo) {
  let max = -Infinity;
  for (let i = 0; i <= upTo; i++) if (values[i] > max) max = values[i];
  let total = 0;
  for (let i = 0; i <= upTo; i++) {
    values[i] = Math.exp(values[i] - max);
    total += values[i];
  }
  for (let i = 0; i <= upTo; i++) values[i] /= total;
  for (let i = upTo + 1; i < values.length; i++) values[i] = 0;
}

/* ---------------------------------------------------------- forward pass -- */

/**
 * One full pass over `ids`, returning the final-position logits and every
 * attention matrix on the way. Written for clarity rather than speed: the
 * sequences here are a dozen tokens long and it runs once.
 */
function forward(weights, ids) {
  const n = ids.length;
  const wte = weights.wte;
  const wpe = weights.wpe;

  let hidden = ids.map((id, pos) => {
    const vec = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) {
      vec[i] = wte[id * DIM + i] + wpe[pos * DIM + i];
    }
    return vec;
  });

  // attention[layer][head][query][key]
  const attention = [];

  for (let layer = 0; layer < LAYERS; layer++) {
    const L = weights.layers[layer];

    const q = [];
    const k = [];
    const v = [];
    for (let t = 0; t < n; t++) {
      const normed = layerNorm(hidden[t], L.ln1w, L.ln1b);
      const qkv = linear(normed, L.attnW, L.attnB, DIM, DIM * 3);
      q.push(qkv.subarray(0, DIM));
      k.push(qkv.subarray(DIM, DIM * 2));
      v.push(qkv.subarray(DIM * 2, DIM * 3));
    }

    const heads = [];
    const context = Array.from({ length: n }, () => new Float32Array(DIM));
    const scale = 1 / Math.sqrt(HEAD_DIM);

    for (let h = 0; h < HEADS; h++) {
      const off = h * HEAD_DIM;
      const rows = [];

      for (let i = 0; i < n; i++) {
        const scores = new Float32Array(n);
        for (let j = 0; j <= i; j++) {
          let dot = 0;
          for (let d = 0; d < HEAD_DIM; d++) {
            dot += q[i][off + d] * k[j][off + d];
          }
          scores[j] = dot * scale;
        }
        // Everything after i is masked: a token cannot see its own future.
        for (let j = i + 1; j < n; j++) scores[j] = -Infinity;
        softmaxInPlace(scores, i);

        for (let j = 0; j <= i; j++) {
          const w = scores[j];
          if (w === 0) continue;
          for (let d = 0; d < HEAD_DIM; d++) {
            context[i][off + d] += w * v[j][off + d];
          }
        }
        rows.push(Array.from(scores));
      }
      heads.push(rows);
    }
    attention.push(heads);

    for (let t = 0; t < n; t++) {
      const projected = linear(context[t], L.projW, L.projB, DIM, DIM);
      for (let i = 0; i < DIM; i++) hidden[t][i] += projected[i];
    }

    for (let t = 0; t < n; t++) {
      const normed = layerNorm(hidden[t], L.ln2w, L.ln2b);
      const inner = linear(normed, L.fcW, L.fcB, DIM, DIM * 4);
      for (let i = 0; i < inner.length; i++) inner[i] = gelu(inner[i]);
      const outer = linear(inner, L.mlpProjW, L.mlpProjB, DIM * 4, DIM);
      for (let i = 0; i < DIM; i++) hidden[t][i] += outer[i];
    }
  }

  const final = layerNorm(hidden[n - 1], weights.lnfW, weights.lnfB);

  // The LM head is the tied embedding matrix.
  const vocab = wte.length / DIM;
  const logits = new Float32Array(vocab);
  for (let t = 0; t < vocab; t++) {
    let dot = 0;
    const row = t * DIM;
    for (let i = 0; i < DIM; i++) dot += final[i] * wte[row + i];
    logits[t] = dot;
  }

  return { logits, attention };
}

/* ------------------------------------------------------------------- run -- */

function quantise(matrix) {
  // Attention weights are already a probability distribution per row, so one
  // byte per cell is plenty and keeps the payload small.
  const out = [];
  for (const row of matrix) {
    for (const value of row) out.push(Math.round(Math.min(1, Math.max(0, value)) * 255));
  }
  return Buffer.from(out).toString("base64");
}

const main = async () => {
  if (!existsSync(WEIGHTS)) {
    throw new Error(
      `${WEIGHTS} not found. Fetch it first, see data/PROVENANCE.md.`,
    );
  }

  console.log("Reading weights …");
  const file = openSafetensors(WEIGHTS);
  const weights = {
    wte: file.get("transformer.wte.weight").data,
    wpe: file.get("transformer.wpe.weight").data,
    lnfW: file.get("transformer.ln_f.weight").data,
    lnfB: file.get("transformer.ln_f.bias").data,
    layers: [],
  };
  for (let i = 0; i < LAYERS; i++) {
    weights.layers.push({
      ln1w: file.get(`transformer.h.${i}.ln_1.weight`).data,
      ln1b: file.get(`transformer.h.${i}.ln_1.bias`).data,
      attnW: file.get(`transformer.h.${i}.attn.c_attn.weight`).data,
      attnB: file.get(`transformer.h.${i}.attn.c_attn.bias`).data,
      projW: file.get(`transformer.h.${i}.attn.c_proj.weight`).data,
      projB: file.get(`transformer.h.${i}.attn.c_proj.bias`).data,
      ln2w: file.get(`transformer.h.${i}.ln_2.weight`).data,
      ln2b: file.get(`transformer.h.${i}.ln_2.bias`).data,
      fcW: file.get(`transformer.h.${i}.mlp.c_fc.weight`).data,
      fcB: file.get(`transformer.h.${i}.mlp.c_fc.bias`).data,
      mlpProjW: file.get(`transformer.h.${i}.mlp.c_proj.weight`).data,
      mlpProjB: file.get(`transformer.h.${i}.mlp.c_proj.bias`).data,
    });
  }
  file.close();

  console.log("Loading the reference model for the check …");
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const reference = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
    dtype: "fp32",
  });

  const sentences = [];

  for (const sentence of SENTENCES) {
    const encoded = await tokenizer(sentence.text);
    const ids = Array.from(encoded.input_ids.data).map(Number);

    const mine = forward(weights, ids);

    // ---- the check -------------------------------------------------------
    const theirs = await reference(encoded);
    const [, positions, vocab] = theirs.logits.dims;
    const row = theirs.logits.data.slice((positions - 1) * vocab, positions * vocab);

    let worst = 0;
    for (let i = 0; i < vocab; i++) {
      const diff = Math.abs(mine.logits[i] - row[i]);
      if (diff > worst) worst = diff;
    }
    if (!(worst < TOLERANCE)) {
      throw new Error(
        `forward pass disagrees with the library on "${sentence.text}": worst logit difference ${worst.toFixed(5)} exceeds ${TOLERANCE}. Nothing written.`,
      );
    }
    console.log(
      `  ${sentence.id}: ${ids.length} tokens, matches the library to ${worst.toExponential(2)}`,
    );

    sentences.push({
      ...sentence,
      tokens: ids.map((id) => ({ id, text: tokenizer.decode([id]) })),
      /** [layer][head] → base64 of an n×n row-major uint8 matrix. */
      attention: mine.attention.map((heads) => heads.map(quantise)),
    });
  }

  const payload = {
    generatedBy: "data/scripts/build-attention.mjs",
    model: {
      id: "distilbert/distilgpt2",
      name: "DistilGPT-2",
      url: "https://huggingface.co/distilbert/distilgpt2",
      licence: "Apache 2.0",
      layers: LAYERS,
      heads: HEADS,
      headDim: HEAD_DIM,
    },
    verification: {
      method:
        "Every attention matrix comes from a forward pass implemented in this script. Its final-position logits were compared against the same model run through @huggingface/transformers; the build fails if any logit differs by more than the tolerance.",
      tolerance: TOLERANCE,
    },
    encoding: "uint8, base64, row-major; divide by 255 for the weight",
    sentences,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
  console.log(`\nWrote ${OUT}`);
};

main().catch((error) => {
  console.error("\nExtraction failed. Nothing was written.\n");
  console.error(error.message ?? error);
  process.exit(1);
});
