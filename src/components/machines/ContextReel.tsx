"use client";

import { useMemo } from "react";
import { Reel, useReel, type ReelStep } from "./Reel";

/**
 * Chapter 3, played rather than read. One chat window, three slots. Nothing
 * in it, then the email, then chat that pushes the email out, then the email
 * pasted back. Under it, what the model actually said each time and its
 * measured chance of the right answer, from `context.json`.
 */

export type ContextShot = {
  /** Card ids in the window, oldest first. */
  cards: string[];
  /** A card that has just been pushed out, drawn leaving. */
  dropped?: string;
  says: string;
  probability: number;
};

export function ContextReel({
  ask,
  answer,
  cards,
  shots,
}: {
  ask: string;
  answer: string;
  cards: Record<string, { label: string; text: string; relevant: boolean }>;
  /** Exactly four: empty, pasted, pushed out, pasted back. */
  shots: [ContextShot, ContextShot, ContextShot, ContextShot];
}) {
  const steps = useMemo<ReelStep[]>(
    () => [
      {
        label: "Empty",
        caption: `Nothing pasted in. It makes up an answer: “${shots[0].says}”`,
        ms: 3600,
      },
      {
        label: "Pasted",
        caption: `Paste the email and it reads the answer: “${shots[1].says}”`,
        ms: 3600,
      },
      {
        label: "Dropped",
        caption: `Chat fills the window and the email drops out. Now it guesses: “${shots[2].says}”`,
        ms: 4400,
      },
      {
        label: "Again",
        caption:
          "Paste it back and it is right again. Do not ask it to remember. Re-paste.",
        ms: 4400,
      },
    ],
    [shots],
  );

  const { ref, at } = useReel(steps);
  const shot = shots[at];
  const right = shot.says.toLowerCase().startsWith(answer.toLowerCase());

  return (
    <Reel
      steps={steps}
      at={at}
      frameRef={ref}
      tone={right ? "good" : "bad"}
      footnote="What it says and the chance are DistilGPT-2's real output on exactly these cards."
    >
      <p className="label text-ink-faint mb-1.5">What the AI can read</p>
      <ul className="border-ink/30 mb-3 min-h-[8.75rem] space-y-1.5 rounded-[2px] border border-dashed p-2">
        {shot.dropped ? (
          <li
            key={`gone-${at}`}
            className="text-ink-faint truncate px-2 py-1 text-[0.8125rem] line-through"
            style={{ animation: "ink-pop 0.4s ease-out both" }}
          >
            {cards[shot.dropped].label} dropped out
          </li>
        ) : null}
        {shot.cards.map((id, i) => (
          <li
            key={`${at}-${id}`}
            className={`truncate rounded-[2px] border px-2 py-1 text-[0.8125rem] ${
              cards[id].relevant
                ? "border-yellow bg-yellow-wash font-semibold"
                : "border-ink/30 bg-paper-raised"
            }`}
            style={{ animation: `ink-pop 0.35s ease-out ${i * 0.15}s both` }}
          >
            {cards[id].text}
          </li>
        ))}
        {shot.cards.length === 0 && !shot.dropped ? (
          <li className="text-ink-faint px-2 py-1 text-[0.8125rem]">
            Nothing here.
          </li>
        ) : null}
      </ul>

      <p className="text-[1rem]">
        <span className="text-ink-soft">{ask}</span>{" "}
        <span
          key={at}
          className={`data rounded-[2px] px-1.5 py-0.5 font-bold ${
            right
              ? "bg-teal-wash text-teal-text"
              : "bg-pink-wash text-pink-text"
          }`}
          style={{ animation: "ink-pop 0.35s ease-out 0.5s both" }}
        >
          {shot.says}
        </span>
      </p>

      <div className="mt-3 flex items-center gap-3">
        <span className="label text-ink-faint shrink-0">
          Chance of &ldquo;{answer}&rdquo;
        </span>
        <span className="bg-paper-sunk border-ink/20 block h-3 grow overflow-hidden rounded-[1px] border">
          <span
            className={`block h-full transition-[width] delay-500 duration-700 ease-out ${right ? "bg-teal" : "bg-pink"}`}
            style={{ width: `${Math.max(shot.probability * 100, 1)}%` }}
          />
        </span>
        <span className="data w-12 shrink-0 text-right text-xs tabular-nums">
          {(shot.probability * 100).toFixed(1)}%
        </span>
      </div>
    </Reel>
  );
}
