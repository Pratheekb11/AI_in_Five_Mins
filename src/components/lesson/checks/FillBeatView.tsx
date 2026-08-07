"use client";

import { useState } from "react";
import { dealBy, type FillBeat } from "@/lib/check";
import { BeatFrame } from "./BeatFrame";

/**
 * A sentence with gaps in it, and a pool of words to drop into them.
 *
 * The pool carries one or two options too many where the beat calls for it, so
 * that the last gap cannot be filled by elimination alone. A gap that fills
 * itself teaches nothing.
 */

type State = {
  /** Blank id to option id. */
  filled: Record<string, string>;
  held: string | null;
  checked: boolean;
};

export function FillBeatView({
  beat,
  onSettled,
}: {
  beat: FillBeat;
  onSettled: (fraction: number) => void;
}) {
  const [state, setState] = useState<State>({
    filled: {},
    held: null,
    checked: false,
  });

  const options = dealBy(beat.options, beat.prompt);
  const blanks = beat.segments.filter(
    (s): s is { blank: string } => typeof s !== "string",
  );
  const used = new Set(Object.values(state.filled));
  const pool = options.filter((o) => !used.has(o.id));

  /* A gap takes the option whose id matches it: authoring a pair means giving
     the option and the blank the same id, which keeps the data readable. */
  const right = blanks.filter((b) => state.filled[b.blank] === b.blank).length;
  const textOf = (id: string) => beat.options.find((o) => o.id === id)?.text;

  function fill(blankId: string) {
    if (state.checked || !state.held) return;
    setState({
      ...state,
      filled: { ...state.filled, [blankId]: state.held },
      held: null,
    });
  }

  function clear(blankId: string) {
    if (state.checked) return;
    const filled = { ...state.filled };
    delete filled[blankId];
    setState({ ...state, filled, held: null });
  }

  function check() {
    setState({ ...state, held: null, checked: true });
    onSettled(right / blanks.length);
  }

  return (
    <BeatFrame
      prompt={beat.prompt}
      instruction="Tap a word, then tap the gap it goes in."
      checked={state.checked}
      ready={Object.keys(state.filled).length === blanks.length}
      onCheck={check}
      right={right}
      total={blanks.length}
      because={beat.because}
    >
      <p className="text-[1.0625rem] leading-loose">
        {beat.segments.map((segment, i) => {
          if (typeof segment === "string") return <span key={i}>{segment}</span>;

          const chosen = state.filled[segment.blank];
          const correct = chosen === segment.blank;

          let tone = "border-ink/40 border-dashed bg-paper-sunk text-ink-faint";
          if (chosen && !state.checked) {
            tone = "border-ink/50 bg-paper";
          } else if (state.checked) {
            tone = correct
              ? "border-teal bg-teal-wash text-teal-text"
              : "border-pink bg-pink-wash text-pink-text";
          }

          return (
            <button
              key={i}
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                fill(segment.blank);
              }}
              onClick={() =>
                chosen ? clear(segment.blank) : fill(segment.blank)
              }
              disabled={state.checked || (!chosen && !state.held)}
              className={`mx-1 rounded-[2px] border px-2 py-0.5 align-baseline text-[0.9375rem] ${tone}`}
            >
              {chosen ? textOf(chosen) : "     "}
            </button>
          );
        })}
      </p>

      {state.checked ? (
        <p className="label text-ink-faint mt-3">
          {blanks
            .map((b) => `${textOf(b.blank)}`)
            .join(" · ")}{" "}
        , in that order.
        </p>
      ) : pool.length > 0 ? (
        <div className="border-ink/25 bg-paper-sunk mt-4 flex flex-wrap gap-2 rounded-[2px] border border-dashed p-3">
          {pool.map((option) => (
            <button
              key={option.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", option.id);
                setState((s) => ({ ...s, held: option.id }));
              }}
              onClick={() =>
                setState({
                  ...state,
                  held: state.held === option.id ? null : option.id,
                })
              }
              aria-pressed={state.held === option.id}
              className={`rounded-[2px] border px-3 py-1.5 text-[0.9375rem] transition-colors ${
                state.held === option.id
                  ? "border-yellow bg-yellow-wash text-yellow-text"
                  : "border-ink/30 bg-paper hover:border-ink"
              }`}
            >
              {option.text}
            </button>
          ))}
        </div>
      ) : null}
    </BeatFrame>
  );
}
