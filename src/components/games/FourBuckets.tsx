"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  type BucketId,
  type BucketScene,
  BUCKETS,
  CARD_H,
  CARD_W,
  CARD_X,
  CARD_Y,
  DWELL_LIMIT,
  newScene,
  place,
  type Placement,
  readingOf,
  ROUND_SECONDS,
  TASKS,
  TRAY_H,
  TRAY_W,
  TRAY_X,
  TRAY_Y,
  VIEW_H,
  VIEW_W,
} from "@/lib/game/buckets";
import { useGameLoop } from "@/lib/game/useGameLoop";
import { useOwnTasks } from "@/lib/game/useOwnTasks";

/**
 * Four buckets — sort your own week.
 *
 * There is no right answer in here and nothing marks you against one. What the
 * round produces is a map of what you said, plus the two facts worth knowing
 * about it: which hand-overs would be seen from outside, and which tasks you
 * could not decide quickly.
 *
 * The clock is doing real work rather than decoration. Ten seconds of staring
 * at "reply to a customer complaint" is not deliberation — it is the discovery
 * that you have never decided, which is exactly what you want to find out here
 * rather than at four o'clock on a Friday.
 */

const LANE_KEYS = new Map(BUCKETS.map((b, i) => [b.key, i]));

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function FourBuckets() {
  const { tasks: own } = useOwnTasks();
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  // Not shuffled for the first paint: this scene is rendered on the server too.
  const [scene, setScene] = useState<BucketScene>(() => newScene([], false, false));

  const start = useCallback(() => {
    const calm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setScene(newScene(own, calm));
    setPhase("playing");
  }, [own]);

  useGameLoop(
    useCallback((delta: number) => {
      setScene((s) => advance(s, delta));
    }, []),
    phase === "playing",
  );

  // Decided here rather than inside the updater, which React may run twice.
  if (phase === "playing" && scene.remaining === 0) {
    setPhase("over");
  }

  const drop = useCallback((bucket: BucketId) => {
    setScene((s) => place(s, bucket));
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const down = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const lane = LANE_KEYS.get(e.key);
      if (lane === undefined) return;
      e.preventDefault();
      setScene((s) => place(s, BUCKETS[lane].id));
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [phase]);

  const card = scene.card;
  const dwelling = card ? Math.min(1, card.dwell / DWELL_LIMIT) : 0;

  return (
    <GameShell
      gameId="buckets"
      name="Four buckets"
      instruction="A task from an ordinary week arrives. Decide what you would actually hand to an assistant. There is no right answer and nothing is marking you — but the clock is real, because a task you cannot decide in six seconds is a task you have never decided. Keys 1 to 4, or tap a tray."
      startLabel="Start sorting"
      phase={phase}
      onStart={start}
      finalScore={scene.placed.length}
      mood={
        scene.flash > 0.4
          ? scene.streak >= 4
            ? "celebrate"
            : "cheer"
          : dwelling > 0.75
            ? "think"
            : "idle"
      }
      readouts={[
        { label: "Sorted", value: scene.placed.length, accent: true },
        { label: "Snap", value: `×${scene.streak}` },
        { label: "Stalled", value: scene.hesitations },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={<TaskMap scene={scene} />}
      footer={
        <>
          Nothing here is scored against a correct answer, because there is not
          one &mdash; your job is not our data. The deck is{" "}
          {TASKS.length} written examples plus anything you add below, and your
          own list never leaves this browser.
        </>
      }
    >
      <div>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full touch-none select-none"
          role="application"
          aria-label="Four buckets. Sort each task into hand over, draft with, think with, or keep. Keys one to four."
          tabIndex={0}
        >
          <HalftoneDefs id="buckets-halftone" />

          <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

          {scene.flying.map((f) => {
            const t = Math.min(1, f.t);
            return (
              <g
                key={f.id}
                transform={`translate(${lerp(CARD_X, TRAY_X[f.lane], t)} ${lerp(CARD_Y, TRAY_Y, t)}) scale(${1 - 0.72 * t})`}
                opacity={1 - t}
              >
                <rect
                  x={-CARD_W / 2}
                  y={-CARD_H / 2}
                  width={CARD_W}
                  height={CARD_H}
                  fill="var(--paper-raised)"
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  rx={1}
                />
              </g>
            );
          })}

          {card ? (
            <g transform={`translate(${card.x} ${CARD_Y})`}>
              <rect
                x={-CARD_W / 2 + 4}
                y={-CARD_H / 2 + 4}
                width={CARD_W}
                height={CARD_H}
                fill="var(--ink)"
                opacity={0.14}
              />
              <rect
                x={-CARD_W / 2}
                y={-CARD_H / 2}
                width={CARD_W}
                height={CARD_H}
                fill="var(--paper-raised)"
                stroke="var(--ink)"
                strokeWidth={1.5}
                rx={1}
              />
              <text
                x={-CARD_W / 2 + 14}
                y={-CARD_H / 2 + 19}
                fontSize={9}
                letterSpacing={1}
                className="data"
                fill="var(--ink-faint)"
              >
                {card.task.mine ? "YOUR TASK" : "THIS WEEK"}
              </text>
              {card.lines.map((line, i) => (
                <text
                  key={i}
                  x={0}
                  y={-CARD_H / 2 + 48 + i * 21}
                  textAnchor="middle"
                  fontSize={17}
                  fontWeight={600}
                  fill="var(--ink)"
                >
                  {line}
                </text>
              ))}

              {/* The hesitation meter. It costs nothing and marks nothing —
                  it is there so a stall is something you notice. */}
              <rect
                x={-CARD_W / 2}
                y={CARD_H / 2 - 4}
                width={CARD_W * dwelling}
                height={4}
                fill={dwelling >= 1 ? "var(--pink)" : "var(--yellow)"}
              />
            </g>
          ) : null}

          {BUCKETS.map((bucket, lane) => {
            const hit = scene.flash > 0 && scene.flashLane === lane;
            return (
              <g
                key={bucket.id}
                onPointerDown={(e) => {
                  e.preventDefault();
                  drop(bucket.id);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={TRAY_X[lane] - TRAY_W / 2}
                  y={TRAY_Y - TRAY_H / 2}
                  width={TRAY_W}
                  height={TRAY_H}
                  fill={hit ? "var(--teal-wash)" : "var(--paper)"}
                  stroke="var(--ink)"
                  strokeWidth={hit ? 2.5 : 1}
                  rx={1}
                />
                <text
                  x={TRAY_X[lane]}
                  y={TRAY_Y - 4}
                  textAnchor="middle"
                  fontSize={12}
                  letterSpacing={0.6}
                  className="data"
                  fill="var(--ink)"
                >
                  {bucket.label.toUpperCase()}
                </text>
                <text
                  x={TRAY_X[lane]}
                  y={TRAY_Y + 14}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  className="data"
                  fill="var(--ink-faint)"
                >
                  {scene.counts[bucket.id]}
                </text>
                <text
                  x={TRAY_X[lane] - TRAY_W / 2 + 5}
                  y={TRAY_Y - TRAY_H / 2 + 12}
                  fontSize={9}
                  className="data"
                  fill="var(--ink-faint)"
                >
                  {bucket.key}
                </text>
              </g>
            );
          })}

          <Chips chips={scene.chips} />
          {scene.pops.map((p, i) => (
            <ScorePop key={i} {...p} />
          ))}
        </svg>

        <dl className="border-ink/25 grid gap-x-6 gap-y-2 border-t p-4 sm:grid-cols-2">
          {BUCKETS.map((bucket) => (
            <div key={bucket.id} className="flex gap-2 text-[0.875rem]">
              <dt className="data text-ink-faint shrink-0">{bucket.key}</dt>
              <dd>
                <span className="font-display font-bold">{bucket.label}</span>
                <span className="text-ink-soft"> &mdash; {bucket.means}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </GameShell>
  );
}

/* ------------------------------------------------------------------- map -- */

/** What you said, read back to you. No opinion, only your own answers. */
function TaskMap({ scene }: { scene: BucketScene }) {
  const reading = readingOf(scene.placed);

  return (
    <div className="max-h-full max-w-xl overflow-y-auto text-left">
      <p className="display-md mb-2">{scene.placed.length} tasks sorted</p>

      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        {BUCKETS.map((bucket) => (
          <p key={bucket.id} className="text-[0.8125rem]">
            <span className="data text-ink font-bold">
              {scene.counts[bucket.id]}
            </span>{" "}
            <span className="text-ink-faint">{bucket.label.toLowerCase()}</span>
          </p>
        ))}
      </div>

      {reading.exposedHandovers.length > 0 ? (
        <p className="border-pink bg-pink-wash text-pink-text mb-2 border-l-2 py-1.5 pl-3 text-[0.875rem]">
          <strong className="font-semibold">
            {reading.exposedHandovers.length} of your hand-overs would be seen
            from outside
          </strong>{" "}
          &mdash; {reading.exposedHandovers.map((p) => p.task.text).join("; ")}.
          Not a verdict. Just worth knowing which mistakes leave the building.
        </p>
      ) : null}

      {reading.hesitated.length > 0 ? (
        <div className="mb-2">
          <p className="label text-yellow-text mb-1.5">
            You stalled on these
          </p>
          <ul className="space-y-1">
            {reading.hesitated.slice(0, 4).map((p, i) => (
              <Stall key={i} placement={p} />
            ))}
          </ul>
          <p className="text-ink-soft mt-2 text-[0.875rem]">
            A task you cannot place in six seconds is one you have not decided
            about. Those are the ones to settle now, in the quiet.
          </p>
        </div>
      ) : (
        <p className="text-ink-soft text-[0.875rem]">
          No stalls. Either you have already thought about this, or the deck did
          not hit anything real yet &mdash; add your own tasks below and go
          again.
        </p>
      )}
    </div>
  );
}

function Stall({ placement }: { placement: Placement }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-[0.875rem]">
      <span>{placement.task.text}</span>
      <span className="data text-ink-faint shrink-0 tabular-nums">
        {placement.dwell.toFixed(1)}s
      </span>
    </li>
  );
}

export { ROUND_SECONDS };
