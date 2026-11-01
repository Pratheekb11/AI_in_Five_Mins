"use client";

import { useMemo } from "react";
import { Reel, useReel, type ReelStep } from "./Reel";

/**
 * Chapter 2, played rather than read: a word as letters, the same word as the
 * chunks a real tokenizer cuts it into, the letters it can no longer see, and
 * what the same sentence costs in two languages. Every split is o200k_base's
 * own, passed in from `token-examples.json`.
 */

type Row = { language: string; chunks: string[] };

export function ChunkReel({
  word,
  chunks,
  hidden,
  rows,
}: {
  word: string;
  chunks: string[];
  /** The letter to light up inside the chunks, "r" for strawberry. */
  hidden: string;
  /** Two languages, the same sentence, cut by the same tokenizer. */
  rows: [Row, Row];
}) {
  const steps = useMemo<ReelStep[]>(() => {
    const count = [...word].filter((c) => c === hidden).length;
    return [
      { label: "Letters", caption: `You see ${word.length} letters.`, ms: 2600 },
      {
        label: "Chunks",
        caption: `The AI sees ${chunks.length} chunks, called tokens: ${chunks.join(" · ")}.`,
        ms: 3200,
      },
      {
        label: "Miscount",
        caption: `The ${count} ${hidden}'s are buried inside chunks. That is why it miscounts them.`,
        ms: 3800,
      },
      {
        label: "Cost",
        caption: `Same sentence: ${rows[0].chunks.length} chunks in ${rows[0].language}, ${rows[1].chunks.length} in ${rows[1].language}. You pay per chunk.`,
        ms: 5200,
      },
    ];
  }, [word, chunks, hidden, rows]);

  const { ref, at } = useReel(steps);
  const grouped = at >= 1;

  return (
    <Reel
      steps={steps}
      at={at}
      frameRef={ref}
      tone={at === 2 ? "bad" : undefined}
      footnote="Every split is the real o200k_base tokenizer, the one GPT-4o and GPT-5 use."
    >
      <div className="flex min-h-[9.5rem] items-center justify-center">
        {at < 3 ? (
          /* One word, always the same letters. Only the borders and the gaps
             move, so the eye sees letters fuse into chunks. */
          <div
            className="flex flex-wrap justify-center transition-[gap] duration-500"
            style={{ gap: grouped ? "0.6rem" : "0.3rem" }}
          >
            {chunks.map((chunk, c) => (
              <span
                key={c}
                className={`flex rounded-[2px] border-2 transition-[gap,border-color,background-color] duration-500 ${
                  grouped
                    ? `${["border-blue bg-blue-wash", "border-pink bg-pink-wash", "border-teal bg-teal-wash"][c % 3]} px-1`
                    : "border-transparent"
                }`}
                style={{ gap: grouped ? "0" : "0.3rem" }}
              >
                {[...chunk].map((letter, i) => (
                  <span
                    key={i}
                    className={`font-data flex h-11 w-7 items-center justify-center rounded-[2px] text-xl font-bold transition-[border-color,color,opacity] duration-500 sm:h-12 sm:w-8 sm:text-2xl ${
                      grouped
                        ? "border border-transparent"
                        : "border-ink/40 bg-paper-raised border"
                    } ${
                      at === 2
                        ? letter === hidden
                          ? "text-pink-text"
                          : "opacity-35"
                        : ""
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            ))}
          </div>
        ) : (
          <div className="w-full space-y-3">
            {rows.map((row) => (
              <div key={row.language}>
                <p className="label text-ink-faint mb-1">
                  {row.language} &middot;{" "}
                  <span className="text-ink">{row.chunks.length} chunks</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {row.chunks.map((chunk, i) => (
                    <span
                      key={i}
                      className={`font-data rounded-[2px] border px-1 py-0.5 text-[0.8125rem] whitespace-pre ${
                        ["border-blue bg-blue-wash", "border-pink bg-pink-wash", "border-teal bg-teal-wash"][i % 3]
                      }`}
                      style={{ animation: `ink-pop 0.25s ease-out ${i * 0.06}s both` }}
                    >
                      {chunk}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Reel>
  );
}
