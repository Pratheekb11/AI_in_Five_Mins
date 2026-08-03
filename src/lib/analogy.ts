import raw from "@data/analogy.json";

/**
 * Typed view over the generated analogy geometry.
 *
 * Produced by data/scripts/build-analogy.mjs from full-precision GloVe vectors.
 * Every similarity, rank and coordinate here is measured; nothing is rounded
 * toward the answer anybody was hoping for, which is why `bigger - big + small`
 * comes back as "larger" rather than "smaller".
 */

export type Neighbour = { word: string; similarity: number };

export type PlanePoint = {
  word: string;
  x: number;
  y: number;
  /** Distance from the drawing plane. Zero for the three input words, which
   *  define it; non-zero for everything else, and worth saying out loud. */
  offPlane: number;
};

export type Analogy = {
  id: string;
  /** a is to b as c is to the answer — computed as b - a + c. */
  a: string;
  b: string;
  c: string;
  /** The word the demonstration is usually said to produce, if there is one. */
  expect: string | null;
  teaches: string;
  /** Nearest word with the three inputs excluded — the usual convention. */
  answer: Neighbour;
  /** Nearest word with nothing excluded. Often one of the inputs. */
  unfiltered: Neighbour;
  neighbours: Neighbour[];
  neighboursUnfiltered: Neighbour[];
  points: PlanePoint[];
  result: PlanePoint;
  expectedSimilarity: number | null;
  expectedRank: number | null;
};

export type AnalogyData = {
  generatedBy: string;
  source: { name: string; trainedOn: string; url: string; licence: string };
  dims: number;
  vocabulary: number;
  note: string;
  analogies: Analogy[];
};

export const ANALOGY = raw as AnalogyData;

export function analogy(id: string): Analogy {
  const found = ANALOGY.analogies.find((a) => a.id === id);
  if (!found) throw new Error(`no analogy ${id}`);
  return found;
}
