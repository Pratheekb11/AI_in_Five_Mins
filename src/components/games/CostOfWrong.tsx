"use client";

import { useCallback, useEffect, useState } from "react";
import { Chips, HalftoneDefs, ScorePop } from "@/components/game/assets";
import { GameShell } from "@/components/game/GameShell";
import {
  advance,
  type CostScene,
  DAMAGE_LABEL,
  DOCKET_H,
  DOCKET_W,
  DOCKET_X,
  ERROR_RATE,
  newScene,
  PRESS_Y,
  requiredFor,
  ROUND_SECONDS,
  type Ruling,
  stamp,
  STAMPS,
  stampSpec,
  VIEW_H,
  VIEW_W,
  verdictOf,
} from "@/lib/game/costofwrong";
import { useGameLoop } from "@/lib/game/useGameLoop";

/**
 * Cost of wrong — how hard to check, when checking costs you.
 *
 * Four stamps, and each one takes real seconds off the round clock. That is
 * the mechanic and the entire argument: nobody is against checking, they are
 * against paying for it, and a policy of "always verify everything" quietly
 * becomes a policy of verifying nothing.
 *
 * So the round makes you spend. One docket in three is genuinely wrong, and
 * the rule you are scored against — match the check to the damage — is the
 * module's own rule, stated on the page rather than dressed up as a finding.
 *
 * The outcome worth watching for is not "escaped". It is "lucky": under-checked
 * and fine anyway. That is what most bad habits feel like from the inside.
 */

const KEY_TO_LEVEL = new Map(STAMPS.map((s) => [s.key, s.level]));

export function CostOfWrong() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [scene, setScene] = useState<CostScene>(() => newScene(1, false));

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

  const hit = useCallback((level: number) => {
    setScene((s) => stamp(s, level));
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
      const level = KEY_TO_LEVEL.get(e.key);
      if (!level) return;
      e.preventDefault();
      setScene((s) => stamp(s, level));
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [phase]);

  const docket = scene.docket;
  const last = scene.last;
  const verdict = last ? verdictOf(last) : null;
  const ruled = scene.log.length;

  return (
    <GameShell
      gameId="costofwrong"
      name="Cost of wrong"
      instruction="Work coming off an assistant lands on your desk. Choose how hard to check it before it goes out — and watch the clock, because every level of checking costs you seconds you do not get back. One docket in three really is wrong."
      startLabel="Open the desk"
      phase={phase}
      onStart={start}
      finalScore={scene.score}
      mood={
        scene.ribbonLife > 1.6 && last
          ? last.outcome === "escaped"
            ? "wince"
            : last.outcome === "lucky"
              ? "think"
              : scene.streak >= 4
                ? "celebrate"
                : "cheer"
          : "idle"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Streak", value: `×${scene.streak}` },
        { label: "Got out", value: scene.escaped },
        { label: "Time", value: `${Math.ceil(scene.remaining)}s` },
      ]}
      again={<Ledger scene={scene} />}
      footer={
        <>
          One docket in {Math.round(1 / ERROR_RATE)} contains a real error
          &mdash; a rule of this game, printed here because we are not going to
          invent an error rate for your assistant. The level you are scored
          against is the module&rsquo;s own rule: match the check to the damage.
        </>
      }
    >
      <div>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full touch-none select-none"
          aria-hidden="true"
        >
          <HalftoneDefs id="cost-halftone" />

          <rect width={VIEW_W} height={VIEW_H} fill="var(--paper-sunk)" />

          {/* the press, which comes down when you commit to a level */}
          <g transform={`translate(0 ${scene.press * 52})`}>
            <rect
              x={DOCKET_X - 74}
              y={PRESS_Y - 26}
              width={148}
              height={30}
              fill="var(--paper-raised)"
              stroke="var(--ink)"
              strokeWidth={1.5}
              rx={1}
            />
            <text
              x={DOCKET_X}
              y={PRESS_Y - 6}
              textAnchor="middle"
              fontSize={12}
              letterSpacing={1}
              className="data"
              fill="var(--ink-soft)"
            >
              {scene.pressLevel
                ? stampSpec(scene.pressLevel).label.toUpperCase()
                : "PRESS"}
            </text>
            <line
              x1={DOCKET_X}
              y1={PRESS_Y + 4}
              x2={DOCKET_X}
              y2={PRESS_Y + 22}
              stroke="var(--ink)"
              strokeWidth={5}
            />
          </g>

          {docket ? (
            <g transform={`translate(${DOCKET_X} ${docket.y})`}>
              <rect
                x={-DOCKET_W / 2 + 4}
                y={-DOCKET_H / 2 + 4}
                width={DOCKET_W}
                height={DOCKET_H}
                fill="var(--ink)"
                opacity={0.14}
              />
              <rect
                x={-DOCKET_W / 2}
                y={-DOCKET_H / 2}
                width={DOCKET_W}
                height={DOCKET_H}
                fill="var(--paper-raised)"
                stroke="var(--ink)"
                strokeWidth={1.5}
                rx={1}
              />
              <text
                x={-DOCKET_W / 2 + 14}
                y={-DOCKET_H / 2 + 20}
                fontSize={9}
                letterSpacing={1}
                className="data"
                fill="var(--ink-faint)"
              >
                OFF THE ASSISTANT
              </text>
              <Wrapped
                text={docket.item.text}
                y={-DOCKET_H / 2 + 46}
                size={16}
                width={DOCKET_W - 32}
              />
              <line
                x1={-DOCKET_W / 2 + 14}
                y1={DOCKET_H / 2 - 34}
                x2={DOCKET_W / 2 - 14}
                y2={DOCKET_H / 2 - 34}
                stroke="var(--ink-faint)"
                strokeWidth={0.75}
              />
              <text
                x={-DOCKET_W / 2 + 14}
                y={DOCKET_H / 2 - 14}
                fontSize={11}
                fill="var(--ink-soft)"
              >
                Going to: {docket.item.going}
              </text>
              <text
                x={DOCKET_W / 2 - 14}
                y={DOCKET_H / 2 - 14}
                textAnchor="end"
                fontSize={11}
                letterSpacing={0.7}
                className="data"
                fill={
                  docket.item.damage === 3
                    ? "var(--pink-text)"
                    : docket.item.damage === 2
                      ? "var(--yellow-text)"
                      : "var(--ink-faint)"
                }
              >
                {DAMAGE_LABEL[docket.item.damage].toUpperCase()} IF WRONG
              </text>
            </g>
          ) : null}

          <Chips chips={scene.chips} />
          {scene.pops.map((p, i) => (
            <ScorePop key={i} {...p} />
          ))}
        </svg>

        <div
          className="border-ink/25 min-h-[3.75rem] border-t px-4 py-3"
          aria-live="polite"
        >
          {verdict && scene.ribbonLife > 0 ? (
            <p
              className={`text-[0.9375rem] font-semibold ${
                verdict.ok ? "text-teal-text" : "text-pink-text"
              }`}
            >
              {verdict.text}
            </p>
          ) : (
            <p className="text-ink-soft text-[0.9375rem]">
              Read where it is going and what it costs to be wrong. Then decide
              what the check is worth &mdash; the clock is paying for it.
            </p>
          )}
        </div>

        <div className="border-ink/25 grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-4">
          {STAMPS.map((option) => (
            <button
              key={option.level}
              type="button"
              onClick={() => hit(option.level)}
              disabled={phase !== "playing"}
              className="border-ink/30 bg-paper hover:border-ink rounded-[2px] border px-3 py-2.5 text-left transition-colors disabled:opacity-40"
            >
              <span className="font-display flex items-baseline justify-between gap-2 font-bold">
                <span className="flex items-baseline gap-2">
                  <span className="data text-ink-faint text-xs">
                    {option.key}
                  </span>
                  {option.label}
                </span>
                <span className="data text-pink-text text-xs">
                  {option.cost > 0 ? `−${option.cost}s` : "free"}
                </span>
              </span>
              <span className="text-ink-faint mt-0.5 block text-xs">
                {option.means}
              </span>
            </button>
          ))}
        </div>

        <p className="border-ink/25 text-ink-faint border-t px-4 py-2 text-xs">
          {ruled} ruled · {scene.caught} faults caught · {scene.lucky} got away
          with · {scene.spent}s spent checking
        </p>
      </div>
    </GameShell>
  );
}

/* ------------------------------------------------------------------ parts -- */

/** Word-wrapped SVG text, since SVG will not wrap on its own. */
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

/**
 * The round is over. The number that teaches is not the score — it is how many
 * you under-checked and got away with, because that is the habit forming.
 */
function Ledger({ scene }: { scene: CostScene }) {
  const escapes = scene.log.filter((r) => r.outcome === "escaped").slice(0, 2);
  const lucky = scene.log.filter((r) => r.outcome === "lucky").slice(0, 2);

  return (
    <div className="max-h-full max-w-xl overflow-y-auto text-left">
      <p className="display-md mb-2">{scene.score} points</p>
      <p className="text-ink-soft mb-3 text-[0.9375rem]">
        {scene.caught} faults caught · {scene.escaped} got out · {scene.lucky}{" "}
        under-checked and fine anyway · {scene.spent}s of the round spent
        checking
      </p>

      {escapes.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {escapes.map((ruling, i) => (
            <Row key={i} ruling={ruling} tone="pink" />
          ))}
        </ul>
      ) : null}

      {lucky.length > 0 ? (
        <>
          <p className="label text-yellow-text mb-1.5">
            You got away with these
          </p>
          <ul className="mb-3 space-y-2">
            {lucky.map((ruling, i) => (
              <Row key={i} ruling={ruling} tone="yellow" />
            ))}
          </ul>
          <p className="text-ink-soft text-[0.875rem]">
            Nothing went wrong, and that is the problem. A habit that has not
            cost you anything yet feels identical to a habit that never will.
          </p>
        </>
      ) : escapes.length === 0 ? (
        <p className="text-ink-soft text-[0.9375rem]">
          Nothing got out and nothing was under-checked. Now look at the seconds
          you spent: over-checking is not free either, and a policy you cannot
          afford is a policy you will abandon.
        </p>
      ) : null}
    </div>
  );
}

function Row({ ruling, tone }: { ruling: Ruling; tone: "pink" | "yellow" }) {
  return (
    <li className="plate-flush p-3 text-[0.875rem]">
      <p className="mb-1 font-semibold">{ruling.item.text}</p>
      <p
        className={`label mb-1 ${
          tone === "pink" ? "text-pink-text" : "text-yellow-text"
        }`}
      >
        You stamped {stampSpec(ruling.chose).label.toLowerCase()} · the damage
        asked for {stampSpec(requiredFor(ruling.item.damage)).label.toLowerCase()}
      </p>
      <p className="text-ink-soft">{ruling.item.ifWrong}</p>
    </li>
  );
}

export { ROUND_SECONDS };
