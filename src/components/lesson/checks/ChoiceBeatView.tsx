"use client";

import { useState } from "react";
import { dealBy, type ChoiceBeat } from "@/lib/check";

/**
 * The one multiple-choice question a check is still allowed.
 */
export function ChoiceBeatView({
  beat,
  onSettled,
}: {
  beat: ChoiceBeat;
  onSettled: (fraction: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  const order = dealBy(
    beat.options.map((text, i) => ({ text, i })),
    beat.prompt,
  );
  const answer = order.findIndex((o) => o.i === beat.answer);
  const revealed = picked !== null;

  function pick(index: number) {
    if (revealed) return;
    setPicked(index);
    onSettled(index === answer ? 1 : 0);
  }

  return (
    <li className="plate p-5">
      <p className="font-display mb-4 text-lg font-bold">{beat.prompt}</p>

      <div className="grid gap-2">
        {order.map((option, oi) => {
          const isAnswer = oi === answer;
          const isPicked = picked === oi;

          let tone = "border-ink/30 bg-paper";
          if (revealed && isAnswer) {
            tone = "border-teal bg-teal-wash text-teal-text";
          } else if (revealed && isPicked) {
            tone = "border-pink bg-pink-wash text-pink-text";
          } else if (revealed) {
            tone = "border-ink/20 bg-paper opacity-50";
          }

          return (
            <button
              key={oi}
              type="button"
              disabled={revealed}
              onClick={() => pick(oi)}
              className={`flex items-start gap-3 rounded-[2px] border px-3.5 py-2.5 text-left transition-colors ${tone} ${
                revealed ? "cursor-default" : "hover:border-ink"
              }`}
            >
              <span className="data mt-0.5 text-xs opacity-60">
                {String.fromCharCode(65 + oi)}
              </span>
              <span className="text-[0.9375rem]">{option.text}</span>
              {revealed && isAnswer ? (
                <span className="label ml-auto shrink-0 pt-1">Correct</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {revealed ? (
        <p className="border-ink/20 text-ink-soft mt-4 border-t pt-3.5 text-[0.9375rem]">
          {beat.because}
        </p>
      ) : null}
    </li>
  );
}
