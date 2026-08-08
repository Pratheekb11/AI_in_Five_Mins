"use client";

import { useState } from "react";
import { dealBy, type MatchBeat } from "@/lib/check";
import { BeatFrame } from "./BeatFrame";

/**
 * Match the following: fixed rows on the left, a dealt pool on the right.
 *
 * The pool shrinks as answers are pinned, which means the last pair is free.
 * That is deliberate, the point of the beat is the reasoning about the first
 * few, and leaving one impossible-to-get-wrong pair at the end is a kinder
 * ending than a lucky guess deciding the score.
 */

type State = {
  /** Left text to right text. */
  pinned: Record<string, string>;
  held: string | null;
  checked: boolean;
};

export function MatchBeatView({
  beat,
  onSettled,
}: {
  beat: MatchBeat;
  onSettled: (fraction: number) => void;
}) {
  const [state, setState] = useState<State>({
    pinned: {},
    held: null,
    checked: false,
  });

  const rights = dealBy(
    beat.pairs.map((p) => p.right),
    beat.prompt,
  );
  const used = new Set(Object.values(state.pinned));
  const pool = rights.filter((text) => !used.has(text));
  const right = beat.pairs.filter(
    (p) => state.pinned[p.left] === p.right,
  ).length;

  function pin(leftText: string) {
    if (state.checked || !state.held) return;
    setState({
      ...state,
      pinned: { ...state.pinned, [leftText]: state.held },
      held: null,
    });
  }

  function unpin(leftText: string) {
    if (state.checked) return;
    const pinned = { ...state.pinned };
    delete pinned[leftText];
    setState({ ...state, pinned, held: null });
  }

  function check() {
    setState({ ...state, held: null, checked: true });
    onSettled(right / beat.pairs.length);
  }

  return (
    <BeatFrame
      prompt={beat.prompt}
      instruction="Tap one from the pool, then tap the row it belongs to."
      checked={state.checked}
      ready={Object.keys(state.pinned).length === beat.pairs.length}
      onCheck={check}
      right={right}
      total={beat.pairs.length}
      because={beat.because}
    >
      {pool.length > 0 ? (
        <div className="border-ink/25 bg-paper-sunk mb-4 flex flex-wrap gap-2 rounded-[2px] border border-dashed p-3">
          {pool.map((text) => (
            <button
              key={text}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", text);
                setState((s) => ({ ...s, held: text }));
              }}
              onClick={() =>
                setState({
                  ...state,
                  held: state.held === text ? null : text,
                })
              }
              aria-pressed={state.held === text}
              className={`rounded-[2px] border px-3 py-1.5 text-left text-[0.9375rem] transition-colors ${
                state.held === text
                  ? "border-yellow bg-yellow-wash text-yellow-text"
                  : "border-ink/30 bg-paper hover:border-ink"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="space-y-2">
        {beat.pairs.map((pair) => {
          const answer = state.pinned[pair.left];
          const correct = answer === pair.right;

          let tone = "border-ink/30 border-dashed bg-paper-sunk text-ink-faint";
          if (answer && !state.checked) {
            tone = "border-ink/40 bg-paper";
          } else if (state.checked) {
            tone = correct
              ? "border-teal bg-teal-wash text-teal-text"
              : "border-pink bg-pink-wash text-pink-text";
          }

          return (
            <li
              key={pair.left}
              className="grid items-stretch gap-2 sm:grid-cols-2"
            >
              <div className="border-ink/30 bg-paper flex items-center rounded-[2px] border px-3 py-2 text-[0.9375rem]">
                {pair.left}
              </div>

              <button
                type="button"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pin(pair.left);
                }}
                onClick={() => (answer ? unpin(pair.left) : pin(pair.left))}
                disabled={state.checked || (!answer && !state.held)}
                className={`rounded-[2px] border px-3 py-2 text-left text-[0.9375rem] ${tone}`}
              >
                {answer ?? "drop here"}
                {state.checked && !correct ? (
                  <span className="label mt-1 block opacity-80">
                    {pair.right}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BeatFrame>
  );
}
