"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type AttentionData,
  loadAttention,
  matrixOf,
  sinkShare,
} from "@/lib/attention";

/**
 * The whole grid, for anyone who wants to go looking.
 *
 * Seventy-two heads over four sentences, every cell a real weight. The point
 * of leaving it browsable is that the heads are visibly not doing the same
 * job as each other, and no caption makes that as convincing as scrubbing
 * through them does.
 */
export function AttentionMap() {
  const [data, setData] = useState<AttentionData | null>(null);
  const [failed, setFailed] = useState(false);
  const [which, setWhich] = useState(0);
  const [layer, setLayer] = useState(3);
  const [head, setHead] = useState(0);

  useEffect(() => {
    let alive = true;
    loadAttention()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const sentence = data?.sentences[which];
  const rows = useMemo(
    () => (sentence ? matrixOf(sentence, layer, head) : null),
    [sentence, layer, head],
  );
  const sink = useMemo(() => (data ? sinkShare(data) : 0), [data]);

  if (failed) {
    return (
      <section className="plate p-5">
        <p className="text-pink-text text-[0.9375rem]">
          The attention weights did not load.
        </p>
      </section>
    );
  }

  if (!data || !sentence || !rows) {
    return (
      <section className="plate p-5">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the attention weights…
        </p>
      </section>
    );
  }

  const tokens = sentence.tokens;

  return (
    <section className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3">
        <span className="label">Every head, every sentence</span>
        <span className="label text-ink-faint">
          layer {layer + 1}/{data.model.layers} · head {head + 1}/
          {data.model.heads}
        </span>
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {data.sentences.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setWhich(i)}
              aria-pressed={which === i}
              className={`rounded-[2px] border px-2.5 py-1.5 text-[0.8125rem] transition-colors ${
                which === i
                  ? "border-ink bg-blue-wash text-blue-text font-semibold"
                  : "border-ink/30 bg-paper hover:border-ink"
              }`}
            >
              {s.id}
            </button>
          ))}
        </div>

        <p className="prose-measure text-ink-soft mb-5 text-[0.9375rem]">
          {sentence.ask}
        </p>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label text-ink-faint mb-1.5 block">Layer</span>
            <input
              type="range"
              min={0}
              max={data.model.layers - 1}
              value={layer}
              onChange={(e) => setLayer(Number(e.target.value))}
              className="accent-blue w-full"
            />
          </label>
          <label>
            <span className="label text-ink-faint mb-1.5 block">Head</span>
            <input
              type="range"
              min={0}
              max={data.model.heads - 1}
              value={head}
              onChange={(e) => setHead(Number(e.target.value))}
              className="accent-pink w-full"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse text-xs">
            <caption className="sr-only">
              Attention weights from each token (rows) to each earlier token
              (columns), layer {layer + 1}, head {head + 1}.
            </caption>
            <thead>
              <tr>
                <th className="p-1" />
                {tokens.map((t, j) => (
                  <th
                    key={j}
                    scope="col"
                    className="data text-ink-faint p-1 align-bottom text-[0.625rem] font-normal"
                  >
                    <span className="block max-w-[1.75rem] truncate">
                      {t.text.trim() || "␣"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <th
                    scope="row"
                    className="data text-ink-soft p-1 pr-2 text-right text-[0.6875rem] font-normal whitespace-nowrap"
                  >
                    {tokens[i].text.trim() || "␣"}
                  </th>
                  {row.map((value, j) => (
                    <td key={j} className="p-0">
                      <span
                        className="border-ink/10 block h-6 w-6 border"
                        style={{
                          backgroundColor:
                            j > i
                              ? "transparent"
                              : `color-mix(in srgb, var(--blue) ${Math.round(value * 100)}%, var(--paper))`,
                        }}
                        title={`${tokens[i].text.trim()} → ${tokens[j].text.trim()}: ${(value * 100).toFixed(1)}%`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-ink-soft mt-5 text-[0.9375rem]">
          The empty upper triangle is the causal mask: a token is never allowed
          to look at what comes after it. And the dark first column is the
          attention sink. Across every head and sentence here, an average of{" "}
          <span className="data font-semibold">{(sink * 100).toFixed(0)}%</span>{" "}
          of each row lands on the very first token.
        </p>
      </div>

      <div className="border-ink/25 text-ink-soft border-t px-4 py-3 text-sm">
        {data.verification.method}
      </div>
    </section>
  );
}
