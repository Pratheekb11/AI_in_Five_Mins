"use client";

import { useState } from "react";
import type { FlagBeat } from "@/lib/check";
import { BeatFrame } from "./BeatFrame";

/**
 * A short passage, some of it false. Tap the parts that are wrong.
 */

type State = { flagged: number[]; checked: boolean };

export function FlagBeatView({
  beat,
  onSettled,
}: {
  beat: FlagBeat;
  onSettled: (fraction: number) => void;
}) {
  const [state, setState] = useState<State>({ flagged: [], checked: false });

  const flagged = new Set(state.flagged);
  const right = beat.parts.filter(
    (part, i) => Boolean(part.wrong) === flagged.has(i),
  ).length;
  const wrongCount = beat.parts.filter((p) => p.wrong).length;

  function toggle(i: number) {
    if (state.checked) return;
    setState({
      flagged: flagged.has(i)
        ? state.flagged.filter((f) => f !== i)
        : [...state.flagged, i],
      checked: false,
    });
  }

  function check() {
    setState({ ...state, checked: true });
    onSettled(right / beat.parts.length);
  }

  return (
    <BeatFrame
      prompt={beat.prompt}
      instruction={beat.instruction}
      checked={state.checked}
      ready={state.flagged.length > 0}
      onCheck={check}
      right={right}
      total={beat.parts.length}
      because={beat.because}
    >
      <p className="flex flex-wrap gap-1.5">
        {beat.parts.map((part, i) => {
          const isFlagged = flagged.has(i);

          let tone = "border-transparent hover:border-ink/40";
          if (isFlagged && !state.checked) {
            tone = "border-yellow bg-yellow-wash text-yellow-text";
          } else if (state.checked && part.wrong && isFlagged) {
            tone = "border-teal bg-teal-wash text-teal-text";
          } else if (state.checked && part.wrong) {
            tone = "border-pink bg-pink-wash text-pink-text";
          } else if (state.checked && isFlagged) {
            tone = "border-ink/40 bg-paper-sunk text-ink-faint line-through";
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={isFlagged}
              disabled={state.checked}
              className={`rounded-[2px] border px-1.5 py-1 text-left text-[0.9375rem] transition-colors ${tone}`}
            >
              {part.text}
            </button>
          );
        })}
      </p>

      {state.checked ? (
        <p className="label text-ink-faint mt-3">
          Teal, you caught it. Pink, you walked past it. There{" "}
          {wrongCount === 1
            ? "was one to catch"
            : `were ${wrongCount} to catch`}
          . Struck through, you flagged something that was fine.
        </p>
      ) : null}
    </BeatFrame>
  );
}
