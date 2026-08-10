"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ELEMENTS,
  type ElementKey,
  inspect,
  type Signal,
} from "@/lib/game/promptline";
import { ENCODING_NAME, loadEncoding } from "@/lib/tokenizer";
import { useIsPhone } from "@/lib/useMedia";

/**
 * Paste an instruction; see which of the five parts are structurally there and
 * what it costs to send.
 */

const HINTS: Record<ElementKey, string> = {
  role: "You are a … / Act as a …",
  goal: "Rewrite … / Summarise … / List three …",
  constraints: "Under 150 words. Do not … / Avoid …",
  format: "Answer as five bullets. / Return a two-column table.",
  example: "For example: '…' / Good: '…'",
};

const SAMPLES = [
  {
    label: "A vague one",
    text: "Can you help me write something about our new pricing? Thanks!!! ASAP please.",
  },
  {
    label: "A delegated one",
    text: "You are a product marketer writing for existing customers. Rewrite the note below announcing our new pricing. Under 150 words, no jargon, do not apologise, and do not promise a discount. Answer as three short paragraphs. For example, the opening should read like: 'From 1 March, the Team plan moves to £18 a seat.'",
  },
];

export function PromptInspector() {
  const phone = useIsPhone();
  const [methodOpen, setMethodOpen] = useState(false);
  const [text, setText] = useState(SAMPLES[0].text);
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

  const signals = useMemo(() => inspect(text), [text]);
  const tokens = useMemo(() => {
    if (!encoding) return null;
    return encoding.encode(text).length;
  }, [encoding, text]);

  const present = signals.filter((s) => s.present).length;
  const chars = [...text].length;

  return (
    <div className="plate p-4 sm:p-5 md:p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 sm:mb-4">
        <h3 className="display-md">Prompt inspector</h3>
        <p className="label text-ink-faint">Runs entirely in your browser</p>
      </div>

      <label htmlFor="inspector-input" className="label text-ink-faint">
        Paste an instruction you have actually sent
      </label>
      <textarea
        id="inspector-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        spellCheck={false}
        className="border-ink/40 bg-yellow-wash focus:border-ink mt-2 w-full resize-y rounded-[2px] border px-3 py-2 text-[0.9375rem] outline-none sm:py-2.5 sm:text-base"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="label text-ink-faint">Or try</span>
        {SAMPLES.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => setText(sample.text)}
            className="tap label border-ink/40 hover:border-ink rounded-[2px] border px-2.5 py-2"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <dl className="border-ink/25 mt-4 grid grid-cols-3 gap-3 border-t pt-3 sm:mt-5 sm:gap-4 sm:pt-4">
        <Stat
          label="Tokens"
          value={tokens === null ? "counting…" : tokens}
          accent
        />
        <Stat label="Characters" value={chars} />
        <Stat label="Parts found" value={`${present}/5`} />
      </dl>

      <p className="text-ink-faint mt-2 text-[0.8125rem] sm:text-sm">
        Tokens measured with the real{" "}
        <span className="font-data">{ENCODING_NAME}</span> encoding
        {encoding ? "" : " (the merge table is still loading)"}. That number is
        exact. The five checks below are not.
      </p>

      <ul className="border-ink/25 mt-4 space-y-2 border-t pt-3 sm:mt-5 sm:space-y-3 sm:pt-4">
        {signals.map((signal) => (
          <Row key={signal.key} signal={signal} />
        ))}
      </ul>

      {/* The caveat is the honest half of this machine, so it never leaves the
          page. On a phone it is one line until asked for, because a paragraph
          of method under the results is a screenful of scrolling. */}
      {phone && !methodOpen ? (
        <button
          type="button"
          onClick={() => setMethodOpen(true)}
          className="tap label text-ink-faint border-ink/20 mt-4 w-full border-t px-1 pt-3 text-left underline underline-offset-2"
        >
          How this check works
        </button>
      ) : (
      <p className="border-ink/20 text-ink-soft mt-4 border-t pt-3 text-[0.8125rem] sm:mt-5 sm:pt-4 sm:text-sm">
        <strong className="font-semibold">How this check works:</strong> it
        looks for the phrasings these five parts usually take in English.
        &ldquo;you are&rdquo;, a verb at the start of a sentence, a word limit,
        the name of a format, &ldquo;for example&rdquo;. It is a pattern match,
        not comprehension. It will miss a constraint you phrased unusually, and
        it will happily tick a box for a role that makes no sense. Read what it
        matched on and decide for yourself.
      </p>
      )}
    </div>
  );
}

function Row({ signal }: { signal: Signal }) {
  const spec = ELEMENTS.find((e) => e.key === signal.key)!;

  return (
    <li className="flex flex-row items-baseline gap-2 sm:gap-4">
      <span
        className={`label w-20 shrink-0 sm:w-28 ${
          signal.present ? "text-teal-text" : "text-pink-text"
        }`}
      >
        {signal.present ? spec.label : `${spec.label}: none`}
      </span>

      {signal.present ? (
        <span className="min-w-0 text-[0.875rem] sm:text-[0.9375rem]">
          <span className="text-ink-faint">matched on </span>
          <span className="data bg-teal-wash rounded-[2px] px-1.5 py-0.5 text-[0.8125rem]">
            {signal.evidence}
          </span>
        </span>
      ) : (
        <span className="min-w-0 text-[0.875rem] sm:text-[0.9375rem]">
          <span className="text-ink-soft">{spec.missing}</span>{" "}
          <span className="data text-ink-faint text-[0.8125rem]">
            {HINTS[signal.key]}
          </span>
        </span>
      )}
    </li>
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
        className={`data text-xl font-semibold sm:text-2xl ${accent ? "text-pink-text" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
