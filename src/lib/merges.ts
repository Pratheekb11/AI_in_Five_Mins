import raw from "@data/merges.json";

/**
 * Typed view over the generated merge traces.
 *
 * Produced by data/scripts/build-merges.mjs, which replays tiktoken's own
 * byte-pair merge loop against the published o200k_base rank table and then
 * checks the result token-for-token against the tokenizer. If those two ever
 * disagree the script throws rather than writing the file, so anything readable
 * from here has already been checked against the real encoder.
 *
 * Small enough (16KB) to ship with the page rather than fetch, which is why the
 * figure has no loading state.
 */

export type MergeStep = {
  /** Index, into `pieces`, of the left half of the pair that joins. */
  at: number;
  left: string;
  right: string;
  into: string;
  /** Token id, which in tiktoken is also the merge rank. Lower is commoner. */
  id: number;
  /** The pieces as they stand *before* this merge is applied. */
  pieces: string[];
};

export type MergeTrace = {
  word: string;
  teaches: string;
  bytes: number;
  start: string[];
  steps: MergeStep[];
  final: string[];
  ids: number[];
};

export type NumberSplit = {
  text: string;
  ids: number[];
  pieces: string[];
};

export type MergeData = {
  encoding: string;
  generatedBy: string;
  vocabularySize: number;
  note: string;
  traces: MergeTrace[];
  numbers: NumberSplit[];
};

export const MERGES = raw as MergeData;

export function traceFor(word: string): MergeTrace {
  const found = MERGES.traces.find((t) => t.word === word);
  if (!found) throw new Error(`no merge trace for ${JSON.stringify(word)}`);
  return found;
}

export function numberSplit(text: string): NumberSplit {
  const found = MERGES.numbers.find((n) => n.text === text);
  if (!found) throw new Error(`no number split for ${text}`);
  return found;
}
