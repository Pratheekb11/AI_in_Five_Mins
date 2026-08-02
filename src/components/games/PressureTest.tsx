"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  BAR_H,
  BAR_Y,
  call,
  type Call,
  CALLS,
  type Card,
  cardAt,
  DECK,
  excerpt,
  headX,
  labelFor,
  multiplierFor,
  newScene,
  PANEL_H,
  PANEL_W,
  type PressureScene,
  ROUND_SECONDS,
  type Verdict,
} from "@/lib/game/pressure";
import { useGameLoop } from "@/lib/game/useGameLoop";

/**
 * Pressure test — call the failure before the fuse runs out.
 *
 * A written answer arrives and the player has forty-five seconds' worth of
 * short fuses to sort them into five buckets: trustworthy, invented, stale,
 * caved, bad sum. The timer is the point. Given a minute, most people can spot
 * a made-up citation; given four seconds, they find out which failure mode
 * they are actually blind to, which is the one that will get them.
 *
 * Every example is written for this exercise. None is a transcript and none is
 * attributed to a product — the failure modes are real and cited on the page,
 * the wording is ours.
 */

const KEY_TO_CALL = new Map(CALLS.map((c) => [c.key, c.id]));

/** Nimo is perched in the top-right corner of every cabinet. Keep clear. */
const NIMO_GUTTER = 96;

export function PressureTest() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  // Not shuffled for the first paint: this scene is rendered on the server too,
  // and a shuffled deck would put a different card on each side.
  const [scene, setScene] = useState<PressureScene>(() => newScene(DECK, false));

  const start = useCallback(() => {
    setScene(newScene(DECK));
    setPhase("playing");
  }, []);

  useGameLoop(
    useCallback((delta: number) => {
      setScene((s) => advance(s, DECK, delta));
    }, []),
    phase === "playing",
  );

  // Decided here rather than inside the updater, which React may run twice.
  if (phase === "playing" && scene.remaining === 0) {
    setPhase("over");
  }

  const make = useCallback((picked: Verdict) => {
    setScene((s) => call(s, DECK, picked));
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
      const picked = KEY_TO_CALL.get(e.key);
      if (!picked) return;
      e.preventDefault();
      setScene((s) => call(s, DECK, picked));
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [phase]);

  const card = cardAt(scene, DECK);
  const fraction = scene.fuseMax === 0 ? 0 : scene.fuse / scene.fuseMax;
  const burning = fraction < 0.35;
  const multiplier = multiplierFor(scene.streak);
  const graded = scene.right + scene.wrong + scene.missed;

  return (
    <GameShell
      gameId="pressure"
      name="Pressure test"
      instruction="One written answer at a time, on a fuse that gets shorter as you go. Call it: trustworthy, or which of the four ways it has gone wrong. Keys 1 to 5, or tap. A wrong call costs you three seconds of the round."
      startLabel="Light the fuse"
      phase={phase}
      onStart={start}
      finalScore={scene.score}
      mood={
        scene.flash > 0.3
          ? scene.flashInk === "var(--teal)"
            ? scene.streak >= 6
              ? "celebrate"
              : "cheer"
            : "wince"
          : burning
            ? "think"
            : "idle"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${multiplier}` },
        { label: "Called", value: `${scene.right}/${graded}` },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={<Debrief scene={scene} />}
      footer={
        <>
          The four failure modes are documented and cited below. Every example
          is written for this exercise — none is a transcript, and none is
          attributed to any product. The arithmetic in them is computed, not
          typed, so a sum can never disagree with its own correction.
        </>
      }
    >
      <div>
        <svg
          viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
          className="block h-auto w-full select-none"
          aria-hidden="true"
        >
          <HalftoneDefs id="pressure-halftone" />

          <rect width={PANEL_W} height={PANEL_H} fill="var(--paper-sunk)" />

          <text
            x={14}
            y={30}
            fontSize={13}
            letterSpacing={1.2}
            className="data"
            fill={burning ? "var(--pink-text)" : "var(--ink-faint)"}
          >
            FUSE
          </text>
          <text
            x={PANEL_W - NIMO_GUTTER}
            y={30}
            textAnchor="end"
            fontSize={13}
            className="data"
            fill="var(--ink-faint)"
          >
            {scene.cleared} called · {Math.max(0, DECK.length - scene.cleared)}{" "}
            left in the deck
          </text>

          {/* The unburnt remainder, printed rather than filled, so the bar is
              legible in both themes without relying on colour alone. */}
          <rect
            x={0}
            y={BAR_Y}
            width={PANEL_W}
            height={BAR_H}
            fill="url(#pressure-halftone)"
            opacity={0.35}
          />
          <rect
            x={0}
            y={BAR_Y}
            width={headX(scene)}
            height={BAR_H}
            fill={burning ? "var(--pink)" : "var(--teal)"}
          />
          <line
            x1={headX(scene)}
            y1={BAR_Y - 6}
            x2={headX(scene)}
            y2={BAR_Y + BAR_H + 6}
            stroke="var(--ink)"
            strokeWidth={2}
          />
          <rect
            x={0}
            y={BAR_Y}
            width={PANEL_W}
            height={BAR_H}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1}
          />

          {scene.flash > 0 ? (
            <rect
              x={0}
              y={BAR_Y}
              width={PANEL_W}
              height={BAR_H}
              fill={scene.flashInk}
              opacity={scene.flash * 0.3}
            />
          ) : null}

          <Chips chips={scene.chips} />
          {scene.pops.map((p, i) => (
            <ScorePop key={i} {...p} />
          ))}
        </svg>

        <div className="border-ink/25 min-h-[11rem] border-t p-5 md:p-6">
          {card.push ? (
            <p className="border-yellow bg-yellow-wash text-yellow-text mb-4 border-l-2 py-1.5 pl-3 text-[0.9375rem]">
              <span className="label mr-2">You said</span>
              {card.push}
            </p>
          ) : null}

          <p className="prose-measure text-lg leading-relaxed" aria-live="off">
            {card.text}
          </p>

          <p
            className={`mt-4 min-h-[1.5rem] text-[0.9375rem] font-semibold ${
              scene.ribbonTone === "teal" ? "text-teal-text" : "text-pink-text"
            }`}
            aria-live="polite"
          >
            {scene.ribbonLife > 0 ? scene.ribbon : ""}
          </p>
        </div>

        <div className="border-ink/25 grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-5">
          {CALLS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => make(option.id)}
              disabled={phase !== "playing"}
              className="border-ink/30 bg-paper hover:border-ink rounded-[2px] border px-3 py-2.5 text-left transition-colors disabled:opacity-40"
            >
              <span className="font-display flex items-baseline gap-2 font-bold">
                <span className="data text-ink-faint text-xs">{option.key}</span>
                {option.name}
              </span>
              <span className="text-ink-faint mt-0.5 block text-xs">
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}

/* --------------------------------------------------------------- debrief -- */

/**
 * The round is over; this is the part that teaches. It shows the calls that
 * went wrong, with the reason, because the mode you are blind to is the one you
 * will be caught by.
 */
function Debrief({ scene }: { scene: PressureScene }) {
  const missteps = scene.log.filter((entry) => !entry.correct).slice(0, 3);
  const graded = scene.right + scene.wrong + scene.missed;

  return (
    <div className="max-h-full max-w-xl overflow-y-auto">
      <p className="display-md mb-2">{scene.score} points</p>
      <p className="text-ink-soft mb-3 text-[0.9375rem]">
        {scene.right} of {graded} called right · {scene.wrong} wrong ·{" "}
        {scene.missed} ran out of fuse · best streak {scene.bestStreak}
      </p>

      {missteps.length > 0 ? (
        <ul className="space-y-2 text-left">
          {missteps.map((entry, i) => (
            <Miss key={i} entry={entry} card={DECK[entry.card]} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-soft text-[0.9375rem]">
          Every call right. The fuse gets shorter than that — go again and find
          the mode you are slow on.
        </p>
      )}
    </div>
  );
}

function Miss({ entry, card }: { entry: Call; card: Card }) {
  return (
    <li className="plate-flush p-3 text-[0.875rem]">
      <p className="text-ink-soft mb-1 italic">“{excerpt(card.text)}”</p>
      <p className="label text-pink-text mb-1">
        {entry.picked ? `You called it ${labelFor(entry.picked)}` : "No call"} ·
        it was {labelFor(card.verdict)}
      </p>
      <p className="text-ink-soft">{card.tell}</p>
    </li>
  );
}

export { ROUND_SECONDS };
