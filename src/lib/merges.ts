import raw from "@data/merges.json";

/**
 * Typed view over the generated merge traces.
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
