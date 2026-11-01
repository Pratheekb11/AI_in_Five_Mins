"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { HoldRoom } from "@/components/game/HoldRoom";
import {
  answerFor,
  call,
  current,
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

export function ProvenanceDetective({
  initialData,
  initialScene,
}: {
  initialData?: ProvenanceData;
  initialScene?: ProvenanceScene;
} = {}) {
  const [data, setData] = useState<ProvenanceData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ProvenanceScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadProvenance().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 120 }, () => Math.random()),
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
        Array.from({ length: 120 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback((v: Verdict) => setScene((s) => call(s, v)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const truth = round ? answerFor(round) : null;
  const correct = revealed && scene.called === truth;

  const hint = (
    <p className="text-ink-soft text-[0.9375rem]">
      Tap where you think the answer has to come from.
    </p>
  );

  /* The evidence for a given call. Drawn invisibly before the call too, with
     the right door standing in, so the board already holds its room. */
  const reveal = (called: Verdict, live: boolean) => {
    if (!round || !truth) return null;
    const ok = called === truth;
    return (
      <div aria-live={live ? "polite" : undefined}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p
            className={`mb-3 text-[0.9375rem] font-semibold ${
              ok ? "text-teal-text" : "text-pink-text"
            }`}
          >
            {ok
              ? `${VERDICTS[truth!].label}. +${pointsFor(round, called)}`
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
                The answer is {round.truth}. No source helps with a sum. It
                needs a calculator.
              </p>
            </div>
          ) : (
            <>
              {/* What it said, cold and with the source pasted in. The two
                  answers are the evidence; the shares are one tap away. */}
              <ul className="mb-3 space-y-2">
                {[
                  { label: "Asked cold, it says", m: round.bare },
                  { label: "With the source pasted in", m: round.sourced },
                ].map((row) => {
                  const said = round.options[row.m.pick];
                  const right = row.m.pick === 0;
                  return (
                    <li key={row.label} className="text-[0.9375rem]">
                      <span className="label text-ink-faint mr-2">
                        {row.label}
                      </span>
                      <span
                        className={`data rounded-[2px] px-1.5 py-0.5 font-bold ${
                          right
                            ? "bg-teal-wash text-teal-text"
                            : "bg-pink-wash text-pink-text"
                        }`}
                      >
                        {said}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="prose-measure text-ink-soft mb-2 text-[0.9375rem]">
                {round.kind === "memory"
                  ? "It already knew this. The source barely changed anything."
                  : "Cold, it guessed wrong. With the source in front of it, it got it right. Same AI; it only needed something to read."}
              </p>
              <details className="text-ink-faint text-[0.8125rem]">
                <summary className="cursor-pointer underline underline-offset-2">
                  Source
                </summary>
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
                    : "."}{" "}
                  Of the four answers, cold it gave the right one{" "}
                  {Math.round(round.bare.probability * 100)}% of its vote; with
                  the source, {Math.round(round.sourced.probability * 100)}%.
                </p>
              </details>
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
          </div>
        </motion.div>
      </div>
    );
  };

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
      instruction="Does the AI already know the answer, need a source to read, or need a calculator? Guess, then see."
      howToPlay={{
        goal: "Guess where the answer has to come from.",
        steps: [
          "Read the question.",
          "Tap: it already knows, it needs the source, or it needs a real tool.",
          "See what it said cold, and with the source pasted in.",
        ],
        controls: "Tap or click, or press 1 to 3.",
        scoring: "Points for each right guess.",
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
          <p className="text-ink-soft text-[0.9375rem]">
            Before you trust an answer, ask: did it know this, did it need a
            source, or did it need a tool? The reply sounds the same either way.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Each answer was decided by measuring {data.model.name}. On{" "}
            {data.arithmetic.problems} simple sums it got{" "}
            {data.arithmetic.correct} right.
          </>
        ) : failed ? (
          <>The game did not load.</>
        ) : (
          <>Loading…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round ? (
          <>
            <p className="text-ink-soft mb-2 text-[0.9375rem]">
              Where does the answer have to come from?
            </p>
            <p className="prose-measure mb-4 text-[1.25rem] leading-snug">
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
                    className={`tap plate px-3 py-3 text-left transition-colors ${
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

            <HoldRoom
              shown={revealed ? reveal(scene.called!, true) : hint}
              held={revealed ? hint : truth ? reveal(truth, false) : null}
            />
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The game did not load. Try refreshing the page."
              : "Loading…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
