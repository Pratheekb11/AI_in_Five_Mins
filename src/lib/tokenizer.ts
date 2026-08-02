/**
 * Real BPE tokenization, in the browser.
 *
 * This is the `o200k_base` encoding — the same byte-pair merge table OpenAI's
 * GPT-4o and GPT-5 family models use. Nothing here is a simulation or an
 * approximation of tokenizing; every split and every id a learner sees is what
 * the actual model would receive.
 *
 * The merge table is ~2MB, so it is loaded on demand rather than shipped in the
 * first-paint bundle. Callers render a precomputed example until `load()`
 * resolves, then re-tokenize live.
 */

export type Token = {
  /** Position in the sequence. */
  index: number;
  /** The vocabulary id the model actually receives. */
  id: number;
  /** The text this token covers, decoded back from its id. */
  text: string;
};

type Encoding = {
  encode: (text: string) => number[];
  decode: (tokens: number[]) => string;
  vocabularySize: number;
};

let encodingPromise: Promise<Encoding> | null = null;

/**
 * Loads (and caches) the encoding. Safe to call repeatedly — concurrent callers
 * share one download.
 */
export function loadEncoding(): Promise<Encoding> {
  if (!encodingPromise) {
    encodingPromise = import("gpt-tokenizer/encoding/o200k_base").then(
      (mod) => ({
        encode: mod.encode,
        decode: mod.decode,
        vocabularySize: mod.vocabularySize,
      }),
    );
  }
  return encodingPromise;
}

/**
 * Splits text into tokens, decoding each id back to the exact characters it
 * covers. Decoding per-token rather than slicing the input is what makes the
 * multi-byte cases (emoji, non-Latin scripts) come out right.
 */
export function tokenize(encoding: Encoding, text: string): Token[] {
  if (text === "") return [];
  const ids = encoding.encode(text);
  return ids.map((id, index) => ({
    index,
    id,
    text: encoding.decode([id]),
  }));
}

/** Vocabulary size of `o200k_base`, for display. */
export const VOCAB_SIZE = 200_006;

export const ENCODING_NAME = "o200k_base";
