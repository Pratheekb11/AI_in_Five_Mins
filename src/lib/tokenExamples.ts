import raw from "@data/token-examples.json";
import type { Token } from "./tokenizer";

/**
 * Typed view over the generated token examples.
 *
 * The JSON is produced by data/scripts/build-token-examples.mjs from the same
 * encoding the browser loads, so these figures and the ones a learner produces
 * by typing come from one source. Editing the JSON by hand would break that,
 * change the script and regenerate.
 */

export type MeasuredText = {
  text: string;
  chars: number;
  tokenCount: number;
  tokens: Token[];
};

export type MultilingualRow = MeasuredText & {
  language: string;
  charsPerToken: number;
};

export type Curiosity = MeasuredText & {
  id: string;
  note: string;
  charsPerToken: number;
};

/** A word for the cutting game, with the offsets its tokens break at. */
export type ChopWord = {
  word: string;
  pieces: string[];
  cuts: number[];
};

export const TOKEN_EXAMPLES = raw as {
  encoding: string;
  generatedBy: string;
  multilingual: MultilingualRow[];
  curiosities: Curiosity[];
  guessable: MeasuredText[];
  chop: ChopWord[];
};
