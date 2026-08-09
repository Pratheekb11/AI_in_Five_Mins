import raw from "@data/token-examples.json";
import type { Token } from "./tokenizer";

/**
 * Typed view over the generated token examples.
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
