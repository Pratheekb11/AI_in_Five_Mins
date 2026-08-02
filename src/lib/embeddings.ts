/**
 * Real word vectors, searched in the browser.
 *
 * The 1,851 words here carry their full 50-dimensional GloVe vectors, because
 * neighbours and analogies are only true if they are computed in all fifty. The
 * 2D coordinates that draw the map are a projection — a shadow — and the lesson
 * is explicit that the shadow misleads. Ranking never uses them.
 *
 * Loaded on demand (~180KB) rather than bundled, so it costs nothing until a
 * learner opens the lesson that needs it.
 */

export type EmbeddingSpace = {
  words: string[];
  groups: (string | null)[];
  points: [number, number][];
  dims: number;
  source: {
    name: string;
    trainedOn: string;
    url: string;
    licence: string;
  };
  /** Unit-normalised vectors, so cosine similarity is a plain dot product. */
  unit: Float32Array;
  index: Map<string, number>;
};

let spacePromise: Promise<EmbeddingSpace> | null = null;

export function loadEmbeddings(): Promise<EmbeddingSpace> {
  if (!spacePromise) {
    spacePromise = fetch("/data/embeddings.json")
      .then((r) => {
        if (!r.ok) throw new Error(`embeddings: ${r.status}`);
        return r.json();
      })
      .then((raw) => {
        const dims: number = raw.dims;
        const words: string[] = raw.words;

        const binary = atob(raw.vectors);
        const packed = new Int8Array(binary.length);
        for (let i = 0; i < binary.length; i++) packed[i] = binary.charCodeAt(i);

        // Normalising once at load turns every later similarity into a dot
        // product, which is what makes searching 1,851 words feel instant.
        const unit = new Float32Array(words.length * dims);
        for (let w = 0; w < words.length; w++) {
          const off = w * dims;
          let norm = 0;
          for (let i = 0; i < dims; i++) {
            const v = packed[off + i] * raw.scale;
            unit[off + i] = v;
            norm += v * v;
          }
          norm = Math.sqrt(norm) || 1;
          for (let i = 0; i < dims; i++) unit[off + i] /= norm;
        }

        return {
          words,
          groups: raw.groups,
          points: raw.points,
          dims,
          source: raw.source,
          unit,
          index: new Map(words.map((w: string, i: number) => [w, i])),
        } satisfies EmbeddingSpace;
      });
  }
  return spacePromise;
}

/** The (already unit-length) vector for a word, or null if it isn't here. */
export function vectorFor(
  space: EmbeddingSpace,
  word: string,
): Float32Array | null {
  const i = space.index.get(word.toLowerCase().trim());
  if (i === undefined) return null;
  return space.unit.subarray(i * space.dims, (i + 1) * space.dims);
}

export type Neighbour = { word: string; similarity: number; index: number };

/**
 * Closest words by cosine similarity, computed across all dimensions.
 *
 * `exclude` keeps the query words out of their own results — otherwise every
 * analogy answers itself.
 */
export function nearest(
  space: EmbeddingSpace,
  target: ArrayLike<number>,
  count: number,
  exclude: string[] = [],
): Neighbour[] {
  const { dims, words, unit } = space;

  let targetNorm = 0;
  for (let i = 0; i < dims; i++) targetNorm += target[i] * target[i];
  targetNorm = Math.sqrt(targetNorm) || 1;

  const skip = new Set(exclude.map((w) => w.toLowerCase().trim()));
  const best: Neighbour[] = [];

  for (let w = 0; w < words.length; w++) {
    if (skip.has(words[w])) continue;

    const off = w * dims;
    let dot = 0;
    for (let i = 0; i < dims; i++) dot += target[i] * unit[off + i];
    const similarity = dot / targetNorm;

    if (best.length < count) {
      best.push({ word: words[w], similarity, index: w });
      best.sort((a, b) => b.similarity - a.similarity);
    } else if (similarity > best[best.length - 1].similarity) {
      best[best.length - 1] = { word: words[w], similarity, index: w };
      best.sort((a, b) => b.similarity - a.similarity);
    }
  }

  return best;
}

/** Cosine similarity between two words, or null if either is unknown. */
export function similarity(
  space: EmbeddingSpace,
  a: string,
  b: string,
): number | null {
  const va = vectorFor(space, a);
  const vb = vectorFor(space, b);
  if (!va || !vb) return null;
  let dot = 0;
  for (let i = 0; i < space.dims; i++) dot += va[i] * vb[i];
  return dot;
}

/**
 * `a − b + c`, the arithmetic behind "king minus man plus woman".
 * Returns null when any of the three words is outside this vocabulary.
 */
export function analogy(
  space: EmbeddingSpace,
  a: string,
  b: string,
  c: string,
  count = 4,
): Neighbour[] | null {
  const va = vectorFor(space, a);
  const vb = vectorFor(space, b);
  const vc = vectorFor(space, c);
  if (!va || !vb || !vc) return null;

  const target = new Float32Array(space.dims);
  for (let i = 0; i < space.dims; i++) target[i] = va[i] - vb[i] + vc[i];

  return nearest(space, target, count, [a, b, c]);
}
