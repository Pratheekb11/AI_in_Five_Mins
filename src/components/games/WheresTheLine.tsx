"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  call,
  costOf,
  current,
  DIALS,
  type DialId,
  newScene,
  next,
  pointAt,
  pointsFor,
  ROUNDS,
  start as startRound,
  type ThresholdData,
  type ThresholdScene,
} from "@/lib/game/threshold";

/**
 * Where's the Line. Same model, same messages, five places to draw it.
 */

let cached: Promise<ThresholdData> | null = null;

function loadThreshold(): Promise<ThresholdData> {
  if (!cached) {
    cached = fetch("/data/threshold.json").then((r) => {
      if (!r.ok) throw new Error(`threshold: ${r.status}`);
      return r.json() as Promise<ThresholdData>;
    });
  }
  return cached;
}

export function WheresTheLine() {
  const [data, setData] = useState<ThresholdData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<ThresholdScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadThreshold()
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
        Array.from({ length: 20 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback(
    (dial: DialId) => {
      if (!data) return;
      setScene((s) => call(data, s, dial));
    },
    [data],
  );
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const scenario = current(scene);
  const revealed = scene.called !== null;

  const chosenDial = DIALS.find((d) => d.id === scene.called);
  const chosen =
    data && chosenDial ? pointAt(data, chosenDial.threshold) : null;
  const cost = data && scenario && chosen ? costOf(scenario, chosen) : 0;
  const earned =
    data && scenario && scene.called
      ? pointsFor(data, scenario, scene.called)
      : 0;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "5") choose(DIALS[Number(e.key) - 1].id);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  return (
    <GameShell
      gameId="wheres-the-line"
      name="Where's the Line"
      instruction="One model, one set of messages, and a decision nobody thinks of as a decision: how sure does it have to be before it acts? You are told what each kind of mistake costs. Put the line somewhere."
      howToPlay={{
        goal: "Choose how sure the filter must be, given what each mistake costs here.",
        steps: [
          "Read the situation, and what a miss and a false alarm each cost in it.",
          "Choose one of five places to put the line.",
          "The real counts arrive, and you are charged for your choice against the cheapest one available.",
        ],
        controls: "Tap or click a choice, or press 1–5. Enter moves on.",
        scoring:
          "Up to 120 a round, full marks for the cheapest of the five choices offered.",
      }}
      startLabel={data ? "Take the dial" : "Loading the measurements…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : earned >= 120
            ? scene.streak >= 3
              ? "celebrate"
              : "cheer"
            : "wince"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Nailed", value: scene.perfect },
        { label: "Streak", value: `×${scene.streak}` },
        {
          label: "Case",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.perfect} of {scene.rounds.length} placed well
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Nothing about the model changed between those rounds. Same training,
            same messages, same probabilities. Everything that moved was the
            line, and the line is not a technical decision. It is a statement
            about which mistake you would rather make, and if nobody makes it on
            purpose it gets made anyway, at one half, by whoever wrote the
            library.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.model.name}. {data.model.note} {data.corpus.spamInTest} of
            those are spam and {data.corpus.hamInTest} are not.
          </>
        ) : failed ? (
          <>The measurements did not load.</>
        ) : (
          <>Loading the measurements…</>
        )
      }
    >
      <div className="min-h-[24rem] p-5 md:p-6">
        {scenario && data ? (
          <>
            <p className="label text-ink-faint mb-2">{scenario.title}</p>
            <p className="prose-measure mb-3 text-[1.125rem] leading-snug">
              {scenario.says}
            </p>
            <p className="text-ink-soft mb-5 text-[0.9375rem]">
              Here, one missed spam costs{" "}
              <span className="data font-bold">{scenario.missedCost}</span> and
              one wrongly blocked message costs{" "}
              <span className="data font-bold">{scenario.falseAlarmCost}</span>.
            </p>

            <div className="mb-5 grid gap-2 sm:grid-cols-5">
              {DIALS.map((dial, i) => {
                const yours = scene.called === dial.id;
                return (
                  <button
                    key={dial.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(dial.id)}
                    className={`plate px-3 py-3 text-left transition-colors ${
                      yours
                        ? "border-ink bg-paper-sunk"
                        : revealed
                          ? ""
                          : "hover:border-ink cursor-pointer"
                    }`}
                  >
                    <span className="label text-ink-faint mb-1 block">
                      {i + 1}
                    </span>
                    <span className="block text-[0.875rem] font-semibold">
                      {dial.label}
                    </span>
                    <span className="text-ink-faint mt-1 block text-[0.8125rem]">
                      {dial.means}
                    </span>
                  </button>
                );
              })}
            </div>

            {revealed && chosen ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="plate p-4">
                    <p className="label text-ink-faint mb-2">
                      What your line did
                    </p>
                    <p className="text-[0.9375rem]">
                      Caught{" "}
                      <span className="data text-teal-text font-bold">
                        {chosen.caught}
                      </span>{" "}
                      of {data.corpus.spamInTest} spam, missed{" "}
                      <span className="data text-pink-text font-bold">
                        {chosen.missed}
                      </span>
                      , and wrongly blocked{" "}
                      <span className="data text-pink-text font-bold">
                        {chosen.falseAlarms}
                      </span>{" "}
                      real messages.
                    </p>
                    <p className="text-ink-soft mt-2 text-[0.875rem]">
                      Accuracy {(chosen.accuracy * 100).toFixed(1)}% · precision{" "}
                      {(chosen.precision * 100).toFixed(1)}% · recall{" "}
                      {(chosen.recall * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="plate p-4">
                    <p className="label text-ink-faint mb-2">
                      What it cost, in this situation
                    </p>
                    <p className="display-md">
                      <span
                        className={
                          earned >= 120 ? "text-teal-text" : "text-pink-text"
                        }
                      >
                        {cost}
                      </span>
                      <span className="text-ink-faint text-base font-normal">
                        {" "}
                        against {scenario.best.cost} for the best line anywhere
                        on the curve
                      </span>
                    </p>
                    <p className="text-ink-soft mt-2 text-[0.875rem]">
                      That best line is one a team could tune their way to: it
                      catches {scenario.best.caught} with{" "}
                      {scenario.best.falseAlarms} false alarms. You were marked
                      against the five choices you were actually offered.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={carryOn}
                  className="btn-primary mt-4 px-4 py-2"
                >
                  {scene.at + 1 >= scene.rounds.length ? "Finish" : "Next case"}
                </button>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft">Loading the measurements…</p>
        )}
      </div>
    </GameShell>
  );
}
