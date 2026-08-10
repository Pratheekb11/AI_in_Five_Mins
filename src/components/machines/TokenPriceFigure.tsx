"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { TOKEN_EXAMPLES } from "@/lib/tokenExamples";

/**
 * The same text, priced, as one strip that never gets replaced.
 */

const bare = TOKEN_EXAMPLES.curiosities.find((c) => c.id === "strawberry")!;
const spaced = TOKEN_EXAMPLES.curiosities.find(
  (c) => c.id === "strawberry-spaced",
)!;
const ROWS = TOKEN_EXAMPLES.multilingual;
const ENGLISH = ROWS.find((r) => r.language === "English")!;

/** A space is a token too, and an invisible tile teaches nothing. */
function visible(text: string) {
  return text.replace(/ /g, "␣");
}

export function TokenPriceFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [picked, setPicked] = useState<{ stage: number; language: string }>();

  const language =
    picked && picked.stage === stage ? picked.language : "English";
  const row = ROWS.find((r) => r.language === language) ?? ENGLISH;

  const showLanguages = stage >= 3;

  /* One list of tiles, whatever the stage is showing. Keys carry the piece
     itself rather than the index so that a tile which survives a stage change
     is animated rather than rebuilt. */
  const tiles: { key: string; text: string }[] = showLanguages
    ? row.tokens.map((t, i) => ({ key: `${language}-${i}`, text: t.text }))
    : stage === 0
      ? bare.text.split("").map((c, i) => ({ key: `letter-${i}`, text: c }))
      : stage === 1
        ? bare.tokens.map((t, i) => ({ key: `bare-${i}`, text: t.text }))
        : spaced.tokens.map((t, i) => ({ key: `spaced-${i}`, text: t.text }));

  const ink =
    stage === 0
      ? { fill: "bg-blue-wash", text: "text-blue-text", edge: "border-blue/40" }
      : stage === 1
        ? {
            fill: "bg-pink-wash",
            text: "text-pink-text",
            edge: "border-pink/40",
          }
        : stage === 2
          ? {
              fill: "bg-teal-wash",
              text: "text-teal-text",
              edge: "border-teal/40",
            }
          : {
              fill: "bg-blue-wash",
              text: "text-blue-text",
              edge: "border-blue/40",
            };

  const count = tiles.length;
  const unit = showLanguages
    ? "tokens"
    : stage === 0
      ? "letters"
      : count === 1
        ? "token"
        : "tokens";

  const caption = showLanguages
    ? `${row.chars} characters, ${row.tokenCount} tokens, ${row.charsPerToken.toFixed(1)} characters per token.`
    : stage === 0
      ? "What you see. Ten separate things, three of them the letter r."
      : stage === 1
        ? bare.note
        : spaced.note;

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <p className="label text-ink-faint">
          {stage === 0
            ? "The word, as you read it"
            : showLanguages
              ? "The same sentence, in one of five languages"
              : "The word, as the model receives it"}
        </p>
        <p className="data text-ink-faint text-xs">{TOKEN_EXAMPLES.encoding}</p>
      </div>

      <div className="px-4 py-5">
        {/* The strip. `layout` is what makes ten tiles become three rather
            than one set vanishing and another appearing in its place. */}
        <div className="mb-5 flex min-h-[3rem] flex-wrap items-center gap-1.5">
          {tiles.map((tile) => (
            <motion.span
              key={tile.key}
              layout={!still}
              initial={still ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
              }}
              className={`font-data rounded-[2px] border px-2.5 py-1.5 text-[0.9375rem] whitespace-pre ${ink.fill} ${ink.text} ${ink.edge}`}
            >
              {visible(tile.text)}
            </motion.span>
          ))}
        </div>

        {/* The counter. It is set in the largest type in the figure because it
            is the only thing here anybody needs to remember. */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="flex items-baseline gap-2">
            <motion.span
              key={`${count}-${unit}`}
              initial={still ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`data text-[2.25rem] leading-none font-bold ${ink.text}`}
            >
              {count}
            </motion.span>
            <span className="label text-ink-faint">{unit}</span>
          </p>

          {showLanguages && row.language !== "English" ? (
            <p className="label text-pink-text">
              {(row.tokenCount / ENGLISH.tokenCount).toFixed(1)}× what English
              costs
            </p>
          ) : null}
        </div>

        <p className="prose-measure text-ink-soft mt-3 text-[0.9375rem]">
          {caption}
        </p>
      </div>

      {showLanguages ? (
        <div className="border-ink/20 flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
          <span className="label text-ink-faint">Try another language</span>
          {ROWS.map((option) => (
            <button
              key={option.language}
              type="button"
              onClick={() => setPicked({ stage, language: option.language })}
              className={`tap font-data rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                option.language === language
                  ? "border-ink bg-paper-sunk"
                  : "border-ink/25 hover:border-ink"
              }`}
            >
              {option.language}
            </button>
          ))}
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {showLanguages
          ? "The same sentence, translated, then measured. Merge tables are built mostly from English text, so other scripts get chopped finer and cost more to send."
          : "Measured with the encoding behind GPT-4o and GPT-5, not an illustration of it."}
      </figcaption>
    </figure>
  );
}
