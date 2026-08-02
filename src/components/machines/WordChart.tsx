"use client";

import { useEffect, useMemo, useState } from "react";
import { NimoSays } from "@/components/nimo/NimoSays";
import {
  type EmbeddingSpace,
  loadEmbeddings,
  nearest,
  vectorFor,
} from "@/lib/embeddings";

/**
 * A map of 1,851 words, and a search that ignores it.
 *
 * The dots are a two-dimensional projection of fifty-dimensional vectors, so
 * the map is a shadow: words that look adjacent on screen are often unrelated,
 * and true neighbours are often flung apart. That gap is the lesson, not a
 * defect to hide — so the neighbour list is computed in all fifty dimensions
 * and shown next to the map that disagrees with it.
 */

const GROUP_INK: Record<string, string> = {
  animals: "var(--teal)",
  food: "var(--yellow)",
  countries: "var(--blue)",
  cities: "var(--blue)",
  jobs: "var(--pink)",
  emotions: "var(--pink)",
  colours: "var(--yellow)",
  body: "var(--teal)",
  transport: "var(--blue)",
  sports: "var(--teal)",
  weather: "var(--blue)",
  family: "var(--pink)",
  music: "var(--yellow)",
  time: "var(--ink-faint)",
  royalty: "var(--pink)",
  tech: "var(--blue)",
};

const SUGGESTIONS = ["cat", "guitar", "paris", "doctor", "angry", "pizza"];

const W = 560;
const H = 420;
const PAD = 16;

export function WordChart() {
  const [space, setSpace] = useState<EmbeddingSpace | null>(null);
  const [query, setQuery] = useState("cat");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadEmbeddings()
      .then((s) => alive && setSpace(s))
      .catch(() => alive && setError("The word vectors did not load."));
    return () => {
      alive = false;
    };
  }, []);

  const result = useMemo(() => {
    if (!space) return null;
    const word = query.toLowerCase().trim();
    const vec = vectorFor(space, word);
    if (!vec) return { word, found: false as const };
    return {
      word,
      found: true as const,
      neighbours: nearest(space, vec, 8, [word]),
      index: space.index.get(word)!,
    };
  }, [space, query]);

  const highlighted = useMemo(() => {
    if (!result?.found) return new Set<number>();
    return new Set(result.neighbours.map((n) => n.index));
  }, [result]);

  if (error) {
    return <p className="plate text-pink-text p-5">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="plate p-5 md:p-6">
        <label htmlFor="word" className="label text-ink-faint">
          Find a word
        </label>
        <input
          id="word"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          className="border-ink/40 bg-paper-sunk focus:border-ink font-data mt-2 w-full rounded-[2px] border px-3 py-2.5 text-base outline-none"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setQuery(w)}
              className="label border-ink/30 hover:border-ink rounded-[2px] border px-2.5 py-1.5"
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <figure className="plate p-4">
          <figcaption className="label text-ink-faint mb-3">
            The map — 50 dimensions flattened to 2
          </figcaption>
          {!space ? (
            <div className="flex justify-center py-16">
              <NimoSays mood="think">Fetching 1,851 word vectors…</NimoSays>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Scatter plot of ${space.words.length} words projected to two dimensions.${
                result?.found
                  ? ` ${result.word} and its eight nearest neighbours are highlighted.`
                  : ""
              }`}
            >
              {space.points.map(([px, py], i) => {
                const isQuery = result?.found && i === result.index;
                const isNear = highlighted.has(i);
                const group = space.groups[i];

                return (
                  <circle
                    key={i}
                    cx={PAD + px * (W - PAD * 2)}
                    cy={H - PAD - py * (H - PAD * 2)}
                    r={isQuery ? 5.5 : isNear ? 4 : 2}
                    fill={
                      isQuery
                        ? "var(--pink)"
                        : isNear
                          ? "var(--pink)"
                          : group
                            ? GROUP_INK[group]
                            : "var(--ink-faint)"
                    }
                    fillOpacity={isQuery || isNear ? 1 : group ? 0.5 : 0.22}
                  />
                );
              })}

              {result?.found
                ? [result.index, ...result.neighbours.map((n) => n.index)].map(
                    (i) => {
                      const [px, py] = space.points[i];
                      return (
                        <text
                          key={`l-${i}`}
                          x={PAD + px * (W - PAD * 2) + 7}
                          y={H - PAD - py * (H - PAD * 2) + 3.5}
                          fontSize={10}
                          className="data"
                          fill="var(--ink)"
                        >
                          {space.words[i]}
                        </text>
                      );
                    },
                  )
                : null}
            </svg>
          )}
        </figure>

        <div className="plate p-5">
          <p className="label text-ink-faint mb-3">
            Nearest — measured in all 50
          </p>

          {!space ? (
            <p className="text-ink-faint text-sm">Loading…</p>
          ) : !result?.found ? (
            <p className="text-ink-soft text-sm">
              <span className="font-data">{result?.word || "—"}</span> is not in
              this vocabulary. It holds 1,851 common words, not all 400,000
              GloVe ships. Try one of the suggestions.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {result.neighbours.map((n) => (
                <li
                  key={n.word}
                  className="grid grid-cols-[minmax(0,1fr)_2.6rem] items-center gap-2"
                >
                  <span className="bg-paper-sunk relative block overflow-hidden rounded-[2px]">
                    <span
                      className="bg-pink-wash absolute inset-y-0 left-0"
                      style={{ width: `${Math.max(0, n.similarity) * 100}%` }}
                    />
                    <span className="font-data relative block px-2 py-1.5 text-sm">
                      {n.word}
                    </span>
                  </span>
                  <span className="data text-ink-soft text-right text-xs tabular-nums">
                    {n.similarity.toFixed(2)}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <p className="border-ink/20 text-ink-soft mt-4 border-t pt-3 text-sm">
            Look at where these land on the map. Some sit right next to the
            highlighted word; others are across the page. The list is right and
            the map is lying — flattening fifty dimensions into two has to throw
            something away.
          </p>
        </div>
      </div>
    </div>
  );
}
