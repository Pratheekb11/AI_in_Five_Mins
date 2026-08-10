"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  type BudgetScene,
  ceilingFor,
  clear,
  type ContextData,
  effectOf,
  KIND_NAMES,
  newScene,
  next,
  resultFor,
  run,
  scenarioOf,
  start as startRound,
  toggle,
} from "@/lib/game/budget";

/**
 * Context Budget, five slots, and everything you put in one costs you.
 */

let cached: Promise<ContextData> | null = null;

function loadContext(): Promise<ContextData> {
  if (!cached) {
    cached = fetch("/data/context.json").then((r) => {
      if (!r.ok) throw new Error(`context: ${r.status}`);
      return r.json() as Promise<ContextData>;
    });
  }
  return cached;
}

export function ContextBudget() {
  const [data, setData] = useState<ContextData | null>(null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<BudgetScene>(newScene);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    loadContext()
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
        data.scenarios.map(() => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const scenario = scenarioOf(data, scene);
  const slots = data?.slots ?? 5;

  const flip = useCallback(
    (card: string) => setScene((s) => toggle(s, slots, card)),
    [slots],
  );
  const wipe = useCallback(() => setScene((s) => clear(s)), []);
  const fire = useCallback(() => {
    if (!scenario) return;
    setScene((s) => run(s, scenario));
  }, [scenario]);
  const carryOn = useCallback(() => {
    if (!scenario) return;
    setScene((s) => next(s, scenario));
  }, [scenario]);

  const ceiling = scenario ? ceilingFor(scenario) : null;
  const pending = scenario ? resultFor(scenario, scene.chosen) : null;
  const shown = scene.shown;

  /* What it actually said, and whether that is the answer. `says` is the
     greedy continuation; `topText` is the single token it fell back from, so
     a data file built before the continuation existed still reads. */
  const said = shown ? (shown.says ?? shown.topText).trim() : "";
  /* Against `answer`, which is the string that was scored, not `answerLabel`,
     which is written for a human: the platform round is labelled "platform 9"
     and the model says "9 at twenty past six", which is correct. */
  const rightAnswer =
    !!scenario &&
    said.toLowerCase().startsWith(scenario.answer.trim().toLowerCase());
  const spent = scene.runsLeft <= 0;

  return (
    <GameShell
      gameId="context-budget"
      name="Context Budget"
      instruction="Five slots, a pile of cards, one question. You decide what the model gets to see, then you run it, and a real model finishes the sentence in front of you from exactly the context you built. Watch which cards change its answer. You get four runs per question."
      howToPlay={{
        goal: "Get the model to produce the right answer, using five slots.",
        steps: [
          "Read the question at the top.",
          "Click cards from the pile to put them in the window. Click again to take one out.",
          "Press Run it. The real model runs on exactly what you built, and it finishes the sentence in front of you.",
          "You only get four runs per question, so think before you spend one.",
        ],
        controls: "Tap or click cards and buttons.",
        scoring:
          "Based on how close you got to the best any combination can reach, plus any runs you did not need.",
      }}
      startLabel={data ? "Open the window" : "Loading the measurements…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !shown
          ? "think"
          : ceiling && shown.probability >= ceiling.probability * 0.9
            ? "celebrate"
            : shown.probability < 0.1
              ? "wince"
              : "cheer"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Best", value: `${(scene.best * 100).toFixed(0)}%` },
        { label: "Runs", value: scene.runsLeft },
        {
          label: "Slots",
          value: `${scene.chosen.length}/${slots}`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.solved} of {scene.order.length} filled well
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            The document with the answer in it was almost the whole game.
            Without it, nothing else got you anywhere. And the card that did the
            most damage was the example of a good answer, because the model
            copied its placeholder. The most helpful-looking thing in the pile
            was the worst thing to include. Relevance, not volume.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Every number is measured. {data.model.name} was run on the context
            those cards make, and the figure is its probability of producing the
            whole correct answer. The cards themselves were written for the
            game, because there is no public collection of plausible decoy
            memos, and the answer being scored is the one the relevant card
            states.
          </>
        ) : failed ? (
          <>The measurements did not load.</>
        ) : (
          <>Loading the measurements…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[26rem] sm:p-5 md:p-6">
        {scenario ? (
          <>
            <p className="label text-ink-faint mb-2">The question</p>
            <p className="prose-measure mb-5 text-[1.0625rem]">
              {scenario.ask}{" "}
              <span className="text-ink-faint">
                The model will be asked to finish: &ldquo;{scenario.question}
                &nbsp;&hellip;&rdquo;
              </span>
            </p>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="label text-ink-faint mb-2">
                  The pile: click a card to put it in the window
                </p>
                <ul className="space-y-2">
                  {scenario.cards.map((card) => {
                    const inWindow = scene.chosen.includes(card.id);
                    const full = scene.chosen.length >= slots && !inWindow;
                    return (
                      <li key={card.id}>
                        <button
                          type="button"
                          onClick={() => flip(card.id)}
                          disabled={full}
                          className={`plate w-full px-3 py-2 text-left transition-colors ${
                            inWindow
                              ? "border-yellow bg-yellow-wash"
                              : full
                                ? "opacity-40"
                                : "hover:border-ink cursor-pointer"
                          }`}
                        >
                          <span className="label text-ink-faint block">
                            {card.label}
                          </span>
                          <span className="block text-[0.875rem] leading-snug">
                            {card.text}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <p className="label text-ink-faint mb-2">
                  The window: {slots} slots
                </p>
                <ul className="mb-4 space-y-1.5">
                  {Array.from({ length: slots }, (_, i) => {
                    const id = scene.chosen[i];
                    const card = scenario.cards.find((c) => c.id === id);
                    return (
                      <li
                        key={i}
                        className={`border-ink/25 flex min-h-[2.5rem] items-center rounded-[2px] border border-dashed px-3 py-1.5 text-[0.875rem] ${
                          card
                            ? "bg-yellow-wash border-yellow border-solid"
                            : ""
                        }`}
                      >
                        {card ? (
                          card.label
                        ) : (
                          <span className="text-ink-faint">empty</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/*
                  What it says, not what it scores.
                */}
                <div className="plate-flush mb-3 px-3 py-3">
                  <p className="label text-ink-faint mb-2">
                    What it says next
                  </p>

                  <p className="prose-measure mb-1 text-[1.0625rem]">
                    <span className="text-ink-soft">{scenario.question}</span>{" "}
                    {shown ? (
                      <motion.span
                        key={said}
                        className={`data rounded-[2px] border px-1.5 py-0.5 font-bold ${
                          rightAnswer
                            ? "border-teal-text/40 bg-teal-wash text-teal-text"
                            : "border-pink-text/40 bg-pink-wash text-pink-text"
                        }`}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28 }}
                      >
                        {said || "\u2423"}
                      </motion.span>
                    ) : (
                      <span className="border-ink/30 text-ink-faint rounded-[2px] border border-dashed px-3 py-0.5">
                        ?
                      </span>
                    )}
                  </p>

                  {shown && !rightAnswer ? (
                    <p className="text-ink-faint mb-2 text-[0.8125rem]">
                      The right answer is{" "}
                      <span className="data">{scenario.answerLabel}</span>. It
                      is not being asked to guess — it is being asked to read.
                    </p>
                  ) : null}

                  <div className="mt-3 flex items-center gap-3">
                    <span className="label text-ink-faint shrink-0">
                      Chance of &ldquo;{scenario.answerLabel}&rdquo;
                    </span>
                    <span className="bg-paper-sunk border-ink/20 block h-3 grow overflow-hidden rounded-[1px] border">
                      <motion.span
                        className={`block h-full ${
                          !shown
                            ? "bg-ink/20"
                            : shown.probability > 0.5
                              ? "bg-teal"
                              : shown.probability > 0.15
                                ? "bg-yellow"
                                : "bg-pink"
                        }`}
                        initial={false}
                        animate={{
                          width: shown ? `${shown.probability * 100}%` : "0%",
                        }}
                        transition={{ duration: 0.65, ease: "easeOut" }}
                      />
                    </span>
                    <span className="data shrink-0 tabular-nums">
                      {shown ? `${(shown.probability * 100).toFixed(1)}%` : "-"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={fire}
                    disabled={spent || !pending}
                    className="plate misreg btn-primary font-display px-4 py-2 font-bold disabled:opacity-40"
                  >
                    Run it ({scene.runsLeft})
                  </button>
                  <button
                    type="button"
                    onClick={wipe}
                    disabled={scene.chosen.length === 0}
                    className="tap plate hover:border-ink px-4 py-2 disabled:opacity-40"
                  >
                    Empty the window
                  </button>
                  <button
                    type="button"
                    onClick={carryOn}
                    disabled={!shown}
                    className="tap plate hover:border-ink px-4 py-2 disabled:opacity-40"
                  >
                    {scene.at + 1 >= scene.order.length
                      ? "See the result"
                      : "Next question"}
                  </button>
                </div>
              </div>
            </div>

            {shown && ceiling ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-ink/20 mt-5 border-t pt-4"
                aria-live="polite"
              >
                <p className="mb-2 text-[0.9375rem] font-semibold">
                  {shown.probability >= ceiling.probability * 0.9
                    ? "That is about as good as these cards get."
                    : shown.probability < 0.1
                      ? "Almost no chance. Something in there is actively fighting the answer."
                      : "Something in the window is costing you."}
                </p>
                <p className="label text-ink-faint mb-2">
                  What each card in the window is doing, measured
                </p>
                <ul className="space-y-1">
                  {scene.chosen.map((id) => {
                    const card = scenario.cards.find((c) => c.id === id)!;
                    const effect = effectOf(scenario, scene.chosen, id);
                    if (!effect) return null;
                    const up = effect.delta >= 0;
                    return (
                      <li
                        key={id}
                        className="flex flex-wrap items-baseline gap-x-3 text-[0.875rem]"
                      >
                        <span className="w-44 shrink-0">{card.label}</span>
                        <span className="text-ink-faint">
                          {KIND_NAMES[card.kind]}
                        </span>
                        <span
                          className={`data tabular-nums ${
                            up ? "text-teal-text" : "text-pink-text"
                          }`}
                        >
                          {up ? "+" : ""}
                          {(effect.delta * 100).toFixed(1)} points
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ) : null}
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The measurements did not load, so there is nothing to fill."
              : "Loading the measurements…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
