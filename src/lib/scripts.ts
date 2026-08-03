/**
 * What a tokenizer charges, by script.
 *
 * Measured in `data/scripts/build-scripts.mjs` over the same number of
 * characters of Wikipedia in each language, with the real `o200k_base` merge
 * table. Every figure carries its article and revision id so it can be checked.
 */

export type ScriptMeasure = {
  code: string;
  name: string;
  script: string;
  article: { title: string; url: string; revision: number | null };
  sample: string;
  characters: number;
  tokens: number;
  charactersPerToken: number;
  /** Tokens needed relative to English, for the same number of characters. */
  timesEnglish: number;
};

export type ScriptData = {
  measuredOn: string;
  encoding: { name: string; note: string; url: string };
  corpus: { name: string; note: string; licence: string; url: string };
  charactersMeasured: number;
  languages: ScriptMeasure[];
};

let cached: Promise<ScriptData> | null = null;

export function loadScripts(): Promise<ScriptData> {
  if (!cached) {
    cached = fetch("/data/scripts.json").then((r) => {
      if (!r.ok) throw new Error(`scripts: ${r.status}`);
      return r.json() as Promise<ScriptData>;
    });
  }
  return cached;
}
