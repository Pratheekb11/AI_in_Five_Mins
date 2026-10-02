"use client";

import { useState } from "react";
import { dealBy, type SortBeat } from "@/lib/check";
import { BeatFrame } from "./BeatFrame";

/**
 * Items into labelled buckets, by drag or by two taps.
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
              /* The whole bucket takes a tap, not only its title. On a phone
                 the empty body is what a thumb aims at, and tapping it did
                 nothing. The title stays a button for the keyboard; the
                 items inside stop the tap so taking one out is not read as
                 a drop. */
              onClick={() => {
                if (!state.checked && state.held) drop(bucket.id);
              }}
              className={`border-ink/30 bg-paper flex min-h-28 flex-col rounded-[2px] border p-3 ${
                state.held && !state.checked
                  ? "hover:border-ink cursor-pointer"
                  : ""
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  drop(bucket.id);
                }}
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

              <div className="mb-2 flex flex-wrap content-start gap-2">
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
                      onClick={(e) => {
                        e.stopPropagation();
                        unplace(item.id);
                      }}
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

              {/* A real target at the foot of every bucket, the way the match
                  check has one. Tapping the bucket's empty space works too,
                  but a finger landing near an item already placed was snapped
                  onto that item and took it back out. Always drawn, so
                  picking an item up moves nothing; live only while one is
                  held. */}
              {!state.checked ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    drop(bucket.id);
                  }}
                  disabled={!state.held}
                  className={`label mt-auto w-full rounded-[2px] border border-dashed px-3 py-2.5 text-left transition-colors ${
                    state.held
                      ? "border-yellow text-yellow-text hover:bg-yellow-wash cursor-pointer"
                      : "border-ink/25 text-ink-faint"
                  }`}
                >
                  {state.held ? "Put it here" : "drop here"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </BeatFrame>
  );
}
