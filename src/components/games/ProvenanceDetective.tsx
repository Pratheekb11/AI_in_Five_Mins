"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  answerFor,
  call,
  current,
  finish,
  isSum,
  newScene,
  next,
  pointsFor,
  type ProvenanceData,
  type ProvenanceScene,
  ROUND_SIZE,
  start as startRound,
  type Verdict,
  VERDICTS,
} from "@/lib/game/provenance";

/**
 * Provenance Detective, three doors, one question.
 */

let cached: Promise<ProvenanceData> | null = null;

function loadProvenance(): Promise<ProvenanceData> {
  if (!cached) {
    cached = fetch("/data/provenance.json").then((r) => {
      if (!r.ok) throw new Error(`provenance: ${r.status}`);
      return r.json() as Promise<ProvenanceData>;
    });
  }
  return cached;
}

const DOORS: Verdict[] = ["memory", "lookup", "tool"];

export function ProvenanceDetective() {
  const [data, setData] = useState<ProvenanceData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ProvenanceScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadProvenance()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const begin = useCallback(() => {
    if (!data) return;
    setScene(
      startRound(
        data,
        Array.from({ length: 120 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback((v: Verdict) => setScene((s) => call(s, v)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);
  const stopHere = useCallback(() => setScene((s) => finish(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const truth = round ? answerFor(round) : null;
  const correct = revealed && scene.called === truth;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "3") choose(DOORS[Number(e.key) - 1]);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  return (
    <GameShell
      gameId="provenance-detective"
      name="Provenance Detective"
      instruction="A question, and three doors. Does it already know this, does it need the source handing to it, or does it need a tool that can actually do the work? Call it before you see the evidence, because in real use you always have to."
      howToPlay={{
        goal: "Say where the answer would have to come from, before you see any evidence.",
        steps: [
          "Read the question.",
          "Choose one of three doors: it already knows this, it needs the source handing to it, or it needs a real tool.",
          "The evidence arrives. You see what the model does cold, and what it does with the source in front of it.",
        ],
        controls: "Tap or click a door, or press 1–3. Enter moves on.",
        scoring: "100 a call, plus 80 for spotting a gap the model hides well.",
      }}
      startLabel={data ? "Open the case" : "Loading the evidence…"}
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
        { label: "Right", value: scene.right },
        { label: "Streak", value: `×${scene.streak}` },
        {
          label: "Case",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUND_SIZE
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} called right
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            This is the habit worth keeping. Not &ldquo;is AI reliable&rdquo; .
            That question has no answer. Ask instead which of the three you are
            in. Recall, and it is probably fine. Something it would have to look
            up, and it needs the source or it will invent one. Actual work, and
            it needs a tool. The reply reads exactly the same in all three
            cases, which is the reason you have to ask before you send.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Which door each question belongs to was decided by measuring{" "}
            {data.model.name}, not chosen in advance. The sums are its real
            accuracy over {data.arithmetic.problems} seeded two-digit problems:{" "}
            {data.arithmetic.correct} correct.
          </>
        ) : failed ? (
          <>The evidence did not load.</>
        ) : (
          <>Loading the evidence…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round ? (
          <>
            <p className="label text-ink-faint mb-2">The question</p>
            <p className="prose-measure mb-5 text-[1.25rem] leading-snug">
              {round.ask}
            </p>

            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              {DOORS.map((door, i) => {
                const isTruth = revealed && door === truth;
                const isYours = scene.called === door;
                return (
                  <button
                    key={door}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(door)}
                    className={`plate px-3 py-3 text-left transition-colors ${
                      isTruth
                        ? "border-teal bg-teal-wash"
                        : isYours
                          ? "border-pink bg-pink-wash"
                          : revealed
                            ? ""
                            : "hover:border-ink cursor-pointer"
                    }`}
                  >
                    <span className="label text-ink-faint mb-1 block">
                      {i + 1}
                    </span>
                    <span className="block text-[0.9375rem] font-semibold">
                      {VERDICTS[door].label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-[4rem] sm:min-h-[11rem]" aria-live="polite">
              {revealed ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p
                    className={`mb-3 text-[0.9375rem] font-semibold ${
                      correct ? "text-teal-text" : "text-pink-text"
                    }`}
                  >
                    {correct
                      ? `${VERDICTS[truth!].label}. +${pointsFor(round, scene.called!)}`
                      : `Not quite. ${VERDICTS[truth!].label}.`}
                  </p>

                  {isSum(round) ? (
                    <div className="plate-flush px-4 py-3">
                      <p className="label text-ink-faint mb-1">
                        What it actually produced
                      </p>
                      <p className="font-data mb-2 text-[1.0625rem]">
                        {round.prompt}
                        <span className="bg-pink-wash text-pink-text ml-1 rounded-[2px] px-2">
                          {round.raw || "-"}
                        </span>
                      </p>
                      <p className="text-ink-soft text-[0.9375rem]">
                        The answer is {round.truth}. It read the shape of the
                        line as a statistics table and continued that instead.
                        Handing it a document would not help: nothing it could
                        read contains this sum. That is the difference between a
                        thing that recalls and a thing that computes.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="label text-ink-faint mb-2">
                        Chance it produces &ldquo;{round.answerLabel}&rdquo;
                      </p>
                      <ul className="mb-3 space-y-2">
                        {[
                          {
                            label: "Asked cold",
                            m: round.bare,
                            ink: "bg-pink",
                          },
                          {
                            label: "With the source in front of it",
                            m: round.sourced,
                            ink: "bg-teal",
                          },
                        ].map((row, i) => (
                          <li
                            key={row.label}
                            className="flex items-center gap-3"
                          >
                            <span className="w-44 shrink-0 text-[0.875rem]">
                              {row.label}
                            </span>
                            <span className="bg-paper-sunk border-ink/20 h-4 flex-1 overflow-hidden rounded-[1px] border">
                              <motion.span
                                className={`block h-full ${row.ink}`}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${row.m.probability * 100}%`,
                                }}
                                transition={{
                                  duration: 0.7,
                                  delay: 0.15 + i * 0.2,
                                  ease: "easeOut",
                                }}
                              />
                            </span>
                            <span className="data text-ink-soft w-16 shrink-0 text-right text-xs tabular-nums">
                              {(row.m.probability * 100).toFixed(
                                row.m.probability < 0.01 ? 2 : 1,
                              )}
                              %
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="prose-measure text-ink-soft mb-2 text-[0.9375rem]">
                        {round.kind === "memory"
                          ? "It had this already. The true answer was its own first choice, with no help at all. Handing it the source barely moved anything."
                          : `Cold, the true answer was its ${round.bare.rank + 1}th choice out of 50,257, and it would have said “${round.bare.topText.trim()}” instead. With the source in front of it, near-certain. Nothing about the model changed; only what it could see.`}
                      </p>
                      <p className="text-ink-faint text-[0.8125rem]">
                        <a
                          href={round.citation.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline underline-offset-2"
                        >
                          Checked against {round.citation.title}
                        </a>
                        {round.citation.revision
                          ? `, revision ${round.citation.revision}.`
                          : "."}
                      </p>
                    </>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={carryOn}
                      className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                    >
                      {scene.at + 1 >= scene.rounds.length
                        ? "See the result"
                        : "Next case"}
                    </button>

                    {/* The point is made by the third case. Everything after
                        it is practice, and practice nobody chose reads as
                        homework. */}
                    {scene.at >= 2 && scene.at + 1 < scene.rounds.length ? (
                      <button
                        type="button"
                        onClick={stopHere}
                        className="label border-ink/40 hover:border-ink cursor-pointer rounded-[2px] border px-4 py-2.5"
                      >
                        I have got it
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              ) : (
                <p className="text-ink-soft text-[0.9375rem]">
                  Keys 1&ndash;3 work. There is no way to tell from the answer
                  itself. That is the point of calling it first.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The evidence did not load, so there is no case to open."
              : "Loading the evidence…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
