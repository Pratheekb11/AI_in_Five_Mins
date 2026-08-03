"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  type Door,
  DOOR_H,
  DOOR_W,
  DOOR_X,
  DOOR_Y,
  DOORS,
  doorSpec,
  ITEM_H,
  ITEM_W,
  ITEM_Y,
  type Judgement,
  KIND_LABEL,
  LEAK_LIMIT,
  newScene,
  type PasteScene,
  route,
  ROUND_SECONDS,
  VIEW_H,
  VIEW_W,
  verdictOf,
} from "@/lib/game/paste";
import { useGameLoop } from "@/lib/game/useGameLoop";

/**
 * Would you paste it? — the last judgement call in the track.
 *
 * Things you might drop into a chat window come along a belt, and there are
 * three doors: paste it, strip the identifying parts first, or keep it out.
 *
 * The categories are real ones from data protection law and are cited on the
 * page. The routing rule is ours and is stated plainly, because the honest
 * answer depends on your employer's policy and the terms of the specific tool.
 *
 * Two failure directions are scored, on purpose. Pasting something that was
 * not yours to paste fills a leak meter and ends the round. Refusing things
 * that were harmless costs you too — a policy of "never paste anything" is not
 * caution, it is a decision to stop using the tool while pretending otherwise.
 */

const KEY_TO_DOOR = new Map(DOORS.map((d) => [d.key, d.id]));

export function WouldYouPaste() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [scene, setScene] = useState<PasteScene>(() => newScene(1, false));

  const start = useCallback(() => {
    const calm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setScene(newScene((Math.random() * 2 ** 31) >>> 0, calm));
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

  const send = useCallback((door: Door) => {
    setScene((s) => route(s, door));
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
      const door = KEY_TO_DOOR.get(e.key);
      if (!door) return;
      e.preventDefault();
      setScene((s) => route(s, door));
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [phase]);

  const item = scene.item;
  const last = scene.last;
  const verdict = last ? verdictOf(last) : null;

  return (
    <GameShell
      gameId="paste"
      name="Would you paste it?"
      instruction="Things you might drop into a chat window come past. Three doors: paste it as it is, strip the identifying parts first, or keep it out of the tool entirely. Three leak marks and the round stops — but refusing everything is not caution either, and it costs you too."
      startLabel="Start the belt"
      phase={phase}
      onStart={start}
      finalScore={scene.score}
      mood={
        scene.ribbonLife > 1.6 && last
          ? last.outcome === "leak"
            ? "wince"
            : last.outcome === "exact"
              ? scene.streak >= 4
                ? "celebrate"
                : "cheer"
              : "think"
          : "idle"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${scene.streak}` },
        { label: "Leaks", value: `${scene.leakUnits}/${LEAK_LIMIT}` },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={<Report scene={scene} />}
      footer={
        <>
          The categories are the legal ones and are cited below. The routing
          rule is this module&rsquo;s: public or your own goes in, anything
          identifying a living person gets stripped first, and special category
          or somebody else&rsquo;s confidential material stays out unless your
          organisation has approved tooling for it. Sensible default, not legal
          advice.
        </>
      }
    >
      <div>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full touch-none select-none"
          aria-hidden="true"
        >
          <HalftoneDefs id="paste-halftone" />

          <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

          {/* the leak gauge — the round ends when it fills */}
          <text
            x={14}
            y={22}
            fontSize={9}
            letterSpacing={1}
            className="data"
            fill="var(--ink-faint)"
          >
            LEAKED
          </text>
          {Array.from({ length: LEAK_LIMIT }, (_, i) => (
            <rect
              key={i}
              x={64 + i * 18}
              y={12}
              width={14}
              height={12}
              fill={i < scene.leakUnits ? "var(--pink)" : "none"}
              stroke="var(--ink)"
              strokeWidth={1}
            />
          ))}

          {item ? (
            <g transform={`translate(${item.x} ${ITEM_Y})`}>
              <rect
                x={-ITEM_W / 2 + 4}
                y={-ITEM_H / 2 + 4}
                width={ITEM_W}
                height={ITEM_H}
                fill="var(--ink)"
                opacity={0.14}
              />
              <rect
                x={-ITEM_W / 2}
                y={-ITEM_H / 2}
                width={ITEM_W}
                height={ITEM_H}
                fill="var(--paper-raised)"
                stroke="var(--ink)"
                strokeWidth={1.5}
                rx={1}
              />
              <text
                x={-ITEM_W / 2 + 14}
                y={-ITEM_H / 2 + 20}
                fontSize={9}
                letterSpacing={1}
                className="data"
                fill="var(--ink-faint)"
              >
                ON YOUR CLIPBOARD
              </text>
              <Wrapped
                text={item.payload.text}
                y={-ITEM_H / 2 + 46}
                size={15}
                width={ITEM_W - 32}
              />
              <line
                x1={-ITEM_W / 2 + 14}
                y1={ITEM_H / 2 - 26}
                x2={ITEM_W / 2 - 14}
                y2={ITEM_H / 2 - 26}
                stroke="var(--ink-faint)"
                strokeWidth={0.75}
              />
              <text
                x={-ITEM_W / 2 + 14}
                y={ITEM_H / 2 - 9}
                fontSize={11}
                fill="var(--ink-soft)"
              >
                Contains: {item.payload.contains}
              </text>
            </g>
          ) : null}

          {DOORS.map((door, lane) => {
            const hit = scene.flashDoor === lane;
            return (
              <g
                key={door.id}
                onPointerDown={(e) => {
                  e.preventDefault();
                  send(door.id);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={DOOR_X[lane] - DOOR_W / 2}
                  y={DOOR_Y - DOOR_H / 2}
                  width={DOOR_W}
                  height={DOOR_H}
                  fill={
                    hit
                      ? scene.flashOk
                        ? "var(--teal-wash)"
                        : "var(--pink-wash)"
                      : "var(--paper)"
                  }
                  stroke="var(--ink)"
                  strokeWidth={hit ? 2.5 : 1}
                  rx={1}
                />
                <text
                  x={DOOR_X[lane]}
                  y={DOOR_Y - 4}
                  textAnchor="middle"
                  fontSize={13}
                  letterSpacing={0.8}
                  className="data"
                  fill="var(--ink)"
                >
                  {door.label.toUpperCase()}
                </text>
                <text
                  x={DOOR_X[lane]}
                  y={DOOR_Y + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--ink-faint)"
                >
                  {door.means}
                </text>
                <text
                  x={DOOR_X[lane] - DOOR_W / 2 + 5}
                  y={DOOR_Y - DOOR_H / 2 + 12}
                  fontSize={9}
                  className="data"
                  fill="var(--ink-faint)"
                >
                  {door.key}
                </text>
              </g>
            );
          })}

          <Chips chips={scene.chips} />
          {scene.pops.map((p, i) => (
            <ScorePop key={i} {...p} />
          ))}
        </svg>

        <div
          className="border-ink/25 min-h-[4.5rem] border-t px-4 py-3"
          aria-live="polite"
        >
          {verdict && scene.ribbonLife > 0 && last ? (
            <>
              <p
                className={`mb-0.5 text-[0.9375rem] font-semibold ${
                  verdict.ok ? "text-teal-text" : "text-pink-text"
                }`}
              >
                {KIND_LABEL[last.payload.kind]} &mdash; the call was{" "}
                {doorSpec(last.should).label.toLowerCase()}
              </p>
              <p className="text-ink-soft text-[0.9375rem]">{verdict.text}</p>
            </>
          ) : (
            <p className="text-ink-soft text-[0.9375rem]">
              Ask one question about each: is any of this somebody else&rsquo;s
              to give away?
            </p>
          )}
        </div>
      </div>
    </GameShell>
  );
}

/* ------------------------------------------------------------------ parts -- */

function Wrapped({
  text,
  y,
  size,
  width,
}: {
  text: string;
  y: number;
  size: number;
  width: number;
}) {
  const max = Math.floor(width / (size * 0.53));
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  return (
    <>
      {lines.map((l, i) => (
        <text
          key={i}
          x={-width / 2}
          y={y + i * (size + 5)}
          fontSize={size}
          fontWeight={600}
          fill="var(--ink)"
        >
          {l}
        </text>
      ))}
    </>
  );
}

function Report({ scene }: { scene: PasteScene }) {
  const leaks = scene.log.filter((j) => j.outcome === "leak").slice(0, 3);
  const overcautious = scene.log.filter((j) => j.outcome === "overcautious");

  return (
    <div className="max-h-full max-w-xl overflow-y-auto text-left">
      <p className="display-md mb-2">
        {scene.blocked ? "Round stopped — too much got out" : `${scene.score} points`}
      </p>
      <p className="text-ink-soft mb-3 text-[0.9375rem]">
        {scene.exact} judged right · {scene.leaks} leaked ·{" "}
        {overcautious.length} refused that were harmless · best streak ×
        {scene.bestStreak}
      </p>

      {leaks.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {leaks.map((j, i) => (
            <Row key={i} judgement={j} />
          ))}
        </ul>
      ) : null}

      <p className="text-ink-soft text-[0.9375rem]">
        {scene.leaks === 0 && overcautious.length === 0
          ? "Both directions clean. That is the balance the whole module is about — the aim is not to be frightened of the tool, it is to know which parts of what you handle were never yours to hand over."
          : scene.leaks > overcautious.length
            ? "Everything that went in whole is out of your hands now. The useful habit is smaller than a policy: before pasting, ask whether any of it belongs to somebody who did not agree to this."
            : "You refused a lot that was harmless. Caution that blocks your own published blog post is not protecting anyone — it just moves the work back to you and teaches you the tool is useless."}
      </p>
    </div>
  );
}

function Row({ judgement }: { judgement: Judgement }) {
  return (
    <li className="plate-flush p-3 text-[0.875rem]">
      <p className="mb-1 font-semibold">{judgement.payload.text}</p>
      <p className="label text-pink-text mb-1">
        {KIND_LABEL[judgement.payload.kind]} · should have been{" "}
        {doorSpec(judgement.should).label.toLowerCase()}
      </p>
      <p className="text-ink-soft">Contains {judgement.payload.contains}.</p>
    </li>
  );
}

export { ROUND_SECONDS };
