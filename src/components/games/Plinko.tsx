"use client";

import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  boardWeights,
  DROPS,
  drop as dropBall,
  MAX_T,
  MIN_T,
  newScene,
  type PlinkoScene,
  promptOf,
  setTemperature,
  SLOTS,
  start as startRound,
} from "@/lib/game/plinko";
import { type LogitData, loadLogits } from "@/lib/logits";

/**
 * Plinko — you do not choose the word, you choose the odds.
 *
 * Each round names a token the model might produce next and gives you one
 * control: the temperature dial. Drop a ball and the slot it lands in is drawn
 * from the model's real distribution, reshaped by whatever you set the dial to.
 *
 * The teaching is in the frustration. To land the top token reliably you turn
 * the dial down and the machine becomes boringly predictable. To have any hope
 * of the fifth-ranked token you turn it up, and now nothing is reliable at all.
 * That trade is the entire meaning of the setting, and no diagram lands it the
 * way losing four balls in a row does.
 *
 * All the rules live in `@/lib/game/plinko`. Every draw is made here, in an
 * event, and handed to the reducer as a number — so the state updater stays
 * pure and a burst of clicks cannot outrun the ball count.
 */

export function Plinko() {
  const [data, setData] = useState<LogitData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<PlinkoScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadLogits()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const begin = useCallback(() => {
    if (!data) return;
    const rolls = data.prompts.map(() => Math.random());
    setScene(startRound(data, rolls, Math.random()));
    setPlaying(true);
  }, [data]);

  function drop() {
    if (!data) return;
    const roll = Math.random();
    const targetRoll = Math.random();
    setScene((s) => dropBall(data, s, roll, targetRoll));
  }

  const prompt = promptOf(data, scene);
  const weights = prompt ? boardWeights(prompt, scene.temperature) : [];
  const slots = prompt ? prompt.candidates.slice(0, SLOTS) : [];
  const chance = weights[scene.target] ?? 0;
  const last = scene.history[0];
  const phase = !playing ? "ready" : scene.done ? "over" : "playing";

  return (
    <GameShell
      gameId="plinko"
      name="Plinko"
      instruction="A real model, a real prompt, and its real odds on the next token. You are asked for a particular token — and the only thing you control is the temperature dial, which stretches or flattens those odds. Eight balls per prompt."
      howToPlay={{
        goal: "Land the ball on the token you are asked for.",
        steps: [
          "You are told which token to hit. You cannot aim — the only control is the temperature dial.",
          "Move the dial. Cold piles the odds onto the top token; hot spreads them into the tail.",
          "Drop a ball. Where it lands is drawn from the model's real odds, reshaped by your dial.",
          "Eight balls per prompt.",
        ],
        controls: "Drag the slider, then press Drop a ball.",
        scoring: "A hit you made unlikely is worth far more than an easy one.",
      }}
      startLabel={data ? "Load the odds" : "Loading the odds…"}
      phase={phase}
      onStart={begin}
      finalScore={scene.score}
      mood={!last ? "think" : last.hit ? "cheer" : "wince"}
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Hits", value: scene.hits },
        { label: "Balls", value: scene.dropsLeft },
        { label: "Temp", value: scene.temperature.toFixed(2) },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.score} points from {scene.hits} hits
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Turn the dial down and the machine repeats itself. Turn it up and it
            will say anything. There is no setting that makes it both surprising
            and reliable, which is why every assistant you use has already
            picked a compromise on your behalf.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.model.name}, real next-token odds. The dial reshapes the
            recorded logits and the slots are renormalised over the top {SLOTS}{" "}
            candidates &mdash; the rest of the{" "}
            {prompt?.vocabSize.toLocaleString("en-US") ?? "50,257"} tokens are still
            there in the model, just not on this board.
          </>
        ) : failed ? (
          <>The probabilities did not load.</>
        ) : (
          <>Loading the probabilities…</>
        )
      }
    >
      <div className="min-h-[21rem] p-5 md:p-6">
        {prompt ? (
          <>
            <p className="label text-ink-faint mb-2">The prompt</p>
            <p className="font-data bg-paper-sunk border-ink/25 mb-4 rounded-[2px] border px-4 py-3 text-[1.0625rem]">
              {prompt.text}
              <span className="bg-yellow-wash text-yellow-text ml-1 rounded-[2px] px-2">
                ?
              </span>
            </p>

            <p className="mb-4 text-[0.9375rem]">
              <span className="label text-ink-faint mr-2">Land on</span>
              <span className="font-data text-teal-text text-lg font-bold">
                {slots[scene.target]?.text.trim() || "␣"}
              </span>
              <span className="text-ink-soft ml-3">
                &mdash; {(chance * 100).toFixed(1)}% per ball at this setting
              </span>
            </p>

            <ul className="mb-5 space-y-1.5">
              {slots.map((candidate, i) => {
                const w = weights[i] ?? 0;
                const isTarget = i === scene.target;
                const justLanded = last && last.at === scene.at && last.index === i;
                return (
                  <li key={candidate.id} className="flex items-center gap-3">
                    <span
                      className={`font-data w-24 shrink-0 truncate text-sm ${
                        isTarget ? "text-teal-text font-bold" : ""
                      }`}
                    >
                      {candidate.text.trim() || "␣"}
                    </span>
                    <span
                      className={`h-4 rounded-[1px] ${
                        isTarget ? "bg-teal" : justLanded ? "bg-pink" : "bg-blue"
                      }`}
                      style={{ width: `${w * 72}%` }}
                      aria-hidden="true"
                    />
                    <span className="data text-ink-soft text-xs tabular-nums">
                      {(w * 100).toFixed(1)}%
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="border-ink/20 flex flex-wrap items-end gap-4 border-t pt-4">
              <label className="min-w-[14rem] flex-1">
                <span className="label text-ink-faint mb-1.5 block">
                  Temperature {scene.temperature.toFixed(2)}
                </span>
                <input
                  type="range"
                  min={MIN_T}
                  max={MAX_T}
                  step={0.05}
                  value={scene.temperature}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setScene((s) => setTemperature(s, next));
                  }}
                  className="accent-pink w-full"
                />
              </label>
              <button
                type="button"
                onClick={drop}
                disabled={phase !== "playing" || scene.dropsLeft <= 0}
                className="plate misreg btn-primary font-display px-5 py-2.5 font-bold disabled:opacity-40"
              >
                Drop a ball
              </button>
              <span className="data text-ink-soft text-xs tabular-nums">
                {scene.dropsLeft}/{DROPS} left
              </span>
            </div>

            <p
              className={`mt-4 min-h-[1.5rem] text-[0.9375rem] ${
                last
                  ? last.hit
                    ? "text-teal-text font-semibold"
                    : "text-pink-text"
                  : "text-ink-soft"
              }`}
              aria-live="polite"
            >
              {last
                ? last.hit
                  ? `Landed on “${last.text.trim() || "␣"}”. That is the one.`
                  : `Landed on “${last.text.trim() || "␣"}”. The dial changes the odds, never the outcome.`
                : "Set the dial, then drop. Cold makes the top token near-certain; hot spreads the mass to the tail."}
            </p>
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The probabilities did not load, so there is nothing to drop into."
              : "Loading the probabilities…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
