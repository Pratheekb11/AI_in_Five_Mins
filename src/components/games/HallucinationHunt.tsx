"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  flag as flagWord,
  type HuntData,
  type HuntScene,
  missed,
  newScene,
  type Puzzle,
  puzzleForDay,
  spanAt,
  start as startRound,
  stop,
  tick,
} from "@/lib/game/hunt";
import { useGameLoop } from "@/lib/game/useGameLoop";
import { useToday } from "@/lib/game/useToday";

/**
 * Hallucination Hunt.
 *
 * A real paragraph from a real encyclopedia with three things quietly changed,
 * and six flags to spend. Everybody gets the same paragraph on the same day,
 * which is the bit that brings people back.
 *
 * The flagged words settle in rather than snapping, and a found alteration is
 * struck through and replaced by what the source actually says. Seeing the true
 * wording arrive in place of the false one is the moment the round is for.
 */

let cached: Promise<HuntData> | null = null;

function loadHunt(): Promise<HuntData> {
  if (!cached) {
    cached = fetch("/data/hunt.json").then((r) => {
      if (!r.ok) throw new Error(`hunt: ${r.status}`);
      return r.json() as Promise<HuntData>;
    });
  }
  return cached;
}

export function HallucinationHunt() {
  const [data, setData] = useState<HuntData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<HuntScene>(newScene);
  const [playing, setPlaying] = useState(false);
  const day = useToday();

  useEffect(() => {
    let alive = true;
    loadHunt()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const daily: Puzzle | null =
    data && day ? puzzleForDay(data, day) : (data?.puzzles[0] ?? null);

  const begin = useCallback(() => {
    if (!daily) return;
    setScene(startRound(daily));
    setPlaying(true);
  }, [daily]);

  const another = useCallback(() => {
    if (!data) return;
    const pick = data.puzzles[Math.floor(Math.random() * data.puzzles.length)];
    setScene(startRound(pick));
    setPlaying(true);
  }, [data]);

  const running = playing && !scene.done && scene.clock > 0;
  useGameLoop((delta) => setScene((s) => tick(s, delta)), running);

  const hit = useCallback((word: number) => {
    setScene((s) => flagWord(s, word));
  }, []);
  const finish = useCallback(() => setScene((s) => stop(s)), []);

  const puzzle = scene.puzzle;
  const words = puzzle ? puzzle.text.split(" ") : [];
  const left = scene.done ? missed(scene) : [];

  return (
    <GameShell
      gameId="hallucination-hunt"
      name="Hallucination Hunt"
      instruction="A real paragraph from a real encyclopedia, with three things quietly changed. Click the words you do not believe. You get six flags for three errors, so clicking everything loses. Everyone gets the same paragraph today."
      howToPlay={{
        goal: "Find the three things that were changed, without flagging anything true.",
        steps: [
          "Read the paragraph. It is real, and three things in it have been quietly altered.",
          "Click any word you do not believe. Clicking anywhere inside an alteration finds the whole thing.",
          "You get six flags for three errors, so clicking everything loses.",
          "Press “That is all I can see” when you are done, and the source wording appears in place of each change.",
        ],
        controls: "Tap or click words.",
        scoring: "Harder errors are worth more, a wrong flag costs you, and the clock only affects the speed bonus. It never ends the round.",
      }}
      startLabel={data ? "Today's paragraph" : "Loading the paragraph…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !playing
          ? "idle"
          : scene.done
            ? scene.found.length === puzzle?.spans.length
              ? "celebrate"
              : "wince"
            : scene.found.length > 0
              ? "cheer"
              : "think"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        {
          label: "Found",
          value: `${scene.found.length}/${puzzle?.spans.length ?? 3}`,
        },
        { label: "Flags", value: scene.flagsLeft },
        { label: "Clock", value: Math.ceil(scene.clock) },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.found.length} of {puzzle?.spans.length ?? 3} found
          </p>
          <p className="text-ink-soft mb-3 text-[0.9375rem]">
            {scene.wrong > 0
              ? `${scene.wrong} ${scene.wrong === 1 ? "flag" : "flags"} on something that was true.`
              : "Nothing flagged that was actually true."}
          </p>
          <button
            type="button"
            onClick={another}
            className="plate hover:border-ink px-4 py-2 text-[0.9375rem]"
          >
            Try a different paragraph
          </button>
        </div>
      }
      footer={
        data && puzzle ? (
          <>
            The paragraph is the opening of{" "}
            <a
              href={puzzle.url}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2"
            >
              {puzzle.title}
            </a>
            {puzzle.revision ? `, revision ${puzzle.revision}` : ""}, {" "}
            {data.source.licence}. Every alteration was checked against that
            exact revision before this page was built, so the answer key and the
            source cannot have drifted apart. Go and diff it yourself.
          </>
        ) : failed ? (
          <>The paragraph did not load.</>
        ) : (
          <>Loading the paragraph…</>
        )
      }
    >
      <div className="min-h-[22rem] p-5 md:p-6">
        {puzzle ? (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <p className="label text-ink-faint">
                From the article on {puzzle.title}
              </p>
              {scene.clock <= 0 && !scene.done ? (
                <p className="label text-yellow-text">
                  Clock done. No rush, the bonus is just gone
                </p>
              ) : null}
            </div>

            <p className="prose-measure mb-5 text-[1.0625rem] leading-[1.9]">
              {words.map((word, i) => {
                const span = spanAt(puzzle, i);
                const isFound = span ? scene.found.includes(span.first) : false;
                const isWrongFlag = scene.flagged.includes(i) && !span;
                const shown = scene.done || isFound;

                return (
                  <span key={i}>
                    <motion.button
                      type="button"
                      disabled={scene.done || scene.flagsLeft <= 0 || isFound}
                      onClick={() => hit(i)}
                      animate={
                        isFound || isWrongFlag ? { scale: [1, 1.12, 1] } : {}
                      }
                      transition={{ duration: 0.3 }}
                      className={`rounded-[2px] px-0.5 transition-colors ${
                        shown && span
                          ? "bg-pink-wash text-pink-text line-through decoration-2"
                          : isWrongFlag
                            ? "bg-yellow-wash text-yellow-text"
                            : scene.done
                              ? ""
                              : "hover:bg-blue-wash cursor-pointer"
                      }`}
                    >
                      {word}
                    </motion.button>
                    {shown && span && i === span.last ? (
                      <>{" "}
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-teal-wash text-teal-text mx-1 rounded-[2px] px-1.5 font-semibold"
                      >
                        {span.original}
                      </motion.span>
                      </>
                    ) : null}{" "}
                  </span>
                );
              })}
            </p>

            {!scene.done ? (
              <button
                type="button"
                onClick={finish}
                className="plate hover:border-ink px-4 py-2 text-[0.9375rem]"
              >
                That is all I can see
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                aria-live="polite"
              >
                <p className="label text-ink-faint mb-2">
                  What was changed, and what the source says
                </p>
                <ul className="space-y-2">
                  {puzzle.spans.map((span) => {
                    const found = scene.found.includes(span.first);
                    return (
                      <li key={span.first} className="text-[0.875rem]">
                        <span
                          className={`label mr-2 ${
                            found ? "text-teal-text" : "text-pink-text"
                          }`}
                        >
                          {found ? "found" : "missed"}
                        </span>
                        <span className="label text-ink-faint mr-2">
                          {span.difficulty}
                        </span>
                        <span className="text-ink-soft">{span.why}</span>
                      </li>
                    );
                  })}
                </ul>
                {left.length > 0 ? (
                  <p className="text-ink-soft mt-3 text-[0.9375rem]">
                    The ones you missed read exactly as smoothly as the rest of
                    the paragraph. That is the whole problem. There is no
                    tell in the prose, because the prose was never the thing
                    that made it true.
                  </p>
                ) : null}
              </motion.div>
            )}
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The paragraph did not load, so there is nothing to hunt."
              : "Loading the paragraph…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
