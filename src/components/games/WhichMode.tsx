"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  aimAt,
  ARM_LEN,
  BIN_H,
  BIN_W,
  BIN_X,
  BIN_Y,
  CARD_H,
  CARD_W,
  CHUTES,
  CONTACT_Y,
  laneFromX,
  MODE_LABEL,
  newScene,
  nudge,
  PIVOT_X,
  PIVOT_Y,
  REQUESTS,
  ROUND_SECONDS,
  VIEW_H,
  VIEW_W,
  type WhichScene,
} from "@/lib/game/whichmode";
import { useGameLoop } from "@/lib/game/useGameLoop";

/**
 * Which mode? — sort requests by what actually has to happen to answer them.
 *
 * A request falls down the middle of a sorter onto a deflector arm, and drops
 * into whichever chute the arm happens to be pointing at: looked up,
 * calculated, read, or guessed. The arm is sprung and carries weight, so a
 * decision made at the last instant is still swinging when the card arrives.
 *
 * That is deliberate. The skill is hearing what a request needs while you are
 * typing it, because "did it look this up, work it out, read it, or guess it"
 * is the question that tells you how far to trust the answer.
 */

const LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);
const LANE_KEYS = new Map([
  ["1", 0],
  ["2", 1],
  ["3", 2],
  ["4", 3],
]);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function WhichMode() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [scene, setScene] = useState<WhichScene>(() => newScene(REQUESTS, false));

  const start = useCallback(() => {
    const calm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setScene(newScene(REQUESTS, calm));
    setPhase("playing");
  }, []);

  useGameLoop(
    useCallback((delta: number) => {
      setScene((s) => advance(s, REQUESTS, delta));
    }, []),
    phase === "playing",
  );

  // Decided here rather than inside the updater, which React may run twice.
  if (phase === "playing" && scene.remaining === 0) {
    setPhase("over");
  }

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
      if (lane !== undefined) {
        e.preventDefault();
        setScene((s) => aimAt(s, lane));
        return;
      }
      if (LEFT_KEYS.has(e.key)) {
        e.preventDefault();
        setScene((s) => nudge(s, -1));
      } else if (RIGHT_KEYS.has(e.key)) {
        e.preventDefault();
        setScene((s) => nudge(s, 1));
      }
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [phase]);

  const pickLane = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    setScene((s) => aimAt(s, laneFromX(x)));
  }, []);

  const { card, last } = scene;
  const graded = scene.right + scene.wrong;

  return (
    <GameShell
      gameId="whichmode"
      name="Which mode?"
      instruction="Requests drop into the sorter one at a time. Point the arm at what actually has to happen to answer it — search the web, run code, open your file, or just write. The arm is sprung and slow, so decide early. Arrow keys, number keys 1 to 4, or tap a chute."
      startLabel="Start the sorter"
      phase={phase}
      onStart={start}
      finalScore={scene.score}
      mood={
        scene.flash > 0.5
          ? last?.ok
            ? scene.combo >= 4
              ? "celebrate"
              : "cheer"
            : "wince"
          : card && !card.sent
            ? "think"
            : "idle"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${scene.combo}` },
        { label: "Routed", value: `${scene.right}/${graded}` },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">{scene.score} points</p>
          <p className="text-ink-soft mb-1 text-[0.9375rem]">
            {scene.right} of {graded} routed right · best streak ×
            {scene.bestCombo}
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            {scene.wrong > graded / 3
              ? "The chute that catches people is the guessing one — because a guessed answer arrives in the same shape, the same tone and the same confidence as a looked-up one. Nothing in the reply tells you which chute it came from. You have to know before you ask."
              : "That is the habit worth keeping: before you read the answer, know which chute it came down. It is the difference between an answer you can act on and an answer that merely reads well."}
          </p>
        </div>
      }
      footer={
        <>
          The four chutes are the four things that can happen behind a reply.
          Only one of them involves the model checking anything against the
          world, and only if it has been given the tool to do it with.
        </>
      }
    >
      <div>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full cursor-pointer touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            pickLane(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 0) pickLane(e);
          }}
          role="application"
          aria-label="Which mode. Point the deflector arm at the chute a request needs: looked up, calculated, read, or guessed. Arrow keys or number keys one to four."
          tabIndex={0}
        >
          <HalftoneDefs id="which-halftone" />

          <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

          {/* the throat the requests drop through */}
          <path
            d={`M ${PIVOT_X - CARD_W / 2 - 10} 0 L ${PIVOT_X - 46} ${PIVOT_Y - 34} M ${PIVOT_X + CARD_W / 2 + 10} 0 L ${PIVOT_X + 46} ${PIVOT_Y - 34}`}
            stroke="var(--ink)"
            strokeWidth={1}
            opacity={0.25}
            fill="none"
          />

          {CHUTES.map((chute, lane) => {
            const aimed = scene.aim === lane;
            const hit =
              scene.flash > 0 && last !== null && last.lane === lane;
            return (
              <g key={chute.mode}>
                {/* guide walls, so the arm visibly points somewhere */}
                <line
                  x1={PIVOT_X}
                  y1={PIVOT_Y + 6}
                  x2={BIN_X[lane]}
                  y2={BIN_Y - BIN_H / 2}
                  stroke={aimed ? "var(--yellow)" : "var(--ink)"}
                  strokeWidth={aimed ? 1.5 : 1}
                  strokeDasharray="4 6"
                  opacity={aimed ? 0.9 : 0.2}
                />
                <rect
                  x={BIN_X[lane] - BIN_W / 2}
                  y={BIN_Y - BIN_H / 2}
                  width={BIN_W}
                  height={BIN_H}
                  fill={
                    hit
                      ? last.ok
                        ? "var(--teal-wash)"
                        : "var(--pink-wash)"
                      : aimed
                        ? "var(--yellow-wash)"
                        : "var(--paper)"
                  }
                  stroke="var(--ink)"
                  strokeWidth={aimed ? 2 : 1}
                  rx={1}
                />
                <text
                  x={BIN_X[lane]}
                  y={BIN_Y - 8}
                  textAnchor="middle"
                  fontSize={11}
                  letterSpacing={0.8}
                  className="data"
                  fill="var(--ink)"
                >
                  {chute.label}
                </text>
                <text
                  x={BIN_X[lane]}
                  y={BIN_Y + 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--ink-faint)"
                >
                  {chute.tool}
                </text>
                <text
                  x={BIN_X[lane] - BIN_W / 2 + 5}
                  y={BIN_Y - BIN_H / 2 + 12}
                  fontSize={9}
                  className="data"
                  fill="var(--ink-faint)"
                >
                  {lane + 1}
                </text>
              </g>
            );
          })}

          {/* the deflector arm — sprung, so it lags behind the decision */}
          <g transform={`rotate(${-scene.arm.angle} ${PIVOT_X} ${PIVOT_Y})`}>
            <line
              x1={PIVOT_X}
              y1={PIVOT_Y}
              x2={PIVOT_X}
              y2={PIVOT_Y + ARM_LEN}
              stroke="var(--ink)"
              strokeWidth={7}
              strokeLinecap="round"
            />
            <line
              x1={PIVOT_X}
              y1={PIVOT_Y}
              x2={PIVOT_X}
              y2={PIVOT_Y + ARM_LEN}
              stroke="var(--yellow)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
          <circle
            cx={PIVOT_X}
            cy={PIVOT_Y}
            r={7}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={2}
          />

          {card ? <Falling card={card} /> : null}

          <Chips chips={scene.chips} />
          {scene.pops.map((p, i) => (
            <ScorePop key={i} {...p} />
          ))}
        </svg>

        <div className="border-ink/25 min-h-[5.5rem] border-t p-4" aria-live="polite">
          {last ? (
            <>
              <p
                className={`font-display mb-1 text-[0.9375rem] font-bold ${
                  last.ok ? "text-teal-text" : "text-pink-text"
                }`}
              >
                {last.ok ? "Right" : "Misrouted"} &mdash; you sent it to{" "}
                {MODE_LABEL[last.chosen].toLowerCase()}
                {last.ok ? "" : `, it needed ${MODE_LABEL[last.actual].toLowerCase()}`}
              </p>
              <p className="text-ink-soft text-[0.9375rem]">{last.note}</p>
            </>
          ) : (
            <p className="text-ink-soft text-[0.9375rem]">
              Read the request as it falls. Ask what would actually have to
              happen for the answer to be true.
            </p>
          )}
        </div>
      </div>
    </GameShell>
  );
}

/* ------------------------------------------------------------------ card -- */

function Falling({ card }: { card: NonNullable<WhichScene["card"]> }) {
  const sent = card.sent;
  const t = sent ? Math.min(1, sent.t) : 0;
  const x = sent ? lerp(PIVOT_X, BIN_X[sent.lane], t) : PIVOT_X;
  const y = sent ? lerp(CONTACT_Y, BIN_Y - 6, t) : card.y;
  const scale = 1 - 0.62 * t;
  const tilt = sent ? (BIN_X[sent.lane] - PIVOT_X) * 0.04 * t : 0;

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${tilt}) scale(${scale})`}
      opacity={1 - t * 0.45}
    >
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
      {sent ? (
        <rect
          x={-CARD_W / 2}
          y={-CARD_H / 2}
          width={CARD_W}
          height={CARD_H}
          fill={sent.ok ? "var(--teal)" : "var(--pink)"}
          opacity={t * 0.3}
        />
      ) : null}
      <text
        x={-CARD_W / 2 + 16}
        y={-CARD_H / 2 + 20}
        fontSize={9}
        letterSpacing={1}
        className="data"
        fill="var(--ink-faint)"
      >
        REQUEST
      </text>
      {card.lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={-CARD_H / 2 + 46 + i * 21}
          textAnchor="middle"
          fontSize={17}
          fontWeight={600}
          fill="var(--ink)"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export { ROUND_SECONDS };
