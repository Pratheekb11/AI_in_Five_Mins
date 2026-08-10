"use client";

import { useEffect, useMemo, useState } from "react";
import { analogy, type EmbeddingSpace, loadEmbeddings } from "@/lib/embeddings";

/**
 * a − b + c, computed live on the shipped vectors.
 */

const PRESETS: [string, string, string][] = [
  ["king", "man", "woman"],
  ["paris", "france", "italy"],
  ["walking", "walk", "swim"],
  ["bigger", "big", "small"],
];

export function AnalogyBench() {
  const [space, setSpace] = useState<EmbeddingSpace | null>(null);
  const [failed, setFailed] = useState(false);
  const [a, setA] = useState("king");
  const [b, setB] = useState("man");
  const [c, setC] = useState("woman");

  useEffect(() => {
    let alive = true;
    loadEmbeddings()
      .then((s) => alive && setSpace(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const result = useMemo(() => {
    if (!space) return null;
    return analogy(space, a.trim(), b.trim(), c.trim(), 5);
  }, [space, a, b, c]);

  const missing = space
    ? [a, b, c].filter((w) => !space.index.has(w.toLowerCase().trim()))
    : [];

  return (
    <section className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk border-b px-4 py-3">
        <p className="label text-ink-faint">
          Word arithmetic, computed here, on the same vectors
        </p>
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-end gap-2">
          <Field label="take" value={a} onChange={setA} />
          <span className="font-display pb-2.5 text-xl font-bold">&minus;</span>
          <Field label="minus" value={b} onChange={setB} />
          <span className="font-display pb-2.5 text-xl font-bold">+</span>
          <Field label="plus" value={c} onChange={setC} />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {PRESETS.map(([x, y, z]) => (
            <button
              key={`${x}${y}${z}`}
              type="button"
              onClick={() => {
                setA(x);
                setB(y);
                setC(z);
              }}
              className="tap border-ink/30 bg-paper hover:border-ink font-data rounded-[2px] border px-2.5 py-1.5 text-xs transition-colors"
            >
              {x} − {y} + {z}
            </button>
          ))}
        </div>

        {failed ? (
          <p className="text-pink-text text-[0.9375rem]">
            The word vectors did not load, so nothing can be computed.
          </p>
        ) : !space ? (
          <p className="text-ink-soft text-[0.9375rem]">
            Loading the word vectors…
          </p>
        ) : missing.length > 0 ? (
          <p className="text-ink-soft text-[0.9375rem]">
            Not in this vocabulary:{" "}
            <span className="font-data">{missing.join(", ")}</span>. It holds{" "}
            {space.words.length.toLocaleString("en-US")} common words, so plenty
            of ordinary English is outside it.
          </p>
        ) : result ? (
          <ol className="space-y-2">
            {result.map((n, i) => (
              <li key={n.word} className="flex items-center gap-3">
                <span className="data text-ink-faint w-4 text-xs">{i + 1}</span>
                <span className="font-data w-28 font-semibold">{n.word}</span>
                <span
                  className="bg-blue h-3 rounded-[1px]"
                  style={{ width: `${Math.max(0, n.similarity) * 60}%` }}
                  aria-hidden="true"
                />
                <span className="data text-ink-soft text-sm tabular-nums">
                  {n.similarity.toFixed(3)}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className="border-ink/25 text-ink-soft border-t px-4 py-3 text-sm">
        Cosine similarity against every word in the vocabulary. The three inputs
        are excluded from their own results, because otherwise the closest
        answer is almost always one of them.
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="min-w-[7rem] flex-1">
      <span className="label text-ink-faint mb-1.5 block">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={24}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="border-ink/30 bg-paper focus-visible:outline-ink font-data w-full rounded-[2px] border px-3 py-2 outline-none focus-visible:outline-2"
      />
    </label>
  );
}
