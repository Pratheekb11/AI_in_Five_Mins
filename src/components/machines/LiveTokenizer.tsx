"use client";

import { useEffect, useMemo, useState } from "react";
import { TokenStrip, type StripItem } from "@/components/token-strip/TokenStrip";
import {
  ENCODING_NAME,
  loadEncoding,
  tokenize,
  type Token,
} from "@/lib/tokenizer";

export const DEFAULT_TEXT = "AI doesn't read words. It reads tokens.";

/**
 * The real tokenization of DEFAULT_TEXT, generated with the same encoding this
 * component loads. It is shown for the fraction of a second before the merge
 * table arrives, so the first thing a visitor sees is still true output rather
 * than a spinner or a mock.
 */
const PLACEHOLDER: Token[] = [
  { index: 0, id: 17527, text: "AI" },
  { index: 1, id: 8740, text: " doesn't" },
  { index: 2, id: 1729, text: " read" },
  { index: 3, id: 6391, text: " words" },
  { index: 4, id: 13, text: "." },
  { index: 5, id: 1225, text: " It" },
  { index: 6, id: 31523, text: " reads" },
  { index: 7, id: 20290, text: " tokens" },
  { index: 8, id: 13, text: "." },
];

export type LiveTokenizerProps = {
  initialText?: string;
  /** Show the token id under each slug. */
  showIds?: boolean;
  showStats?: boolean;
  rows?: number;
  label?: string;
  onTokensChange?: (tokens: Token[], text: string) => void;
};

export function LiveTokenizer({
  initialText = DEFAULT_TEXT,
  showIds = true,
  showStats = true,
  rows = 3,
  label = "Type anything",
  onTokensChange,
}: LiveTokenizerProps) {
  const [text, setText] = useState(initialText);
  const [encoding, setEncoding] = useState<Awaited<
    ReturnType<typeof loadEncoding>
  > | null>(null);

  useEffect(() => {
    let alive = true;
    loadEncoding().then((enc) => {
      if (alive) setEncoding(enc);
    });
    return () => {
      alive = false;
    };
  }, []);

  const tokens = useMemo(() => {
    if (!encoding) {
      return text === DEFAULT_TEXT ? PLACEHOLDER : [];
    }
    return tokenize(encoding, text);
  }, [encoding, text]);

  useEffect(() => {
    onTokensChange?.(tokens, text);
  }, [tokens, text, onTokensChange]);

  // Before the merge table lands there is no honest token count to show unless
  // the text happens to be the one precomputed above. Reporting zero would read
  // as an answer rather than as "not yet".
  const counted = encoding !== null || tokens.length > 0;
  const charCount = [...text].length;
  const ratio = tokens.length > 0 ? charCount / tokens.length : 0;

  const items: StripItem[] = tokens.map((t) => ({
    text: t.text,
    caption: showIds ? String(t.id) : undefined,
    title: `Token ${t.index + 1} · id ${t.id}`,
  }));

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="tokenizer-input" className="label text-ink-faint">
          {label}
        </label>
        <textarea
          id="tokenizer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={rows}
          spellCheck={false}
          className="border-ink/40 bg-paper-sunk focus:border-ink mt-2 w-full resize-y rounded-[2px] border px-3 py-2.5 font-body text-base outline-none"
        />
      </div>

      <div className="border-ink/25 border-t pt-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <span className="label text-ink-faint">What the model receives</span>
          <span className="label text-ink-faint">
            {encoding ? ENCODING_NAME : "loading table…"}
          </span>
        </div>
        <TokenStrip
          items={items}
          summary={`${tokens.length} tokens`}
          emptyMessage={
            encoding ? "Empty input — zero tokens." : "Loading the merge table…"
          }
        />
      </div>

      {showStats ? (
        <dl className="border-ink/25 grid grid-cols-3 gap-px border-t pt-4">
          <Stat label="Characters" value={charCount} />
          <Stat label="Tokens" value={counted ? tokens.length : "—"} accent />
          <Stat
            label="Chars / token"
            value={counted && ratio ? ratio.toFixed(2) : "—"}
          />
        </dl>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="label text-ink-faint mb-1.5">{label}</dt>
      <dd
        className={`data text-2xl font-semibold ${accent ? "text-pink-text" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
