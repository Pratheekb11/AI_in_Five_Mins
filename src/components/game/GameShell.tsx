"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Nimo } from "@/components/nimo/Nimo";
import type { Mood } from "@/components/nimo/moods";
import { useBestScore } from "@/lib/game/useBestScore";
import { playCue, useMuted } from "@/lib/game/sound";
import { trackGameFinished, trackGameStarted } from "@/lib/telemetry";

/**
 * The cabinet every game is mounted in.
 */

export type Readout = {
  label: string;
  value: string | number;
  accent?: boolean;
};

/**
 * How to play, in the fewest words that still work.
 */
export type HowToPlay = {
  /** What winning looks like, in one line. */
  goal: string;
  /** Two to four steps, in the order you do them. */
  steps: string[];
  /** Keys and clicks. Omitted where there is nothing but clicking. */
  controls?: string;
  /** What the score rewards, where that is not obvious. */
  scoring?: string;
};

export type Phase = "ready" | "playing" | "over";

function Rules({ how }: { how: HowToPlay }) {
  return (
    <div className="text-left">
      <p className="label text-ink-faint mb-1">How to play</p>
      <p className="mb-2 text-[0.9375rem] font-semibold">{how.goal}</p>
      <ol className="mb-2 space-y-1">
        {how.steps.map((step, i) => (
          <li key={step} className="flex gap-2 text-[0.875rem]">
            <span className="data text-ink-faint shrink-0">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {how.controls ? (
        <p className="text-ink-faint text-[0.8125rem]">
          <span className="label mr-1">Controls</span>
          {how.controls}
        </p>
      ) : null}
      {how.scoring ? (
        <p className="text-ink-faint text-[0.8125rem]">
          <span className="label mr-1">Scoring</span>
          {how.scoring}
        </p>
      ) : null}
    </div>
  );
}

/** The lesson a game is sitting on, read off the URL at the moment of the
 *  event. Nothing else about the reader is looked at. */
function pageOf(): string {
  if (typeof window === "undefined") return "unknown";
  return window.location.pathname.replace("/lessons/", "") || "home";
}

export function GameShell({
  gameId,
  name,
  instruction,
  howToPlay,
  readouts,
  phase,
  onStart,
  startLabel = "Play",
  finalScore,
  again,
  mood = "idle",
  children,
  footer,
}: {
  /** Stable id for the personal best. Omit for games that are not scored. */
  gameId?: string;
  name: string;
  instruction: string;
  /** Shown before the round, and reachable from the header during it. */
  howToPlay?: HowToPlay;
  readouts: Readout[];
  phase: Phase;
  onStart: () => void;
  startLabel?: string;
  /** The score to record when the round ends. */
  finalScore?: number;
  again?: ReactNode;
  /** Nimo's live reaction, games raise this on a hit, a miss or a streak. */
  mood?: Mood;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { best, submit } = useBestScore(gameId ?? "unscored");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, toggleMuted] = useMuted();

  // Recorded when the round ends, not while it runs, a best is a result.
  useEffect(() => {
    if (phase === "over" && gameId && typeof finalScore === "number") {
      submit(finalScore);
      trackGameFinished(gameId, pageOf(), finalScore);
    }
  }, [phase, gameId, finalScore, submit]);

  /* Wrapped so every cabinet reports the same two moments without each game
     having to remember to. The page is read off the URL rather than threaded
     through as a prop: it is the same thing the analytics page view already
     records, and a game does not otherwise know which lesson it is on. */
  const begin = useCallback(() => {
    if (gameId) trackGameStarted(gameId, pageOf());
    onStart();
  }, [gameId, onStart]);

  const beatenBest =
    phase === "over" &&
    typeof finalScore === "number" &&
    finalScore > 0 &&
    finalScore >= best;

  // Sound is wired here rather than in each game, so every cabinet gets it and
  // no game can forget. Mood is already the shared vocabulary for "that went
  // well" and "that did not", so it is the thing listened to.
  //
  // Refs hold the previous values rather than state, because a cue is a side
  // effect and turning one into a render would be a loop. They are written and
  // read only inside effects, never during render.
  const lastMood = useRef<Mood | null>(null);
  const lastPhase = useRef<Phase | null>(null);

  useEffect(() => {
    if (lastPhase.current !== phase) {
      const from = lastPhase.current;
      lastPhase.current = phase;
      // Nothing on first mount: the page should be silent until someone plays.
      if (from !== null) {
        if (phase === "playing") playCue("start");
        else if (phase === "over") playCue(beatenBest ? "best" : "over");
      }
      // Seed the mood on the way in, or the first call of every round is
      // swallowed as "no previous value" and answers silently.
      lastMood.current = phase === "playing" ? mood : null;
      return;
    }

    if (phase !== "playing") return;
    if (lastMood.current === mood) return;
    const from = lastMood.current;
    lastMood.current = mood;
    if (from === null) return;

    if (mood === "cheer" || mood === "celebrate") playCue("right");
    else if (mood === "wince") playCue("wrong");
    // Nothing for "think". Games drop back to it between rounds, and a noise
    // on every advance turns feedback into nagging.
  }, [phase, mood, beatenBest]);

  return (
    <div
      className="plate scroll-mt-20 overflow-hidden"
      id="game"
      data-section="game"
    >
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="flex items-center gap-3">
          <span className="label">{name}</span>
          <button
            type="button"
            onClick={toggleMuted}
            aria-pressed={muted}
            title={muted ? "Sound is off" : "Sound is on"}
            /* The padding is the tap target. As a bare label this was eleven
               pixels tall, which is a thumb's width away from unhittable on a
               phone; the negative margin keeps the header line where it was. */
            className="tap label text-ink-faint hover:text-ink -my-2 cursor-pointer px-1 py-2 underline-offset-2 hover:underline"
          >
            {muted ? "sound off" : "sound on"}
          </button>
          {howToPlay && phase === "playing" ? (
            <button
              type="button"
              onClick={() => setRulesOpen((open) => !open)}
              aria-expanded={rulesOpen}
              className="label text-ink-faint hover:text-ink cursor-pointer underline-offset-2 hover:underline"
            >
              {rulesOpen ? "hide rules" : "how to play"}
            </button>
          ) : null}
        </span>
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          {readouts.map((r) => (
            <div key={r.label} className="flex items-baseline gap-2">
              <dt className="label text-ink-faint">{r.label}</dt>
              <dd
                className={`data text-sm font-bold tabular-nums ${
                  r.accent ? "text-pink-text" : "text-ink"
                }`}
              >
                {r.value}
              </dd>
            </div>
          ))}
          {gameId && best > 0 ? (
            <div className="flex items-baseline gap-2">
              <dt className="label text-ink-faint">Best</dt>
              <dd className="data text-teal-text text-sm font-bold tabular-nums">
                {best}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* The cabinet grows for the ready and finished screens, which carry the
          rules and the debrief and are taller than the board itself, then
          settles back to the game's own height once play starts. Without this
          the overlay had to scroll inside a shorter box. */}
      <div className={`relative ${phase !== "playing" ? "min-h-[36rem]" : ""}`}>
        {/* Nimo watches the round and reacts. He is the loudest feedback in
            the cabinet, which is most of why a miss stings enough to retry. */}
        <span className="pointer-events-none absolute -top-1 right-2 z-20 hidden md:block">
          <Nimo
            mood={phase === "playing" ? mood : "curious"}
            follow={false}
            height={120}
            className="w-[120px]"
          />
        </span>

        {children}

        {howToPlay && rulesOpen && phase === "playing" ? (
          <div className="border-ink/25 bg-paper-sunk border-t px-5 py-4">
            <Rules how={howToPlay} />
          </div>
        ) : null}

        {phase !== "playing" ? (
          /* `m-auto` on the inner column rather than `justify-center` on the
             overlay. Centring a flex column that overflows its scroll container
             pushes the top out of reach, the how-to-play panel made the ready
             screen taller than the cabinet and its heading was clipped with no
             way to scroll back to it. `m-auto` centres when there is room and
             behaves when there is not. */
          <div className="bg-paper/92 absolute inset-0 z-10 flex flex-col overflow-y-auto px-6 py-6 text-center backdrop-blur-[2px]">
            <div className="m-auto flex w-full flex-col items-center gap-4">
              {phase === "ready" ? (
                <>
                  <p className="prose-measure text-ink-soft text-[0.9375rem]">
                    {instruction}
                  </p>
                  {howToPlay ? (
                    <div className="plate-flush prose-measure w-full max-w-md px-4 py-3">
                      <Rules how={howToPlay} />
                    </div>
                  ) : null}
                  {gameId && best > 0 ? (
                    <p className="label text-teal-text">Your best: {best}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={begin}
                    className="plate misreg btn-primary font-display px-6 py-3 text-lg font-bold"
                  >
                    {startLabel}
                  </button>
                </>
              ) : (
                <>
                  {beatenBest ? (
                    <p className="label text-teal-text">★ New best ★</p>
                  ) : null}
                  {again}
                  <button
                    type="button"
                    onClick={begin}
                    className="plate misreg btn-primary font-display px-6 py-3 text-lg font-bold"
                  >
                    Go again
                  </button>
                  {gameId && best > 0 && !beatenBest ? (
                    <p className="label text-ink-faint">Best so far: {best}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {footer ? (
        <div className="border-ink/25 text-ink-soft border-t px-4 py-3 text-sm">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
