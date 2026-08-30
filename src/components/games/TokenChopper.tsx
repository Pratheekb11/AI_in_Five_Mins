"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  ENCODING_NAME,
  loadEncoding,
  type Token,
  tokenize,
  VOCAB_SIZE,
} from "@/lib/tokenizer";
import { useNearViewport } from "@/lib/useNearViewport";
import { loadScripts, type ScriptData } from "@/lib/scripts";
import { useIsPhone } from "@/lib/useMedia";

/**
 * Token Chopper, type anything, watch it shatter.
 */

type Encoding = Awaited<ReturnType<typeof loadEncoding>>;

const START = "strawberry";

const TRIES: { label: string; text: string; note: string }[] = [
  {
    label: "strawberry",
    text: "strawberry",
    note: "Ten letters. Count the tiles. This is exactly why it miscounts the r's.",
  },
  {
    label: "A sentence",
    text: "The quick brown fox jumps over the lazy dog.",
    note: "Ordinary English is the cheapest thing you can send. Roughly one token per short word.",
  },
  {
    label: "ಕನ್ನಡ",
    text: "ಕನ್ನಡ ಭಾಷೆಯಲ್ಲಿ ಬರೆದ ಒಂದು ಸಣ್ಣ ವಾಕ್ಯ.",
    note: "Now watch the tile count against the character count. Same length of text, far more tokens.",
  },
  {
    label: "हिन्दी",
    text: "यह हिन्दी में लिखा गया एक छोटा वाक्य है।",
    note: "Devanagari does the same thing. If you are billed per token, this is a surcharge on your own language.",
  },
  {
    label: "Emoji",
    text: "I love this 🎉🍓🇮🇳",
    note: "A single emoji is often several tokens. A flag can be more.",
  },
  {
    label: "Code",
    text: "const total = items.reduce((a, b) => a + b, 0);",
    note: "Punctuation and symbols split hard. Code is dense in tokens for its length.",
  },
  {
    label: "Numbers",
    text: "1234567 and 2026 and 3.14159",
    note: "Long numbers shatter into pieces. This is a large part of why arithmetic goes wrong.",
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
  const phone = useIsPhone();
  const [billOpen, setBillOpen] = useState(false);
  const [encoding, setEncoding] = useState<Encoding | null>(null);
  const [scripts, setScripts] = useState<ScriptData | null>(null);
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
    loadScripts()
      .then((s) => alive && setScripts(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [near]);

  const tokens: Token[] = encoding ? tokenize(encoding, text) : [];
  const characters = [...text].length;
  const perToken = tokens.length > 0 ? characters / tokens.length : 0;

  const tryIt = useCallback((entry: (typeof TRIES)[number]) => {
    setText(entry.text);
    setNote(entry.note);
  }, []);

  const english = scripts?.languages.find((l) => l.code === "en");

  return (
    /* Marked as the game section like every cabinet, even though this one is
       not wrapped in GameShell, so the engagement measure can tell whether a
       reader ever reached it. */
    <div ref={setFrame} className="plate" data-section="game">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-3 border-b px-5 py-3">
        <h3 className="display-md">Token Chopper</h3>
        <p className="label text-ink-faint">
          {/* Pinned locale. A bare toLocaleString() renders 200,006 on the
              server and 2,00,006 in an Indian locale, which is a hydration
              mismatch on the first paint. */}
          {ENCODING_NAME} &middot; {VOCAB_SIZE.toLocaleString("en-US")} tokens
        </p>
      </div>

      <div className="p-5 md:p-6">
        {/* The premise. Without it this is a text box with tiles under it and
            no reason to touch either. */}
        <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-4">
          {phone ? (
            <>
              A model never sees your letters, only the chunks below. This is
              the real splitter.
            </>
          ) : (
            <>
              A model never sees your letters. It sees the chunks below, and
              this is the real splitter one of them uses, running on whatever
              you type.
            </>
          )}
        </p>
        <label className="mb-3 block sm:mb-4">
          <span className="label text-ink-faint mb-1.5 block">
            Type anything. It is cut as you type.
          </span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setNote(null);
            }}
            rows={3}
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
              Loading the real merge table (about 2MB)…
            </p>
          )}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Characters", value: characters },
            { label: "Tokens", value: tokens.length },
            {
              label: "Chars / token",
              value: perToken > 0 ? perToken.toFixed(2) : "-",
            },
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

      {scripts && english ? (
        <div className="border-ink/20 border-t p-4 sm:p-5 md:p-6">
          {/* A second idea, and on a phone a second screenful. It stays one tap
              away rather than pushing the chopper itself off the top. */}
          {phone && !billOpen ? (
            <button
              type="button"
              onClick={() => setBillOpen(true)}
              className="tap label text-ink-faint w-full px-1 py-1.5 text-left underline underline-offset-2"
            >
              What the same text costs in other languages
            </button>
          ) : (
            <>
          <h4 className="display-md mb-1">The bill nobody mentions</h4>
          <p className="prose-measure text-ink-soft mb-4 text-[0.9375rem]">
            The same {scripts.charactersMeasured} characters of Wikipedia, in
            each language, cut by the same tokenizer. You are billed per token,
            so the right-hand column is what your language costs you.
          </p>

          <ul className="space-y-1.5 sm:space-y-2">
            {scripts.languages.map((language) => (
              <li key={language.code} className="flex items-center gap-2 sm:gap-3">
                <span className="w-16 shrink-0 text-[0.875rem] sm:w-24 sm:text-[0.9375rem]">
                  {language.name}
                </span>
                <span className="bg-paper-sunk border-ink/20 h-4 flex-1 overflow-hidden rounded-[1px] border">
                  <motion.span
                    className={`block h-full ${
                      language.code === "en" ? "bg-teal" : "bg-pink"
                    }`}
                    initial={{ width: 0 }}
                    whileInView={{
                      width: `${Math.min(
                        100,
                        (language.tokens /
                          Math.max(...scripts.languages.map((l) => l.tokens))) *
                          100,
                      )}%`,
                    }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </span>
                <span className="data text-ink-soft w-14 shrink-0 text-right text-xs tabular-nums sm:w-20">
                  {language.tokens} tok
                </span>
                <span
                  className={`data w-14 shrink-0 text-right text-xs tabular-nums ${
                    language.timesEnglish > 1.5
                      ? "text-pink-text"
                      : "text-ink-soft"
                  }`}
                >
                  {language.timesEnglish.toFixed(2)}×
                </span>
              </li>
            ))}
          </ul>

          <p className="prose-measure text-ink-faint mt-4 text-[0.8125rem]">
            Japanese is the one to think about. It needs four times the tokens
            per character. But a Japanese character carries far more than a
            Latin one, so per <em>idea</em> it is not four times worse. The
            Indic scripts have no such excuse: they are alphabetic like English,
            and they still cost close to twice as much. Measured{" "}
            {scripts.measuredOn} against {scripts.corpus.name},{" "}
            {scripts.corpus.licence}. Articles are written independently in each
            language, so these are comparable texts on one subject rather than
            translations.
          </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
