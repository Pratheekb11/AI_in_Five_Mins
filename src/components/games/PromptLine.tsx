"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chips, HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  assemble,
  CATCH_Y,
  CATCHER_HALF,
  ELEMENTS,
  elementSpec,
  FLOOR,
  lift,
  newScene,
  PAD,
  PIECE_H,
  press,
  type PromptScene,
  RAIL,
  release,
  ROUND_SECONDS,
  SCENARIOS,
  scenarioAt,
  SCORING,
  SLOT_Y,
  steer,
  VIEW_H,
  VIEW_W,
} from "@/lib/game/promptline";
import { useGameLoop } from "@/lib/game/useGameLoop";
import { loadEncoding } from "@/lib/tokenizer";

/**
 * Assembly line — keep the parts of an instruction that do work.
 *
 * Fragments of a prompt come down a belt. Five kinds of them are load-bearing:
 * role, goal, constraints, format, example. The rest is politeness, urgency and
 * flattery, which costs tokens and instructs nobody. The player steers a hopper
 * and has to read fast enough to tell them apart.
 *
 * Nothing on the belt is colour-coded, on purpose. Sorting the useful from the
 * filler by reading it is the entire skill the module is about.
 *
 * What comes out at the end is a real prompt, assembled from what they kept,
 * measured with the real tokenizer. No model is called and none is imitated.
 */

const KEY_LEFT = new Set(["ArrowLeft", "a", "A"]);
const KEY_RIGHT = new Set(["ArrowRight", "d", "D"]);

export function PromptLine() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [scene, setScene] = useState<PromptScene>(() => newScene(0, 1, false));
  const [wantTokens, setWantTokens] = useState(false);
  const [encoding, setEncoding] = useState<Awaited<
    ReturnType<typeof loadEncoding>
  > | null>(null);

  const start = useCallback(() => {
    const calm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setScene(
      newScene(
        Math.floor(Math.random() * SCENARIOS.length),
        (Math.random() * 2 ** 31) >>> 0,
        calm,
      ),
    );
    setPhase("playing");
    setWantTokens(true);
  }, []);

  useGameLoop(
    useCallback((delta: number) => {
      setScene((s) => advance(s, delta));
    }, []),
    phase === "playing",
  );

  // Decided here rather than inside the state updater, which React is free to
  // run more than once.
  if (phase === "playing" && scene.remaining === 0) {
    setPhase("over");
  }

  // The merge table is around two megabytes, so it is only fetched once
  // somebody has actually played a round and there is a prompt to measure.
  useEffect(() => {
    if (!wantTokens) return;
    let alive = true;
    loadEncoding().then((enc) => {
      if (alive) setEncoding(enc);
    });
    return () => {
      alive = false;
    };
  }, [wantTokens]);

  useEffect(() => {
    if (phase !== "playing") return;

    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const dir = KEY_LEFT.has(e.key) ? -1 : KEY_RIGHT.has(e.key) ? 1 : 0;
      if (dir === 0) return;
      e.preventDefault();
      setScene((s) => press(s, dir));
    };

    const up = (e: KeyboardEvent) => {
      const dir = KEY_LEFT.has(e.key) ? -1 : KEY_RIGHT.has(e.key) ? 1 : 0;
      if (dir === 0) return;
      setScene((s) => lift(s, dir));
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);

  const aimAt = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    setScene((s) => steer(s, x));
  }, []);

  const built = useMemo(() => assemble(scene.caught), [scene.caught]);
  const tokens = useMemo(() => {
    if (!encoding) return null;
    return encoding.encode(built.text).length;
  }, [encoding, built.text]);

  const scenario = scenarioAt(scene.scenarioIndex);
  const covered = new Set(built.covered);

  return (
    <div className="space-y-4">
      <GameShell
        gameId="promptline"
        name="Assembly line"
        instruction="Parts of an instruction come down the belt. Keep the ones that tell the reader something — who they are, what to do, the limits, the shape of the answer, an example of good. Let the politeness and the urgency fall through. Drag the hopper, or use the arrow keys."
        startLabel="Start the belt"
        phase={phase}
        onStart={start}
        finalScore={scene.score}
        mood={
          scene.flash > 0.3
            ? scene.flashOk
              ? scene.combo >= 4
                ? "celebrate"
                : "cheer"
              : "wince"
            : "idle"
        }
        readouts={[
          { label: "Score", value: scene.score, accent: true },
          { label: "Streak", value: `×${scene.combo}` },
          { label: "Parts", value: `${built.covered.length}/5` },
          { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
        ]}
        again={
          <div className="max-w-sm">
            <p className="display-md mb-2">{scene.score} points</p>
            <p className="text-ink-soft mb-1 text-[0.9375rem]">
              {built.covered.length} of 5 parts · {built.fillerCount} filler
              caught · {scene.usefulMissed} good ones missed · best streak ×
              {scene.bestCombo}
            </p>
            <p className="text-ink-soft text-[0.9375rem]">
              {built.missing.length === 0
                ? "A complete instruction. The sheet below is what you built and what it costs."
                : `Missing: ${built.missing.map((k) => elementSpec(k).label.toLowerCase()).join(", ")}. The sheet below shows what that leaves open.`}
            </p>
          </div>
        }
        footer={
          <>
            Scoring: a part you did not have yet is worth{" "}
            <span className="font-data">{SCORING.newElement}</span>, a second
            copy of one you did is worth{" "}
            <span className="font-data">{SCORING.repeatElement}</span>, letting
            filler through is worth{" "}
            <span className="font-data">{SCORING.fillerDodged}</span>, catching
            filler costs{" "}
            <span className="font-data">{Math.abs(SCORING.fillerCaught)}</span>,
            and all five parts pays{" "}
            <span className="font-data">{SCORING.fullSet}</span>. Coverage is
            what is being rewarded, because coverage is what a stranger needs.
          </>
        }
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full cursor-grab touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            aimAt(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 0) aimAt(e);
          }}
          onPointerUp={() => setScene((s) => release(s))}
          onPointerCancel={() => setScene((s) => release(s))}
          tabIndex={0}
          role="application"
          aria-label="Assembly line. Steer the hopper with the left and right arrow keys. Catch fragments that give a role, a goal, constraints, a format or an example. Let filler fall through."
        >
          <HalftoneDefs />

          <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

          <Rails offset={scene.belt} />

          {/* the aiming column — where the hopper's mouth currently is */}
          <g opacity={0.4}>
            <line
              x1={scene.catcher.x - CATCHER_HALF}
              y1={0}
              x2={scene.catcher.x - CATCHER_HALF}
              y2={CATCH_Y}
              stroke="var(--yellow)"
              strokeWidth={1.25}
              strokeDasharray="4 6"
            />
            <line
              x1={scene.catcher.x + CATCHER_HALF}
              y1={0}
              x2={scene.catcher.x + CATCHER_HALF}
              y2={CATCH_Y}
              stroke="var(--yellow)"
              strokeWidth={1.25}
              strokeDasharray="4 6"
            />
          </g>

          <line
            x1={PAD}
            y1={CATCH_Y}
            x2={VIEW_W - PAD}
            y2={CATCH_Y}
            stroke="var(--ink)"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.35}
          />

          {scene.pieces.map((p) => (
            <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
              <rect
                x={-p.half}
                y={-PIECE_H / 2}
                width={p.half * 2}
                height={PIECE_H}
                rx={2}
                fill="var(--paper-raised)"
                stroke="var(--ink)"
                strokeWidth={1.25}
              />
              <rect
                x={-p.half}
                y={-PIECE_H / 2}
                width={p.half * 2}
                height={PIECE_H}
                rx={2}
                fill="url(#halftone)"
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize={12.5}
                className="data"
                fill="var(--ink)"
              >
                {p.text}
              </text>
            </g>
          ))}

          <Hopper x={scene.catcher.x} flash={scene.flash} ok={scene.flashOk} />

          <Chips chips={scene.chips} />
          {scene.pops.map((p, i) => (
            <ScorePop key={i} {...p} />
          ))}

          <Slots covered={covered} />
        </svg>
      </GameShell>

      {phase === "over" ? (
        <section className="plate p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h3 className="display-md">What you built</h3>
            <p className="label text-ink-faint">Brief: {scenario.brief}</p>
          </div>

          {built.parts.length === 0 ? (
            <p className="text-ink-soft text-[0.9375rem]">
              Nothing was caught, so there is no instruction. A reader given
              this has only the brief in your head to go on, and cannot see it.
            </p>
          ) : (
            <>
              <div className="plate-flush bg-yellow-wash p-4">
                <p className="data text-[0.9375rem] leading-relaxed">
                  {built.parts.map((part, i) => (
                    <span key={i}>
                      {i > 0 ? " " : ""}
                      <span
                        className={
                          part.element === null
                            ? "text-pink-text line-through decoration-1"
                            : ""
                        }
                      >
                        {part.text}
                      </span>
                    </span>
                  ))}
                </p>
              </div>

              <dl className="border-ink/25 mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                <Stat
                  label="Tokens"
                  value={tokens === null ? "counting…" : tokens}
                  accent
                />
                <Stat label="Characters" value={[...built.text].length} />
                <Stat label="Parts covered" value={`${built.covered.length}/5`} />
                <Stat label="Filler kept" value={built.fillerCount} />
              </dl>

              <p className="text-ink-faint mt-2 text-sm">
                Token count measured in your browser with the real{" "}
                <span className="font-data">o200k_base</span> encoding — the same
                split GPT‑4o and GPT‑5 receive. Struck-through words are the
                filler you caught: they were paid for and they instruct nothing.
              </p>
            </>
          )}

          <ul className="border-ink/25 mt-5 space-y-2.5 border-t pt-4">
            {ELEMENTS.map((spec) => {
              const has = covered.has(spec.key);
              return (
                <li key={spec.key} className="flex items-start gap-3">
                  <span
                    className={`label mt-0.5 w-24 shrink-0 ${
                      has ? "text-teal-text" : "text-pink-text"
                    }`}
                  >
                    {spec.label}
                  </span>
                  <span className="text-[0.9375rem]">
                    {has ? (
                      <span className="text-ink-soft">
                        Covered — {spec.asks.toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-ink-soft">{spec.missing}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- the plate --

function Rails({ offset }: { offset: number }) {
  const pitch = 34;
  const first = (offset % pitch) - pitch;
  const slats: number[] = [];
  for (let y = first; y < FLOOR; y += pitch) slats.push(y);

  return (
    <g aria-hidden="true">
      <rect
        x={PAD}
        y={0}
        width={VIEW_W - PAD * 2}
        height={FLOOR}
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth={1.5}
      />
      <rect
        x={PAD}
        y={0}
        width={VIEW_W - PAD * 2}
        height={FLOOR}
        fill="url(#halftone)"
      />

      {slats.map((y, i) => (
        <line
          key={i}
          x1={PAD}
          y1={y}
          x2={VIEW_W - PAD}
          y2={y}
          stroke="var(--ink)"
          strokeWidth={1}
          opacity={0.16}
        />
      ))}

      {/* sprocket rails down both edges — the repeating thing the eye tracks */}
      {[PAD, VIEW_W - PAD - RAIL].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y={0}
            width={RAIL}
            height={FLOOR}
            fill="var(--paper-sunk)"
            stroke="var(--ink)"
            strokeWidth={1}
          />
          {slats.map((y, i) => (
            <rect
              key={i}
              x={x + 3}
              y={y + 11}
              width={RAIL - 6}
              height={6}
              rx={1}
              fill="var(--ink)"
              opacity={0.55}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function Hopper({
  x,
  flash,
  ok,
}: {
  x: number;
  flash: number;
  ok: boolean;
}) {
  return (
    <g transform={`translate(${x} ${CATCH_Y})`} aria-hidden="true">
      <path
        d={`M ${-CATCHER_HALF} 0 L ${CATCHER_HALF} 0 L 30 42 L -30 42 Z`}
        fill="var(--yellow)"
        stroke="var(--ink)"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <path
        d={`M ${-CATCHER_HALF} 0 L ${CATCHER_HALF} 0 L 30 42 L -30 42 Z`}
        fill="url(#halftone-dense)"
      />
      {flash > 0 ? (
        <path
          d={`M ${-CATCHER_HALF} 0 L ${CATCHER_HALF} 0 L 30 42 L -30 42 Z`}
          fill={ok ? "var(--teal)" : "var(--pink)"}
          opacity={flash * 0.75}
        />
      ) : null}
      {/* the lip, so the mouth reads as an opening rather than a block */}
      <path
        d={`M ${-CATCHER_HALF - 4} 0 L ${CATCHER_HALF + 4} 0`}
        stroke="var(--ink)"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );
}

function Slots({ covered }: { covered: Set<string> }) {
  const width = (VIEW_W - PAD * 2 - 4 * 6) / 5;

  return (
    <g aria-hidden="true">
      {ELEMENTS.map((spec, i) => {
        const x = PAD + i * (width + 6);
        const has = covered.has(spec.key);
        return (
          <g key={spec.key}>
            <rect
              x={x}
              y={SLOT_Y}
              width={width}
              height={26}
              rx={2}
              fill={has ? "var(--teal-wash)" : "var(--paper)"}
              stroke={has ? "var(--teal)" : "var(--ink)"}
              strokeWidth={has ? 1.75 : 1}
              strokeOpacity={has ? 1 : 0.35}
            />
            <text
              x={x + width / 2}
              y={SLOT_Y + 17}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              className="data"
              fill={has ? "var(--teal-text)" : "var(--ink-faint)"}
            >
              {spec.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="label text-ink-faint mb-1.5">{label}</dt>
      <dd
        className={`data text-xl font-semibold ${accent ? "text-pink-text" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

export { ROUND_SECONDS };
