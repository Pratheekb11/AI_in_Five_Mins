"use client";

import { useState } from "react";
import { SpeechButton } from "./SpeechButton";

/**
 * The rule the practical track is built on: if you cannot explain it to a
 * twelve-year-old without jargon, you do not understand it yet.
 *
 * The learner writes their explanation before seeing ours. That order matters —
 * reading a good answer first feels like understanding and usually isn't. The
 * jargon check is deliberately blunt and says so; it is a nudge, not a grader.
 */

/** Words that almost always mean an explanation has stopped explaining. */
const JARGON = [
  "algorithm",
  "neural",
  "parameter",
  "token",
  "embedding",
  "transformer",
  "vector",
  "model",
  "training data",
  "inference",
  "architecture",
  "weights",
  "probability distribution",
  "llm",
  "gpt",
  "machine learning",
  "dataset",
];

export function FeynmanCheck({
  question,
  answer,
}: {
  /** The question they must be able to answer in plain words. */
  question: string;
  /** What a good plain-language answer sounds like. */
  answer: string;
}) {
  const [written, setWritten] = useState("");
  const [revealed, setRevealed] = useState(false);

  const lower = written.toLowerCase();
  const found = JARGON.filter((word) => lower.includes(word));
  const words = written.trim().split(/\s+/).filter(Boolean).length;
  const enough = words >= 12;

  return (
    <section className="plate p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="label text-ink-faint mb-2">
            Explain it to a twelve-year-old
          </p>
          <h3 className="display-md">{question}</h3>
        </div>
        <SpeechButton text={question} />
      </div>

      <label htmlFor="feynman" className="label text-ink-faint">
        Say it in your own words. Out loud is better.
      </label>
      <textarea
        id="feynman"
        value={written}
        onChange={(e) => setWritten(e.target.value)}
        rows={4}
        placeholder="Because…"
        className="border-ink/40 bg-paper-sunk focus:border-ink mt-2 w-full resize-y rounded-[2px] border px-3 py-2.5 text-base outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="data text-ink-faint text-xs">
          {words} word{words === 1 ? "" : "s"}
        </span>
        {found.length > 0 ? (
          <span className="label text-pink-text">
            jargon spotted: {found.slice(0, 3).join(", ")}
          </span>
        ) : enough ? (
          <span className="label text-teal-text">no jargon — good</span>
        ) : null}
      </div>

      {found.length > 0 ? (
        <p className="text-ink-soft mt-3 text-sm">
          Those words might be doing the work a real explanation should be
          doing. Try again without them. This check is a crude word match, not a
          judgement of what you wrote.
        </p>
      ) : null}

      <div className="border-ink/20 mt-5 border-t pt-4">
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            disabled={!enough}
            className="plate misreg font-display px-4 py-2.5 font-bold disabled:opacity-40"
          >
            {enough ? "Compare with ours" : "Write a little more first"}
          </button>
        ) : (
          <div>
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="label text-ink-faint">One way to put it</p>
              <SpeechButton text={answer} />
            </div>
            <p className="prose-measure text-[0.9375rem]">{answer}</p>
            <p className="text-ink-faint mt-3 text-sm">
              Yours does not have to match. If it lands the same idea in
              different words, you have it.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
