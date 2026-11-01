"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { HoldRoom } from "@/components/game/HoldRoom";
import {
  current,
  type ListenData,
  type ListenScene,
  newScene,
  next,
  pick,
  pointsFor,
  ROUND_SIZE,
  shownVariants,
  start as startRound,
  winnerOf,
} from "@/lib/game/listen";

/**
 * Show, Don't Ask.
 */

/** What the model actually produced, on one line. */
function saidBy(variant: { says?: string; topText: string }): string {
  return (variant.says ?? variant.topText).replace(/\n/g, "").trim();
}

let cached: Promise<ListenData> | null = null;

function loadListen(): Promise<ListenData> {
  if (!cached) {
    cached = fetch("/data/listen.json").then((r) => {
      if (!r.ok) throw new Error(`listen: ${r.status}`);
      return r.json() as Promise<ListenData>;
    });
  }
  return cached;
}

export function ShowDontAsk({
  initialData,
  initialScene,
}: {
  initialData?: ListenData;
  initialScene?: ListenScene;
} = {}) {
  const [data, setData] = useState<ListenData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ListenScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadListen().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 90 }, () => Math.random()),
        ),
      );
      setPlaying(true);
    })();
    return () => {
      alive = false;
    };
  }, [initialData, initialScene]);

  const begin = useCallback(() => {
    if (!data) return;
    setScene(
      startRound(
        data,
        Array.from({ length: 90 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback((id: string) => setScene((s) => pick(s, id)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const variants = shownVariants(scene);
  const revealed = scene.picked !== null;
  const winner = round ? winnerOf(round) : null;
  const correct = revealed && scene.picked === winner?.id;
  const widest = round
    ? Math.max(...round.variants.map((v) => v.probability), 1e-9)
    : 1;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= variants.length) choose(variants[n - 1].id);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn, variants]);

  /* The board for a given pick, or for none. Both versions are drawn, the
     one not on show invisibly, so answering does not change its height. */
  const board = (picked: string | null, live: boolean) => {
    if (!round) return null;
    const shown = picked !== null;
    const ok = shown && picked === winner?.id;
    return (
      <>
        <p className="label text-ink-faint mb-1 sm:mb-2">Goal</p>
        <p className="prose-measure mb-1 text-[1.0625rem]">{round.goal}</p>
        <div className="mb-3 sm:mb-4" />

        {/* Once they are evidence rather than a question, the five go
            two across on a wide screen, and the verdict takes the sixth cell
            beside the last one rather than a row of its own below the fold.
            The list is `contents` there so its items and the verdict share
            one grid. */}
        <div className={shown ? "sm:grid sm:grid-cols-2 sm:gap-2" : ""}>
          <ul
            className={`space-y-1.5 ${shown ? "sm:contents" : "sm:space-y-2"}`}
          >
            {variants.map((variant, i) => {
              const isWinner = shown && variant.id === winner?.id;
              const isYours = picked === variant.id;
              return (
                <li key={variant.id}>
                  <button
                    type="button"
                    disabled={shown}
                    onClick={() => choose(variant.id)}
                    className={`tap plate w-full px-3 py-2 text-left transition-colors sm:px-4 sm:py-3 ${
                      isWinner
                        ? "border-teal bg-teal-wash"
                        : isYours
                          ? "border-pink bg-pink-wash"
                          : shown
                            ? ""
                            : "hover:border-ink cursor-pointer"
                    }`}
                  >
                    <span className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="label text-ink-faint">{i + 1}</span>
                      {shown ? (
                        <span className="label text-ink-faint">
                          {data?.styles[variant.style]}
                        </span>
                      ) : null}
                      {isYours ? (
                        <span className="label text-pink-text">you</span>
                      ) : null}
                    </span>
                    {/* Before the pick this is the question, so it is
                          printed in full. After it, the reader has already
                          read all four and the evidence is the bar: on a phone
                          the prompt drops back to two lines so the whole
                          result stays on one screen. */}
                    <span
                      className={`font-data text-[0.9375rem] whitespace-pre-wrap ${
                        shown
                          ? "line-clamp-1 sm:block sm:line-clamp-none"
                          : "block"
                      }`}
                    >
                      {variant.prompt}
                    </span>

                    {shown ? (
                      <span className="mt-2 flex items-center gap-3">
                        <span className="bg-paper-sunk border-ink/20 h-3 flex-1 overflow-hidden rounded-[1px] border">
                          <motion.span
                            className={`block h-full ${
                              isWinner ? "bg-teal" : "bg-ink/30"
                            }`}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(variant.probability / widest) * 100}%`,
                            }}
                            transition={{
                              duration: 0.7,
                              delay: 0.2,
                              ease: "easeOut",
                            }}
                          />
                        </span>
                        {/* What came back rides on the bar that measured
                              it. It used to be a second list underneath, which
                              printed every prompt twice and pushed the verdict
                              off the bottom of the screen. */}
                        <span
                          className={`data max-w-[45%] shrink truncate rounded-[2px] border px-1.5 py-0.5 text-xs font-bold ${
                            isWinner
                              ? "border-teal-text/40 bg-teal-wash text-teal-text"
                              : "border-ink/25 text-ink-faint"
                          }`}
                        >
                          {saidBy(variant)
                            ? `says \u201c${saidBy(variant)}\u201d`
                            : "says nothing"}
                        </span>
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            className={`mt-2 min-h-[4rem] ${
              shown
                ? "sm:mt-0 sm:self-center sm:px-2"
                : "sm:mt-4 sm:min-h-[6rem]"
            }`}
            aria-live={live ? "polite" : undefined}
          >
            {shown && winner ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
                /* On a phone the verdict and Next one share a line and the
                   explanation follows, so the button is never the thing below
                   the bottom of the screen. Block from `sm`, in DOM order. */
                className="flex flex-wrap items-center justify-between gap-x-3 sm:block"
              >
                <p
                  className={`order-1 mb-1 text-[0.9375rem] font-semibold ${
                    ok ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {ok ? `Right. +${pointsFor(round, picked)}` : "Not that one."}
                </p>
                {/* What each phrasing actually got back. Asking politely
                      returns an empty line, and printing that blank is worth
                      more than any number beside it. */}
                <p className="prose-measure text-ink-soft order-3 mt-2 mb-2 basis-full text-[0.8125rem] sm:mt-0 sm:mb-3 sm:text-[0.9375rem]">
                  {(() => {
                    const said = saidBy(winner);
                    const want = round.target.trim();
                    return said.toLowerCase().startsWith(want.toLowerCase())
                      ? `Only the example changed what it did, and it answered \u201c${said}\u201d.`
                      : `Only the example changed what it did: one word, like the example. But it said \u201c${said}\u201d, not \u201c${want}\u201d.`;
                  })()}
                </p>
                <button
                  type="button"
                  onClick={carryOn}
                  className="plate misreg btn-primary font-display order-2 px-5 py-2.5 font-bold"
                >
                  {scene.at + 1 >= scene.rounds.length
                    ? "See the result"
                    : "Next one"}
                </button>
              </motion.div>
            ) : (
              <p className="text-ink-soft text-[0.9375rem]">
                Tap the one you think works.
              </p>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <GameShell
      gameId="show-dont-ask"
      name="Show, Don't Ask"
      instruction="Four ways to ask for the same thing. Guess which one changes what the AI does."
      howToPlay={{
        goal: "Guess which way of asking changes the AI's answer most.",
        steps: [
          "Read what you want from the AI.",
          "Tap the way of asking you think works best.",
          "See what the AI said to each one.",
        ],
        controls: "Tap or click, or press 1 to 4.",
        scoring: "Points for picking the one that worked.",
      }}
      startLabel={data ? "Play" : "Loading…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : correct
            ? scene.streak >= 3
              ? "celebrate"
              : "cheer"
            : "wince"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        {
          label: "Round",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUND_SIZE
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} right
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Asking nicely or giving it a job title changed nothing. One example
            changed its whole answer to match the example&rsquo;s shape.
            Examples steer hard, so make yours a good one.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Measured on {data.model.name}, a small AI with no training to follow
            instructions. Chat assistants do follow instructions, but an example
            still steers them hard.
          </>
        ) : failed ? (
          <>The game did not load.</>
        ) : (
          <>Loading…</>
        )
      }
    >
      <div className="min-h-[13rem] p-3 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round ? (
          <>
            {/* The premise. A board that opens on a bare task reads as a
                quiz somebody forgot to write the question for. */}
            <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-4">
              Four ways to ask for the same thing. Which one changes what the AI
              does?
            </p>
            <HoldRoom
              shown={board(scene.picked, true)}
              held={board(
                scene.picked === null ? (winner?.id ?? null) : null,
                false,
              )}
            />
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The measurements did not load, so there is nothing to compare."
              : "Loading the measurements…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
