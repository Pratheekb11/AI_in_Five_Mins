"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  aimAt,
  grab,
  type MagnetScene,
  NEUTRAL,
  newScene,
  releaseAim,
  RING,
  type Round,
  ROUND_SECONDS,
  roundAt,
  steer,
  targetOf,
  TOP,
  VIEW_H,
  VIEW_W,
} from "@/lib/game/magnet";
import { useGameLoop } from "@/lib/game/useGameLoop";
import {
  type EmbeddingSpace,
  loadEmbeddings,
  nearest,
  vectorFor,
} from "@/lib/embeddings";

/**
 * Magnet, the field sorts itself by meaning, and you have to read it.
 *
 * One word sits on the magnet. Every other word in the box is pulled toward it
 * or pushed away by a force that is its real cosine similarity to that word,
 * measured across all fifty dimensions of the GloVe vectors. Nothing is staged:
 * if two words drift together, it is because the numbers say they belong
 * together.
 *
 * The round asks for a specific neighbour, and the ring picks up whatever is
 * nearest. So the skill is not aim, it is prediction, and the moment the
 * lesson lands is when you grab the wrong word and see that it scored 0.71 to
 * your target's 0.68. The field was right and your intuition was not.
 */

/** Words on the magnet, in order of how obvious their neighbourhood is. */
const CANDIDATES = [
  "king",
  "cat",
  "paris",
  "doctor",
  "guitar",
  "winter",
  "river",
  "money",
  "hospital",
  "football",
  "coffee",
  "monday",
  "computer",
  "mountain",
  "teacher",
  "italy",
  "bread",
  "engine",
  "island",
  "violin",
];

const FIELD = 13;
const TARGETS_PER_ROUND = 3;
const ROUNDS = 6;

/** Nimo is perched in the top-right corner of every cabinet. Keep clear. */
const NIMO_GUTTER = 104;

const LEFT = new Set(["ArrowLeft", "a", "A"]);
const RIGHT = new Set(["ArrowRight", "d", "D"]);
const UP = new Set(["ArrowUp", "w", "W"]);
const DOWN = new Set(["ArrowDown", "s", "S"]);
const GRAB = new Set([" ", "Enter"]);

/**
 * Builds a round from the real vectors: the magnet word, its true nearest
 * neighbours as targets, and a field of those plus sampled strangers. Called
 * from an event, never during render, it draws random words.
 */
function buildRound(space: EmbeddingSpace, magnet: string): Round | null {
  const vec = vectorFor(space, magnet);
  if (!vec) return null;

  const close = nearest(space, vec, TARGETS_PER_ROUND + 2, [magnet]);
  if (close.length < TARGETS_PER_ROUND) return null;

  const chosen = new Map<string, number>();
  for (const n of close) chosen.set(n.word, n.similarity);

  // Strangers, so most of the field is actively repelled, which is the true
  // picture: almost every pair of words has nothing to do with each other.
  let guard = 0;
  while (chosen.size < FIELD && guard < FIELD * 40) {
    guard += 1;
    const word = space.words[Math.floor(Math.random() * space.words.length)];
    if (word === magnet || chosen.has(word)) continue;
    const other = vectorFor(space, word);
    if (!other) continue;
    let dot = 0;
    for (let i = 0; i < space.dims; i++) dot += vec[i] * other[i];
    if (dot > NEUTRAL) continue;
    chosen.set(word, dot);
  }

  return {
    magnet,
    bodies: [...chosen].map(([word, sim]) => ({ word, sim })),
    targets: close.slice(0, TARGETS_PER_ROUND).map((n, i) => ({
      word: n.word,
      sim: n.similarity,
      rank: i + 1,
    })),
  };
}

function pickRounds(space: EmbeddingSpace): Round[] {
  const pool = CANDIDATES.filter((w) => vectorFor(space, w) !== null);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = swap;
  }

  const rounds: Round[] = [];
  for (const word of shuffled) {
    const round = buildRound(space, word);
    if (round) rounds.push(round);
    if (rounds.length >= ROUNDS) break;
  }
  return rounds;
}

export function WordMagnet() {
  const [space, setSpace] = useState<EmbeddingSpace | null>(null);
  const [failed, setFailed] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  // Empty field for the first paint, which is rendered on the server too.
  const [scene, setScene] = useState<MagnetScene>(() => newScene([], false));

  useEffect(() => {
    let alive = true;
    loadEmbeddings()
      .then((s) => alive && setSpace(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(() => {
    if (!space) return;
    const calm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const built = pickRounds(space);
    setRounds(built);
    setScene(newScene(built, calm));
    setPhase("playing");
  }, [space]);

  useGameLoop(
    useCallback(
      (delta: number) => {
        setScene((s) => advance(s, rounds, delta));
      },
      [rounds],
    ),
    phase === "playing",
  );

  // Decided here rather than inside the updater, which React may run twice.
  if (phase === "playing" && scene.remaining === 0) {
    setPhase("over");
  }

  useEffect(() => {
    if (phase !== "playing") return;

    let x = 0;
    let y = 0;

    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (GRAB.has(e.key)) {
        e.preventDefault();
        setScene((s) => grab(s, rounds));
        return;
      }
      if (LEFT.has(e.key)) x = -1;
      else if (RIGHT.has(e.key)) x = 1;
      else if (UP.has(e.key)) y = -1;
      else if (DOWN.has(e.key)) y = 1;
      else return;
      e.preventDefault();
      setScene((s) => steer(s, x, y));
    };

    const up = (e: KeyboardEvent) => {
      if (LEFT.has(e.key) && x === -1) x = 0;
      else if (RIGHT.has(e.key) && x === 1) x = 0;
      else if (UP.has(e.key) && y === -1) y = 0;
      else if (DOWN.has(e.key) && y === 1) y = 0;
      else return;
      setScene((s) => steer(s, x, y));
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, rounds]);

  const point = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    setScene((s) => aimAt(s, x, y));
  }, []);

  const round = roundAt(rounds, scene.roundIndex);
  const target = targetOf(rounds, scene);
  const last = scene.last;

  return (
    <GameShell
      gameId="magnet"
      name="Magnet"
      instruction="One word rides the magnet. Every other word in the box is pulled toward it or shoved away by its real similarity to that word. Steer with the pointer or the arrow keys, and press space to grab whatever is inside the ring. You are asked for a specific neighbour, so predict which one the numbers actually put closest."
      startLabel={space ? "Switch it on" : "Loading vectors…"}
      phase={phase}
      onStart={start}
      finalScore={scene.score}
      mood={
        scene.ring > 0.4
          ? last?.ok
            ? scene.combo >= 4
              ? "celebrate"
              : "cheer"
            : "wince"
          : "think"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${scene.combo}` },
        {
          label: "Caught",
          value: `${scene.caught}/${scene.caught + scene.missed}`,
        },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">{scene.score} points</p>
          <p className="text-ink-soft mb-1 text-[0.9375rem]">
            {scene.caught} neighbours caught · {scene.missed} wrong word in the
            ring · best streak ×{scene.bestCombo}
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Every force in that box was a real cosine similarity across{" "}
            {space?.dims ?? 50} dimensions. Nothing was arranged for effect .
            When two words crowded together, it is because the numbers put them
            together.
          </p>
        </div>
      }
      footer={
        space ? (
          <>
            {space.words.length.toLocaleString("en-US")} words from{" "}
            {space.source.name}. Pull is the real cosine similarity; anything
            under {NEUTRAL} is pushed away, which is almost every pair of words
            there is.
          </>
        ) : failed ? (
          <>The word vectors did not load, so the field cannot be built.</>
        ) : (
          <>Loading the word vectors…</>
        )
      }
    >
      <div>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full cursor-grab touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            point(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 0) point(e);
          }}
          onPointerUp={() => setScene(releaseAim)}
          onPointerCancel={() => setScene(releaseAim)}
          role="application"
          aria-label="Magnet. Steer with the arrow keys and press space to grab the word inside the ring."
          tabIndex={0}
        >
          <HalftoneDefs id="magnet-halftone" />

          <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

          <text
            x={14}
            y={22}
            fontSize={10}
            letterSpacing={1}
            className="data"
            fill="var(--ink-faint)"
          >
            ON THE MAGNET
          </text>
          <text
            x={14}
            y={38}
            fontSize={17}
            fontWeight={700}
            className="data"
            fill="var(--blue-text)"
          >
            {round?.magnet ?? "-"}
          </text>

          {target ? (
            <>
              <text
                x={VIEW_W - NIMO_GUTTER}
                y={22}
                textAnchor="end"
                fontSize={10}
                letterSpacing={1}
                className="data"
                fill="var(--ink-faint)"
              >
                BRING BACK ITS #{target.rank} NEIGHBOUR
              </text>
              <text
                x={VIEW_W - NIMO_GUTTER}
                y={38}
                textAnchor="end"
                fontSize={17}
                fontWeight={700}
                className="data"
                fill="var(--teal-text)"
              >
                {target.word}
              </text>
            </>
          ) : null}

          <line
            x1={0}
            y1={TOP}
            x2={VIEW_W}
            y2={TOP}
            stroke="var(--ink)"
            strokeWidth={1}
            opacity={0.2}
          />

          {/* the reach of the magnet, only what is inside comes out */}
          <circle
            cx={scene.magnet.x}
            cy={scene.magnet.y}
            r={RING}
            fill="none"
            stroke="var(--yellow)"
            strokeWidth={scene.ring > 0 ? 2.5 : 1.25}
            strokeDasharray="6 7"
            opacity={0.5 + scene.ring * 0.5}
          />
          <circle
            cx={scene.magnet.x}
            cy={scene.magnet.y}
            r={17}
            fill="var(--blue)"
            stroke="var(--ink)"
            strokeWidth={1.5}
          />

          {scene.bodies.map((b) => {
            const attracted = b.sim > NEUTRAL;
            return (
              <g key={b.word} transform={`translate(${b.x} ${b.y})`}>
                <rect
                  x={-b.half}
                  y={-11}
                  width={b.half * 2}
                  height={22}
                  rx={2}
                  fill={attracted ? "var(--teal-wash)" : "var(--paper-raised)"}
                  stroke={attracted ? "var(--teal)" : "var(--ink-faint)"}
                  strokeWidth={attracted ? 1.5 : 1}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  className="data"
                  fill={attracted ? "var(--teal-text)" : "var(--ink-soft)"}
                >
                  {b.word}
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
          className="border-ink/25 min-h-[3.5rem] border-t px-4 py-3"
          aria-live="polite"
        >
          {last ? (
            <p
              className={`text-[0.9375rem] ${
                last.ok ? "text-teal-text" : "text-pink-text"
              }`}
            >
              {last.ok ? (
                <>
                  <span className="font-semibold">{last.grabbed}</span>,
                  similarity{" "}
                  <span className="font-data">
                    {last.grabbedSim.toFixed(3)}
                  </span>
                  . That was the one.
                </>
              ) : (
                <>
                  You pulled{" "}
                  <span className="font-semibold">{last.grabbed}</span> at{" "}
                  <span className="font-data">
                    {last.grabbedSim.toFixed(3)}
                  </span>
                  , not <span className="font-semibold">{last.target}</span> at{" "}
                  <span className="font-data">{last.targetSim.toFixed(3)}</span>
                  . The ring takes whatever is closest, not what you meant.
                </>
              )}
            </p>
          ) : (
            <p className="text-ink-soft text-[0.9375rem]">
              Words with real meaning in common drift in. Everything else is
              pushed to the walls. Get the named neighbour alone in the ring
              before you press.
            </p>
          )}
        </div>

        <p className="border-ink/25 text-ink-faint border-t px-4 py-2 text-xs">
          <span className="data">arrows</span> or drag to steer ·{" "}
          <span className="data">space</span> to grab
        </p>
      </div>
    </GameShell>
  );
}

export { ROUND_SECONDS };
