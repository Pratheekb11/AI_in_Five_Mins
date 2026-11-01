"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { loadEncoding, type Token, tokenize } from "@/lib/tokenizer";
import { useNearViewport } from "@/lib/useNearViewport";

/**
 * Token Chopper, type anything, watch it shatter.
 */

type Encoding = Awaited<ReturnType<typeof loadEncoding>>;

const START = "strawberry";

const TRIES: { label: string; text: string; note: string }[] = [
  {
    label: "strawberry",
    text: "strawberry",
    note: "Ten letters, but only a few chunks. The AI never sees the r's on their own.",
  },
  {
    label: "A sentence",
    text: "The quick brown fox jumps over the lazy dog.",
    note: "Everyday English: about one chunk per word. The cheapest text there is.",
  },
  {
    label: "हिन्दी",
    text: "यह हिन्दी में लिखा गया एक छोटा वाक्य है।",
    note: "A short Hindi sentence takes far more chunks. You pay per chunk.",
  },
  {
    label: "Numbers",
    text: "1234567 and 2026 and 3.14159",
    note: "Long numbers break into odd pieces. One reason AI is shaky at maths.",
  },
];

/** Stable colour per tile, so neighbouring tiles never share one. */
const TILE_INKS = [
  "bg-blue-wash text-blue-text border-blue",
  "bg-pink-wash text-pink-text border-pink",
  "bg-yellow-wash text-yellow-text border-yellow",
  "bg-teal-wash text-teal-text border-teal",
];

export function TokenChopper() {
  const [encoding, setEncoding] = useState<Encoding | null>(null);
  const [text, setText] = useState(START);
  const [note, setNote] = useState<string | null>(TRIES[0].note);

  /* The o200k vocabulary behind this is 998 KB gzipped, and a deck keeps every
     beat in the DOM, so this used to be fetched and parsed for a reader
     several beats away from the board. Nothing is asked for until the board
     itself is near the screen. */
  const [setFrame, near] = useNearViewport();
  useEffect(() => {
    if (!near) return;
    let alive = true;
    loadEncoding().then((e) => alive && setEncoding(e));
    return () => {
      alive = false;
    };
  }, [near]);

  const tokens: Token[] = encoding ? tokenize(encoding, text) : [];
  const characters = [...text].length;

  const tryIt = useCallback((entry: (typeof TRIES)[number]) => {
    setText(entry.text);
    setNote(entry.note);
  }, []);


  return (
    /* Marked as the game section like every cabinet, even though this one is
       not wrapped in GameShell, so the engagement measure can tell whether a
       reader ever reached it. */
    <div ref={setFrame} className="plate" data-section="game" data-ph-mask>
      <div className="border-ink/20 border-b px-5 py-3">
        <h3 className="display-md">Token Chopper</h3>
      </div>

      <div className="p-5 md:p-6">
        <label className="mb-3 block sm:mb-4">
          <span className="text-ink-soft mb-1.5 block text-[0.9375rem]">
            Type anything, or tap an example. You see letters; the AI sees the
            chunks below.
          </span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setNote(null);
            }}
            rows={2}
            spellCheck={false}
            className="font-data border-ink/30 bg-paper-sunk focus:border-ink w-full resize-y rounded-[2px] border px-4 py-3 text-[1.0625rem] outline-none"
            placeholder="strawberry"
          />
        </label>

        <div className="mb-3 flex flex-wrap gap-2 sm:mb-4">
          {TRIES.map((entry) => (
            <button
              key={entry.label}
              type="button"
              onClick={() => tryIt(entry)}
              className="tap plate hover:border-ink cursor-pointer px-3 py-1.5 text-[0.875rem]"
            >
              {entry.label}
            </button>
          ))}
        </div>

        {/* The tiles. They move, because the point is that your text is being
            taken apart, a still picture of the result does not say that. */}
        <div className="bg-paper-sunk border-ink/20 mb-4 min-h-[4rem] sm:min-h-[6rem] rounded-[2px] border p-3">
          {encoding ? (
            tokens.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {tokens.map((token) => (
                    <motion.span
                      key={`${token.index}-${token.id}`}
                      layout
                      initial={{ opacity: 0, scale: 0.6, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      title={`token ${token.id}`}
                      className={`font-data rounded-[2px] border px-1.5 py-1 text-[0.9375rem] whitespace-pre ${
                        TILE_INKS[token.index % TILE_INKS.length]
                      }`}
                    >
                      {token.text === " "
                        ? "␣"
                        : token.text.replace(/\n/g, "⏎")}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="text-ink-soft text-[0.9375rem]">
                Nothing to cut yet.
              </p>
            )
          ) : (
            <p className="text-ink-soft text-[0.9375rem]">
              Loading the real tokenizer…
            </p>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {[
            { label: "Letters you see", value: characters },
            { label: "Chunks the AI sees", value: tokens.length },
          ].map((readout) => (
            <div key={readout.label} className="plate-flush px-3 py-2">
              <p className="label text-ink-faint">{readout.label}</p>
              <motion.p
                key={String(readout.value)}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                className="data text-[1.25rem] tabular-nums"
              >
                {readout.value}
              </motion.p>
            </div>
          ))}
        </div>

        <div className="min-h-[2.5rem]" aria-live="polite">
          {note ? (
            <motion.p
              key={note}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose-measure text-ink-soft text-[0.9375rem]"
            >
              {note}
            </motion.p>
          ) : null}
        </div>
      </div>

    </div>
  );
}
