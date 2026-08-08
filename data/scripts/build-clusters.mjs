/**
 * Generates public/data/clusters.json
 *
 * The ninth machine learning module is the first with no labels in it. Nobody
 * tells the algorithm what any word means or which group it belongs to. It is
 * given 1,851 real word vectors and a number, k, and it finds k groups by
 * moving centres around until they stop moving.
 *
 * What comes out is not a taxonomy anybody wrote. It is whatever falls out of
 * the geometry, and that is exactly what makes it worth showing: some clusters
 * are obviously months, or countries, or numbers, and some are a shrug. Both
 * are honest outputs and the page shows both.
 *
 * Every assignment at every iteration is exported, so the figure can animate
 * the real convergence rather than a scripted one. Clustering is done in all
 * fifty dimensions; the two-dimensional coordinates are only for drawing, and
 * the page repeats the warning the embeddings module already makes about
 * shadows.
 *
 * Input: public/data/embeddings.json, built by build-embeddings.mjs from GloVe.
 *
 * Run: node data/scripts/build-clusters.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IN = resolve(ROOT, "public/data/embeddings.json");
const OUT = resolve(ROOT, "public/data/clusters.json");

const KS = [2, 3, 4, 6, 8, 10, 12, 16, 20];
/** The k the figure walks through, and the one the game asks about. */
const SHOWN_K = 8;
const MAX_ITERATIONS = 80;

// ------------------------------------------------------------------ vectors --

const raw = JSON.parse(await readFile(IN, "utf8"));
const { dims, words, points } = raw;

const binary = Buffer.from(raw.vectors, "base64");
const unit = new Float32Array(words.length * dims);
for (let w = 0; w < words.length; w++) {
  const off = w * dims;
  let norm = 0;
  for (let i = 0; i < dims; i++) {
    const v = (binary[off + i] << 24) >> 24; // int8
    const scaled = v * raw.scale;
    unit[off + i] = scaled;
    norm += scaled * scaled;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dims; i++) unit[off + i] /= norm;
}

function distance(a, centre) {
  let sum = 0;
  for (let i = 0; i < dims; i++) {
    const d = unit[a * dims + i] - centre[i];
    sum += d * d;
  }
  return sum;
}

// ------------------------------------------------------------------ k-means --

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * k-means++ seeding, so a rerun does not land somewhere silly.
 *
 * Picking k starting centres at random gives wildly different answers between
 * runs, which is true of k-means and is not what this module is trying to
 * teach. Seeding this way is what everybody actually does, and the seed is
 * fixed so the file is reproducible.
 */
function seedCentres(k, rand) {
  const centres = [];
  const first = Math.floor(rand() * words.length);
  centres.push(Array.from(unit.slice(first * dims, (first + 1) * dims)));

  while (centres.length < k) {
    const best = words.map((_, w) =>
      Math.min(...centres.map((c) => distance(w, c))),
    );
    const total = best.reduce((a, b) => a + b, 0);
    let target = rand() * total;
    let chosen = 0;
    for (let w = 0; w < best.length; w++) {
      target -= best[w];
      if (target <= 0) {
        chosen = w;
        break;
      }
    }
    centres.push(Array.from(unit.slice(chosen * dims, (chosen + 1) * dims)));
  }
  return centres;
}

function run(k, seed, keepHistory) {
  const rand = lcg(seed);
  let centres = seedCentres(k, rand);
  let assignment = new Array(words.length).fill(0);
  const history = [];

  for (let step = 0; step < MAX_ITERATIONS; step++) {
    const next = words.map((_, w) => {
      let best = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = distance(w, centres[c]);
        if (d < bestDistance) {
          bestDistance = d;
          best = c;
        }
      }
      return best;
    });

    const settled = step > 0 && next.every((c, i) => c === assignment[i]);
    assignment = next;
    if (keepHistory) history.push([...assignment]);
    if (settled) break;

    const sums = Array.from({ length: k }, () => new Float64Array(dims));
    const counts = new Array(k).fill(0);
    for (let w = 0; w < words.length; w++) {
      const c = assignment[w];
      counts[c]++;
      for (let i = 0; i < dims; i++) sums[c][i] += unit[w * dims + i];
    }
    centres = sums.map((sum, c) =>
      counts[c] === 0
        ? centres[c]
        : Array.from(sum, (v) => v / counts[c]),
    );
  }

  let inertia = 0;
  for (let w = 0; w < words.length; w++) {
    inertia += distance(w, centres[assignment[w]]);
  }

  return { centres, assignment, history, inertia, settled: history.length < MAX_ITERATIONS };
}

/** How far each k gets, for the elbow. */
const sweep = KS.map((k) => {
  const { inertia } = run(k, 20260808 + k, false);
  return { k, inertia: Number(inertia.toFixed(3)) };
});

const shown = run(SHOWN_K, 20260808 + SHOWN_K, true);

/** The words nearest each centre, which is the only honest way to name a cluster. */
function membersOf(assignment, centres, c, count) {
  return words
    .map((word, w) => ({ word, w, c: assignment[w] }))
    .filter((m) => m.c === c)
    .map((m) => ({ ...m, d: distance(m.w, centres[c]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((m) => m.word);
}

const clusters = Array.from({ length: SHOWN_K }, (_, c) => ({
  id: c,
  size: shown.assignment.filter((a) => a === c).length,
  nearest: membersOf(shown.assignment, shown.centres, c, 12),
}));

/**
 * Game rounds: a cluster, and four words, one of which really belongs to it.
 *
 * The three that do not are drawn from other clusters, and the whole round is
 * dropped unless the right answer is genuinely nearest to this centre, which it
 * is by construction. No round is written by hand.
 */
const rounds = [];
for (let c = 0; c < SHOWN_K && rounds.length < 8; c++) {
  const mine = membersOf(shown.assignment, shown.centres, c, 40);
  if (mine.length < 20) continue;

  const answer = mine[12 + (c % 8)];
  if (!answer) continue;

  const decoys = [];
  for (let other = 0; other < SHOWN_K && decoys.length < 3; other++) {
    if (other === c) continue;
    const theirs = membersOf(shown.assignment, shown.centres, other, 20);
    const pick = theirs[(c * 3 + other) % theirs.length];
    if (pick && pick !== answer && !decoys.includes(pick)) decoys.push(pick);
  }
  if (decoys.length < 3) continue;

  rounds.push({
    cluster: c,
    /** Shown as the cluster, without the answer in it. */
    shows: mine.slice(0, 6),
    answer,
    options: [answer, ...decoys],
  });
}

const out = {
  generatedBy: "data/scripts/build-clusters.mjs",
  source: raw.source,
  note: "Clustered in all 50 dimensions. The two coordinates each word is drawn at are a projection, and words that look close in the picture are not always close in the space, which is the same warning the embeddings module makes.",
  dims,
  words,
  points,
  k: SHOWN_K,
  iterations: shown.history.length,
  settled: shown.settled,
  history: shown.history,
  assignment: shown.assignment,
  clusters,
  sweep,
  rounds,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(out)}\n`);

console.log(`wrote ${OUT}\n`);
console.log(
  `${words.length} words, k = ${SHOWN_K}, ` +
    (shown.settled
      ? `settled after ${shown.history.length} passes\n`
      : `still moving after ${shown.history.length} passes\n`),
);
for (const cluster of clusters) {
  console.log(
    `${String(cluster.size).padStart(4)} words · ${cluster.nearest.slice(0, 8).join(", ")}`,
  );
}
console.log("\nk   inertia");
for (const s of sweep) console.log(`${String(s.k).padStart(2)}  ${s.inertia}`);
console.log(`\n${rounds.length} game rounds`);
