"use client";

import { useCallback, useState } from "react";
import { HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  answer,
  BELT_L,
  BELT_R,
  BELT_Y,
  CARD_H,
  CARD_Y,
  type ConveyorScene,
  danger,
  EDGE_BAND,
  type Message,
  moveCursor,
  newScene,
  ROUND_SECONDS,
  selectAt,
  sendToFront,
  VIEW_H,
  VIEW_W,
} from "@/lib/game/conveyor";
import { useGameLoop } from "@/lib/game/useGameLoop";

/**
 * The conveyor — a chat that runs off the end of the belt.
 *
 * The belt is a fixed physical length, which is the only claim the module makes
 * and the only rule the game enforces. Messages arrive at the right, everything
 * already there is shoved left, and whatever reaches the far end is gone. Not
 * summarised, not archived. Gone.
 *
 * Questions arrive about things said earlier, so the player has to keep the
 * facts that will be needed on the belt — and the only way to do that is to
 * push one back to the front, which costs every other message a shove toward
 * the edge. That trade is the lesson: a context window has no free space, so
 * keeping one thing always spends another.
 */

const PUSH_KEYS = new Set([" ", "Enter"]);
const LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);

export function Conveyor() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  // Not shuffled for the first paint: this scene is rendered on the server too,
  // and a shuffled deck would make the two disagree.
  const [scene, setScene] = useState<ConveyorScene>(() => newScene(false, false));

  const start = useCallback(() => {
    const calm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setScene(newScene(calm));
    setPhase("playing");
  }, []);

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

  const push = useCallback(() => {
    setScene(sendToFront);
  }, []);

  const respond = useCallback((choice: number) => {
    setScene((s) => answer(s, choice));
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase !== "playing") return;
      if (LEFT_KEYS.has(e.key)) {
        e.preventDefault();
        setScene((s) => moveCursor(s, -1));
      } else if (RIGHT_KEYS.has(e.key)) {
        e.preventDefault();
        setScene((s) => moveCursor(s, 1));
      } else if (PUSH_KEYS.has(e.key)) {
        e.preventDefault();
        setScene(sendToFront);
      }
    },
    [phase],
  );

  const { question, verdict } = scene;
  const selected = scene.messages[scene.cursor];
  const asked = scene.recalled + scene.wrong + scene.lost;

  return (
    <GameShell
      gameId="conveyor"
      name="The conveyor"
      instruction="A chat runs along a belt of fixed length. New messages shove the old ones toward the edge, and anything that reaches it is gone for good. Answer questions about what was said — and push the messages you will need back to the front before they fall."
      startLabel="Start the belt"
      phase={phase}
      onStart={start}
      finalScore={scene.score}
      mood={
        verdict?.ink === "var(--teal-text)"
          ? scene.combo >= 3
            ? "celebrate"
            : "cheer"
          : verdict
            ? "wince"
            : question
              ? "think"
              : "idle"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${scene.combo}` },
        { label: "Fell off", value: scene.gone },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">{scene.score} points</p>
          <p className="text-ink-soft mb-1 text-[0.9375rem]">
            {scene.recalled} recalled · {scene.wrong} misread · {scene.lost}{" "}
            lost off the end · {scene.gone} messages gone · best streak ×
            {scene.bestCombo}
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            {scene.lost > 0
              ? "The ones you lost were not forgotten. They were never there to read — they had already left the belt. An assistant in that position does not go quiet, it answers anyway."
              : "You kept what mattered on the belt. That is the whole skill: decide what has to stay, and say it again before it falls off."}
          </p>
        </div>
      }
      footer={
        <>
          The belt holds a fixed length, so every arrival costs something at the
          far end. A real context window is the same deal, measured in tokens
          rather than centimetres.
        </>
      }
    >
      <div
        tabIndex={0}
        role="application"
        aria-label="The conveyor. Left and right arrows select a message, space pushes it back to the front."
        onKeyDown={onKeyDown}
        className="focus-visible:outline-ink block outline-none focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full touch-none select-none"
          aria-hidden="true"
        >
          <HalftoneDefs id="conveyor-halftone" />

          <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

          {/* The end of the belt. Printed as a warning band because it is the
              one bit of geometry the whole lesson turns on. */}
          <rect
            x={0}
            y={CARD_Y - 10}
            width={EDGE_BAND}
            height={BELT_Y - CARD_Y + 14}
            fill="var(--pink-wash)"
          />
          <line
            x1={EDGE_BAND}
            y1={CARD_Y - 10}
            x2={EDGE_BAND}
            y2={BELT_Y + 4}
            stroke="var(--pink)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={EDGE_BAND / 2}
            y={CARD_Y + CARD_H / 2}
            textAnchor="middle"
            fontSize={7}
            letterSpacing={0.8}
            className="data"
            fill="var(--pink-text)"
            transform={`rotate(-90 ${EDGE_BAND / 2} ${CARD_Y + CARD_H / 2})`}
          >
            GONE
          </text>

          <Belt scroll={scene.remaining} calm={scene.calm} />

          {scene.falling.map((f) => (
            <g
              key={f.id}
              transform={`translate(${f.x + f.w / 2} ${f.y + CARD_H / 2}) rotate(${f.angle}) translate(${-f.w / 2} ${-CARD_H / 2})`}
              opacity={0.5}
            >
              <rect
                width={f.w}
                height={CARD_H}
                fill="var(--paper)"
                stroke="var(--ink-faint)"
                strokeWidth={1}
                rx={1}
              />
              <CardText who={f.who} lines={f.lines} w={f.w} muted />
            </g>
          ))}

          {scene.messages.map((m, i) => (
            <Card
              key={m.id}
              message={m}
              selected={i === scene.cursor && phase === "playing"}
              onSelect={() => setScene((s) => selectAt(s, m.id))}
            />
          ))}

          {scene.pops.map((p, i) => (
            <ScorePop key={i} {...p} />
          ))}

          {/* The arrival end, so the direction of travel is never in doubt. */}
          <text
            x={BELT_R}
            y={BELT_Y + 20}
            textAnchor="end"
            fontSize={7}
            letterSpacing={0.8}
            className="data"
            fill="var(--ink-faint)"
          >
            NEW ↓
          </text>
        </svg>

        <div className="border-ink/25 min-h-[8.5rem] border-t p-4">
          {question ? (
            <div aria-live="polite">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <p className="font-display text-[0.9375rem] leading-tight font-bold">
                  {question.ask}
                </p>
                <span className="data text-ink-faint shrink-0 text-xs tabular-nums">
                  {Math.ceil(question.remaining)}s
                </span>
              </div>
              <span
                className="bg-ink/12 mb-3 block h-1 w-full rounded-[1px]"
                aria-hidden="true"
              >
                <span
                  className="bg-pink block h-full rounded-[1px]"
                  style={{
                    width: `${(question.remaining / question.limit) * 100}%`,
                  }}
                />
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {question.options.map((option, i) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => respond(i)}
                    className="font-data border-ink/30 bg-paper hover:border-ink rounded-[2px] border px-3 py-2.5 text-left text-sm transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p
              className={`text-[0.9375rem] ${
                verdict ? "font-semibold" : "text-ink-soft"
              }`}
              style={verdict ? { color: verdict.ink } : undefined}
              aria-live="polite"
            >
              {verdict
                ? verdict.text
                : asked === 0
                  ? "Read the belt. A question about one of these is coming."
                  : "Next question on its way. Push anything you want to keep."}
            </p>
          )}
        </div>

        <div className="border-ink/25 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-ink-faint text-xs">
            <span className="data">← →</span> select ·{" "}
            <span className="data">space</span> push to front · or tap a message
          </p>
          <button
            type="button"
            onClick={push}
            disabled={phase !== "playing" || scene.messages.length < 2}
            className="plate misreg font-display bg-yellow-wash text-yellow-text px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            Push {selected ? `“${selected.lines[0]}”` : "it"} to the front
          </button>
        </div>
      </div>
    </GameShell>
  );
}

/* ------------------------------------------------------------------ parts -- */

/** Rollers under the belt. They only exist to sell the direction of travel. */
function Belt({ scroll, calm }: { scroll: number; calm: boolean }) {
  const offset = calm ? 0 : ((-scroll * 34) % 16) + 16;
  const rollers = [];
  for (let x = BELT_L; x < BELT_R + 16; x += 16) {
    rollers.push(
      <circle
        key={x}
        cx={x + offset}
        cy={BELT_Y + 5}
        r={3.5}
        fill="none"
        stroke="var(--ink-faint)"
        strokeWidth={1}
      />,
    );
  }
  return (
    <>
      <line
        x1={BELT_L}
        y1={BELT_Y}
        x2={BELT_R}
        y2={BELT_Y}
        stroke="var(--ink)"
        strokeWidth={1.5}
      />
      <clipPath id="conveyor-belt-clip">
        <rect x={BELT_L} y={BELT_Y} width={BELT_R - BELT_L} height={14} />
      </clipPath>
      <g clipPath="url(#conveyor-belt-clip)">{rollers}</g>
    </>
  );
}

function CardText({
  who,
  lines,
  w,
  muted,
}: {
  who: string;
  lines: string[];
  w: number;
  muted?: boolean;
}) {
  return (
    <>
      <text
        x={7}
        y={15}
        fontSize={7.5}
        letterSpacing={0.6}
        className="data"
        fill={muted ? "var(--ink-faint)" : "var(--ink-soft)"}
      >
        {who.toUpperCase()}
      </text>
      {lines.map((line, i) => (
        <text
          key={i}
          x={7}
          y={36 + i * 15}
          fontSize={10.5}
          fontWeight={600}
          fill={muted ? "var(--ink-faint)" : "var(--ink)"}
        >
          {line}
        </text>
      ))}
      <line
        x1={7}
        y1={22}
        x2={w - 7}
        y2={22}
        stroke="var(--ink-faint)"
        strokeWidth={0.5}
        opacity={0.6}
      />
    </>
  );
}

function Card({
  message,
  selected,
  onSelect,
}: {
  message: Message;
  selected: boolean;
  onSelect: () => void;
}) {
  const at = danger(message);

  return (
    <g
      transform={`translate(${message.x} ${CARD_Y})`}
      onPointerDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className="cursor-pointer"
    >
      <rect
        width={message.w}
        height={CARD_H}
        fill="var(--paper)"
        stroke={selected ? "var(--yellow)" : "var(--ink)"}
        strokeWidth={selected ? 2.5 : 1}
        rx={1}
      />
      {/* The closer to the edge, the more it reads as about to go. */}
      {at > 0.45 ? (
        <rect
          width={message.w}
          height={CARD_H}
          fill="var(--pink-wash)"
          opacity={(at - 0.45) * 1.8}
        />
      ) : null}
      {message.flash > 0 ? (
        <rect
          width={message.w}
          height={CARD_H}
          fill={message.flashInk}
          opacity={message.flash * 0.35}
        />
      ) : null}
      <CardText who={message.who} lines={message.lines} w={message.w} />
      {message.resent ? (
        <text
          x={message.w - 6}
          y={CARD_H - 7}
          textAnchor="end"
          fontSize={6.5}
          letterSpacing={0.6}
          className="data"
          fill="var(--yellow-text)"
        >
          RESENT
        </text>
      ) : null}
    </g>
  );
}

export { ROUND_SECONDS };
