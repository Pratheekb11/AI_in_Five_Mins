"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { HowToPlayPopover } from "./HowToPlayPopover";
import { TapDemo } from "./TapDemo";
import { Nimo } from "@/components/nimo/Nimo";
import type { Mood } from "@/components/nimo/moods";
import { markInteraction } from "@/lib/firstInteraction";
import { useBestScore } from "@/lib/game/useBestScore";
import { pickNimoLine, type NimoEvent } from "@/lib/nimoReactions";
import { playCue, useMuted } from "@/lib/game/sound";
import { useProgress } from "@/lib/progress";
import { useTapHintCount } from "@/lib/tapHint";
import { trackGameFinished, trackGameStarted } from "@/lib/telemetry";
import { useIsPhone } from "@/lib/useMedia";

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
  streak,
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
  /** Consecutive correct calls, if the game tracks one. Nimo remarks on it
   *  once it reaches three. */
  streak?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { best, submit } = useBestScore(gameId ?? "unscored");
  const phone = useIsPhone();
  /* The provenance line is worth reading and not worth a scroll while a round
     is waiting. On a phone it folds. */
  const [noteOpen, setNoteOpen] = useState(false);
  /* Same trade on the ready screen's how-to-play: worth reading in full on a
     screen with room, not worth costing a phone the fit work done in
     FitBox — a full goal-plus-steps block ran a card 494px over budget at
     360 wide the last time this shipped unfolded. */
  const [howOpen, setHowOpen] = useState(false);
  const [muted, toggleMuted] = useMuted();
  const { progress, dismissNimo } = useProgress();

  /* Most games now deal their first round server-side and start straight in
     "playing" — the ready screen's how-to-play never mounts for them at all.
     This is the visual demo's actual home: a non-blocking hint over the live
     board. Once did not stick, so it repeats on someone's first several
     visits to THIS game specifically, then stops once that game's own count
     hits its limit — knowing the gesture on one game says nothing about
     whether it has been seen on another. Each mount shows it at most once,
     so it does not repeat every round within the same sitting. */
  const TAP_HINT_LIMIT = 5;
  const [tapHintCount, bumpTapHintCount] = useTapHintCount(
    gameId ?? "unscored",
  );
  const [hintVisible, setHintVisible] = useState(false);
  const hintShown = useRef(false);
  /* Both the cabinet's own onClickCapture and the hint's "Let's play" button
     call dismissTapHint for the same click — the click bubbles through the
     capture-phase handler on its way down, then reaches the button's own
     handler. Guarding on `hintVisible` state let both calls through in the
     same React event, since state does not update mid-event: one click
     bumped the count twice. A ref updates synchronously, so the second call
     sees it immediately. It also lets a manual dismiss cancel the pending
     auto-hide, which otherwise fired its own bump later regardless. */
  const hintSettled = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (
      phase !== "playing" ||
      tapHintCount >= TAP_HINT_LIMIT ||
      hintShown.current
    )
      return;
    hintShown.current = true;
    hintSettled.current = false;
    const show = setTimeout(() => setHintVisible(true));
    hideTimer.current = setTimeout(() => {
      hintSettled.current = true;
      setHintVisible(false);
      bumpTapHintCount();
    }, 5600);
    return () => {
      clearTimeout(show);
      clearTimeout(hideTimer.current);
    };
  }, [phase, tapHintCount, bumpTapHintCount]);

  const dismissTapHint = useCallback(() => {
    // hintShown guards games that never armed a hint this mount at all (the
    // per-game limit was already reached, say) — without it, every click
    // would bump a count that never had a hint to dismiss.
    if (!hintShown.current || hintSettled.current) return;
    hintSettled.current = true;
    clearTimeout(hideTimer.current);
    setHintVisible(false);
    bumpTapHintCount();
  }, [bumpTapHintCount]);

  const [reaction, setReaction] = useState<string | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const showReaction = useCallback(
    (event: NimoEvent) => {
      if (progress.nimoDismissed) return;
      setReaction(pickNimoLine(event));
      clearTimeout(reactionTimer.current);
      reactionTimer.current = setTimeout(() => setReaction(null), 4500);
    },
    [progress.nimoDismissed],
  );

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

    // Celebrate is specifically the upset — right where the model was
    // confidently wrong — which is the one worth a remark of its own.
    if (mood === "celebrate") setTimeout(() => showReaction("beatModel"));
    else if (mood === "wince") setTimeout(() => showReaction("fooled"));
  }, [phase, mood, beatenBest, showReaction]);

  // A streak is a run across several rounds, not a single mood change, so it
  // gets its own watch rather than riding the mood effect above.
  const streakFired = useRef(false);
  useEffect(() => {
    if (phase !== "playing" || !streak) {
      streakFired.current = false;
      return;
    }
    if (streak >= 3 && !streakFired.current) {
      streakFired.current = true;
      showReaction("streak");
    } else if (streak < 3) {
      streakFired.current = false;
    }
  }, [phase, streak, showReaction]);

  return (
    <div
      className="plate scroll-mt-20 overflow-hidden"
      id="game"
      data-section="game"
      /* One page-wide signal for "did they ever touch this game", good
         enough for the never-interacted ranking without wiring all twenty
         three games individually. */
      onClickCapture={() => {
        markInteraction();
        dismissTapHint();
      }}
    >
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b px-4 py-2 sm:gap-y-2 sm:py-3">
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
        </span>
        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 sm:gap-x-5 sm:gap-y-1">
          {readouts.map((r) => (
            <div key={r.label} className="flex items-baseline gap-2">
              <dt className="label text-ink-faint">{r.label}</dt>
              <dd
                className={`data text-[0.8125rem] font-bold tabular-nums sm:text-sm ${
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
              <dd className="data text-teal-text text-[0.8125rem] font-bold tabular-nums sm:text-sm">
                {best}
              </dd>
            </div>
          ) : null}
        </dl>
        {howToPlay ? <HowToPlayPopover how={howToPlay} /> : null}
      </div>

      {/* The cabinet grows for the ready and finished screens, which carry the
          rules and the debrief and are taller than the board itself, then
          settles back to the game's own height once play starts. Without this
          the overlay had to scroll inside a shorter box. */}
      {/* Board and overlay share one grid cell, so the cabinet is as tall as
          whichever of them needs it and neither has to scroll inside the
          other. The floor only applies from `sm` up: on a phone a 36rem floor
          is most of the screen spent on nothing. */}
      <div
        className={`relative grid ${
          phase !== "playing" ? "sm:min-h-[36rem]" : ""
        }`}
      >
        {/* Nimo watches the round and reacts. He is the loudest feedback in
            the cabinet, which is most of why a miss stings enough to retry. */}
        <span className="absolute -top-1 right-2 z-20 hidden md:block">
          <span className="pointer-events-none block">
            <Nimo
              mood={phase === "playing" ? mood : "curious"}
              follow={false}
              height={120}
              className="w-[120px]"
            />
          </span>

          {reaction && !progress.nimoDismissed ? (
            <div className="plate misreg absolute top-[86px] right-2 w-44 p-2 text-left">
              <button
                type="button"
                onClick={() => {
                  setReaction(null);
                  dismissNimo();
                }}
                aria-label="Stop Nimo's reactions"
                title="Stop Nimo's reactions"
                className="text-ink-faint hover:text-ink absolute top-0.5 right-1 cursor-pointer text-xs leading-none"
              >
                ×
              </button>
              <p className="pr-3 text-[0.75rem] leading-snug">{reaction}</p>
            </div>
          ) : null}
        </span>

        <div className="col-start-1 row-start-1 min-w-0">{children}</div>

        {howToPlay ? (
          <AnimatePresence>
            {hintVisible ? (
              <motion.div
                key="tap-hint"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="border-ink/25 bg-paper/95 absolute top-1/2 left-1/2 z-10 w-[min(220px,calc(100%-1rem))] -translate-x-1/2 -translate-y-1/2 rounded-[2px] border p-2 text-center shadow-[2px_2px_0_var(--ink)]"
              >
                <TapDemo />
                <p className="label text-ink-faint mb-2">
                  Tap or click a choice
                </p>
                <button
                  type="button"
                  onClick={dismissTapHint}
                  className="tap label border-ink/40 hover:border-ink w-full cursor-pointer rounded-[2px] border px-3 py-1.5"
                >
                  Let&rsquo;s play
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        ) : null}

        {phase !== "playing" ? (
          /* `m-auto` on the inner column rather than `justify-center` on the
             overlay. Centring a flex column that overflows its scroll container
             pushes the top out of reach, the how-to-play panel made the ready
             screen taller than the cabinet and its heading was clipped with no
             way to scroll back to it. `m-auto` centres when there is room and
             behaves when there is not. */
          <div className="bg-paper/92 col-start-1 row-start-1 z-10 flex flex-col px-5 py-5 text-center backdrop-blur-[2px] sm:px-6 sm:py-6">
            <div className="m-auto flex w-full flex-col items-center gap-3 sm:gap-4">
              {phase === "ready" ? (
                <>
                  {/* Rules were a click behind a "?" that nobody had to press
                      before playing blind. The ready screen — already a
                      layover the player dismisses by pressing Play — is
                      where they actually get read, so it shows the real
                      how-to-play instead of a paraphrase of it. Games without
                      one (WordMagnet) keep the plain instruction line.
                      TapDemo runs unconditionally, on a phone too: the words
                      explain scoring and controls, which need reading, but
                      the one thing every game shares — tap a choice, see it
                      answered — does not, and showing it costs nothing the
                      text-collapse below doesn't already save. */}
                  {howToPlay ? <TapDemo /> : null}
                  {howToPlay ? (
                    phone && !howOpen ? (
                      <button
                        type="button"
                        onClick={() => setHowOpen(true)}
                        className="tap label text-ink-faint border-ink/20 bg-paper-raised/60 w-full rounded-[2px] border px-3 py-2 text-center underline underline-offset-2"
                      >
                        How to play ▾
                      </button>
                    ) : (
                      <div className="prose-measure border-ink/20 bg-paper-raised/60 w-full rounded-[2px] border p-3 text-left sm:p-4">
                        <p className="label text-ink-faint mb-1">
                          How to play
                        </p>
                        <p className="mb-2 text-[0.9375rem] font-semibold">
                          {howToPlay.goal}
                        </p>
                        <ol className="space-y-1">
                          {howToPlay.steps.map((step, i) => (
                            <li
                              key={step}
                              className="flex gap-2 text-[0.875rem]"
                            >
                              <span className="data text-ink-faint shrink-0">
                                {i + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                        {howToPlay.controls ? (
                          <p className="text-ink-faint mt-2 text-[0.8125rem]">
                            <span className="label mr-1">Controls</span>
                            {howToPlay.controls}
                          </p>
                        ) : null}
                      </div>
                    )
                  ) : (
                    <p className="prose-measure text-ink-soft text-[0.9375rem]">
                      {instruction}
                    </p>
                  )}
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
        <div className="border-ink/25 text-ink-soft border-t px-4 py-2 text-[0.8125rem] sm:py-3 sm:text-sm">
          {/* Where the numbers come from is the whole premise of the site, so
              it never leaves the page. On a phone it is one line until asked
              for, because a paragraph of provenance under a live round is a
              screenful somebody has to scroll past to play. */}
          {phone && !noteOpen ? (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="tap label text-ink-faint w-full px-1 py-1.5 text-left underline underline-offset-2"
            >
              Where these numbers come from
            </button>
          ) : (
            footer
          )}
        </div>
      ) : null}
    </div>
  );
}
