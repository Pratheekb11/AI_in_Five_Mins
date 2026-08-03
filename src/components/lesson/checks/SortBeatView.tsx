"use client";

import { useState } from "react";
import { dealBy, type SortBeat } from "@/lib/check";
import { BeatFrame } from "./BeatFrame";

/**
 * Items into labelled buckets, by drag or by two taps.
 *
 * Both input paths exist because neither one covers everybody: HTML5 drag does
 * nothing on a phone, and a drag-only check would be unusable for anyone on a
 * keyboard. Tap-to-pick then tap-to-drop is the primary interaction and drag is
 * the enhancement, so the same state drives both.
 */

type State = {
  /** Item id to bucket id. Absent means still in the tray. */
  placed: Record<string, string>;
  /** The item currently lifted, by drag or by tap. */
  held: string | null;
  checked: boolean;
};

export function SortBeatView({
  beat,
  onSettled,
}: {
  beat: SortBeat;
  onSettled: (fraction: number) => void;
}) {
  const [state, setState] = useState<State>({
    placed: {},
    held: null,
    checked: false,
  });

  const items = dealBy(beat.items, beat.prompt);
  const tray = items.filter((item) => !(item.id in state.placed));
  const right = beat.items.filter(
    (item) => state.placed[item.id] === item.bucket,
  ).length;
  const ready = tray.length === 0;

  function hold(id: string) {
    if (state.checked) return;
    setState({ ...state, held: state.held === id ? null : id });
  }

  function drop(bucketId: string) {
    if (state.checked || !state.held) return;
    setState({
      ...state,
      placed: { ...state.placed, [state.held]: bucketId },
      held: null,
    });
  }

  function unplace(id: string) {
    if (state.checked) return;
    const placed = { ...state.placed };
    delete placed[id];
    setState({ ...state, placed, held: null });
  }

  function check() {
    setState({ ...state, held: null, checked: true });
    onSettled(right / beat.items.length);
  }

  return (
    <BeatFrame
      prompt={beat.prompt}
      instruction="Tap an item, then tap where it belongs. Dragging works too."
      checked={state.checked}
      ready={ready}
      onCheck={check}
      right={right}
      total={beat.items.length}
      because={beat.because}
    >
      {tray.length > 0 ? (
        <div className="border-ink/25 bg-paper-sunk mb-4 flex flex-wrap gap-2 rounded-[2px] border border-dashed p-3">
          {tray.map((item) => (
            <button
              key={item.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", item.id);
                setState((s) => ({ ...s, held: item.id }));
              }}
              onClick={() => hold(item.id)}
              aria-pressed={state.held === item.id}
              className={`rounded-[2px] border px-3 py-1.5 text-left text-[0.9375rem] transition-colors ${
                state.held === item.id
                  ? "border-yellow bg-yellow-wash text-yellow-text"
                  : "border-ink/30 bg-paper hover:border-ink"
              }`}
            >
              {item.text}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {beat.buckets.map((bucket) => {
          const inside = items.filter(
            (item) => state.placed[item.id] === bucket.id,
          );

          return (
            <div
              key={bucket.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                drop(bucket.id);
              }}
              className="border-ink/30 bg-paper flex min-h-28 flex-col rounded-[2px] border p-3"
            >
              <button
                type="button"
                onClick={() => drop(bucket.id)}
                disabled={state.checked || !state.held}
                className="mb-2 text-left disabled:cursor-default"
              >
                <span className="font-display block text-sm font-bold">
                  {bucket.label}
                </span>
                {bucket.hint ? (
                  <span className="label text-ink-faint">{bucket.hint}</span>
                ) : null}
              </button>

              <div className="flex flex-wrap content-start gap-2">
                {inside.map((item) => {
                  const correct = item.bucket === bucket.id;
                  let tone = "border-ink/30 bg-paper";
                  if (state.checked) {
                    tone = correct
                      ? "border-teal bg-teal-wash text-teal-text"
                      : "border-pink bg-pink-wash text-pink-text";
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => unplace(item.id)}
                      disabled={state.checked}
                      className={`rounded-[2px] border px-2.5 py-1 text-left text-sm ${tone}`}
                    >
                      {item.text}
                      {state.checked && !correct ? (
                        <span className="label mt-0.5 block opacity-80">
                          {
                            beat.buckets.find((b) => b.id === item.bucket)
                              ?.label
                          }
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </BeatFrame>
  );
}
