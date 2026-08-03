"use client";

import { useCallback, useState } from "react";
import {
  Blade,
  Chips,
  HalftoneDefs,
  PaperStrip,
  ScorePop,
} from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  BLADE_X,
  CHAR_W,
  type ChopScene,
  cut,
  newScene,
  offsetToX,
  ROUND_SECONDS,
  STRIP_H,
  STRIP_Y,
  VIEW_H,
  VIEW_W,
  wordAt,
} from "@/lib/game/chop";
import { useGameLoop } from "@/lib/game/useGameLoop";
import { TOKEN_EXAMPLES } from "@/lib/tokenExamples";

/**
 * Chop — cut the word where the tokenizer does.
 *
 * A word rides a paper strip through a press. The blade is fixed; the strip
 * moves. Press when a real token boundary passes under the edge.
 *
 * The targets are not decorative: they are the exact character offsets
 * `o200k_base` breaks each word at. Landing a cut means finding a boundary the
 * model genuinely uses, and missing teaches the point of the lesson — the
 * breaks are nowhere near where a person would put them.
 */

const WORDS = TOKEN_EXAMPLES.chop;

export function TokenChop() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [scene, setScene] = useState<ChopScene>(() => newScene(0));

  const start = useCallback(() => {
    setScene(newScene(Math.floor(Math.random() * WORDS.length)));
    setPhase("playing");
  }, []);

  useGameLoop(
    useCallback((delta: number) => {
      setScene((s) => advance(s, WORDS, delta));
    }, []),
    phase === "playing",
  );

  // Ending the round is decided here rather than inside the state updater,
  // which React is free to run more than once.
  if (phase === "playing" && scene.remaining === 0) {
    setPhase("over");
  }

  const chop = useCallback(() => {
    if (phase !== "playing") return;
    setScene((s) => cut(s, WORDS));
  }, [phase]);

  const word = wordAt(WORDS, scene.wordIndex);
  const letters = [...word.word];
  const landed = scene.perfect + scene.close;
  const accuracy =
    landed + scene.missed === 0 ? 0 : landed / (landed + scene.missed);

  return (
    <GameShell
      gameId="chop"
      name="Chop"
      instruction="A word runs through the press. Hit the blade the moment a real token boundary passes under it — press Space, or tap the strip. The splits printed below the strip tell you what you are aiming for."
      startLabel="Start cutting"
      phase={phase}
      onStart={start}
      finalScore={scene.score}
      mood={
        scene.flash > 0.3
          ? scene.combo >= 4
            ? "celebrate"
            : "cheer"
          : scene.combo === 0 && scene.missed > 0
            ? "wince"
            : "idle"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${scene.combo}` },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={
        <div className="max-w-sm">
          <p className="display-md mb-2">{scene.score} points</p>
          <p className="text-ink-soft mb-1 text-[0.9375rem]">
            {scene.perfect} perfect · {scene.close} close · {scene.missed}{" "}
            missed · best streak ×{scene.bestCombo}
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            {accuracy > 0.6
              ? "You are reading the merge table. Notice it pulls common chunks out whole and leaves the rare remainder in pieces."
              : "Hard, isn't it. That is the point — the tokenizer does not cut at syllables or at meaning. It cuts where the chunks it memorised happen to end."}
          </p>
        </div>
      }
      footer={
        <>
          Cutting at the real <span className="font-data">o200k_base</span>{" "}
          boundaries — the same splits GPT‑4o and GPT‑5 receive.
        </>
      }
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block h-auto w-full cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          chop();
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            chop();
          }
        }}
        tabIndex={0}
        role="application"
        aria-label="Chop. Press Space when a token boundary reaches the blade."
      >
        <HalftoneDefs />

        <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

        <PaperStrip
          x={0}
          y={STRIP_Y}
          width={VIEW_W}
          height={STRIP_H}
          offset={-scene.scroll % 22}
        />

        {letters.map((ch, i) => {
          const x = offsetToX(i, scene.scroll) + CHAR_W / 2;
          if (x < -CHAR_W || x > VIEW_W + CHAR_W) return null;
          return (
            <text
              key={i}
              x={x}
              y={STRIP_Y + STRIP_H / 2 + 10}
              textAnchor="middle"
              fontSize={30}
              fontWeight={600}
              className="data"
              fill="var(--ink)"
            >
              {ch}
            </text>
          );
        })}

        {/* landed cuts stay printed on the strip */}
        {scene.hit.map((c) => {
          const x = offsetToX(c, scene.scroll);
          if (x < -20 || x > VIEW_W + 20) return null;
          return (
            <line
              key={`h-${c}`}
              x1={x}
              y1={STRIP_Y + 4}
              x2={x}
              y2={STRIP_Y + STRIP_H - 4}
              stroke="var(--teal)"
              strokeWidth={3}
              strokeDasharray="6 4"
            />
          );
        })}

        {/* boundaries that got away */}
        {scene.passed.map((c) => {
          const x = offsetToX(c, scene.scroll);
          if (x < -20 || x > VIEW_W + 20) return null;
          return (
            <line
              key={`p-${c}`}
              x1={x}
              y1={STRIP_Y + 4}
              x2={x}
              y2={STRIP_Y + STRIP_H - 4}
              stroke="var(--pink)"
              strokeWidth={2}
              strokeOpacity={0.5}
              strokeDasharray="2 5"
            />
          );
        })}

        <line
          x1={BLADE_X}
          y1={STRIP_Y - 2}
          x2={BLADE_X}
          y2={STRIP_Y + STRIP_H + 2}
          stroke="var(--ink)"
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.45}
        />

        {scene.flash > 0 ? (
          <rect
            x={BLADE_X - 22}
            y={STRIP_Y}
            width={44}
            height={STRIP_H}
            fill="var(--teal)"
            opacity={scene.flash * 0.25}
          />
        ) : null}

        <Blade x={BLADE_X} y={STRIP_Y + 4} armed={phase === "playing"} />

        <Chips chips={scene.chips} />
        {scene.pops.map((p, i) => (
          <ScorePop key={i} {...p} />
        ))}

        {/* the proof sheet — what the tokenizer says this word breaks into */}
        <text
          x={12}
          y={VIEW_H - 12}
          fontSize={13}
          className="data"
          fill="var(--ink-faint)"
        >
          {word.pieces.join("  ·  ")}
        </text>
      </svg>
    </GameShell>
  );
}

export { ROUND_SECONDS };
