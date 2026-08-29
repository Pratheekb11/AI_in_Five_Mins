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

export function ContextBudget({
  initialData,
  initialScene,
}: {
  /** Embedded by the page at build time. Skips the fetch entirely. */
  initialData?: ContextData;
  /** Round one, already dealt server-side, so the first HTML this page
   *  sends is already the playing board. */
  initialScene?: BudgetScene;
} = {}) {
  const [data, setData] = useState<ContextData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<BudgetScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  // Falls back to a network fetch and a client-side deal only where a page
  // has not embedded round one server-side.
  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadContext().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          d.scenarios.map(() => Math.random()),
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
      <div className="min-h-[13rem] p-3 sm:min-h-[26rem] sm:p-5 md:p-6">
        {scenario ? (
          <>
            {/* The deck lands here with only a one-line headline above it —
                the round is dealt server-side, so `playing` is already true
                on arrival and the ready screen's `instruction` (which used
                to carry this setup) never mounts. Without a sentence here,
                the board just starts asking. */}
            <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-4">
              Somebody needs this answered for real. You decide what the
              model gets to see before it answers — the pile has the right
              document in it, and a few things that only look like they
              would help.
            </p>
            <p className="label text-ink-faint mb-1 sm:mb-2">The question</p>
            <p className="prose-measure mb-3 text-[1rem] sm:mb-5 sm:text-[1.0625rem]">
              {scenario.ask}{" "}
              {/* The sentence it has to finish is printed again, in full, in
                  the panel below. On a phone that second copy is two lines of
                  the screen spent saying the same thing. */}
              <span className="text-ink-faint hidden sm:inline">
                The model will be asked to finish: &ldquo;{scenario.question}
                &nbsp;&hellip;&rdquo;
              </span>
            </p>

            <div className="grid gap-2 sm:gap-5 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="label text-ink-faint mb-1 sm:mb-2">
                  The pile: click a card to put it in the window
                </p>
                {/* Once a run has happened the pile is a set of switches
                    rather than something to read, so on a phone it goes two
                    across and the measured result underneath stays on the
                    same screen. */}
                <ul
                  className={
                    shown
                      ? "grid grid-cols-2 gap-0.5 sm:block sm:space-y-2"
                      : "space-y-1 sm:space-y-2"
                  }
                >
                  {scenario.cards.map((card) => {
                    const inWindow = scene.chosen.includes(card.id);
                    const full = scene.chosen.length >= slots && !inWindow;
                    return (
                      <li key={card.id}>
                        <button
                          type="button"
                          onClick={() => flip(card.id)}
                          disabled={full}
                          className={`tap plate w-full px-3 py-1.5 text-left leading-snug transition-colors sm:py-2 ${
                            inWindow
                              ? "border-yellow bg-yellow-wash"
                              : full
                                ? "opacity-40"
                                : "hover:border-ink cursor-pointer"
                          }`}
                        >
                          {/* On a phone the label runs into the line rather
                              than above it: a card is two lines instead of
                              three, and seven cards fit the screen. */}
                          <span className="label text-ink-faint mr-2 inline sm:block">
                            {card.label}
                          </span>
                          {/* Once a run has happened the pile stops being
                              reading and becomes a set of switches, so on a
                              phone each card drops to one line and the result
                              underneath stays on the same screen. */}
                          <span
                            className={`text-[0.8125rem] leading-snug sm:block sm:max-w-none sm:overflow-visible sm:text-[0.875rem] sm:whitespace-normal ${
                              shown
                                ? "inline-block max-w-full truncate align-bottom"
                                : "inline"
                            }`}
                          >
                            {card.text}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                {/* Once the model has answered, the slot row has said all it
                    can: the chosen cards are lit in the pile and the count is
                    in the header. On a phone it stands down so the measured
                    result fits under it. */}
                <p
                  className={`label text-ink-faint mb-1 sm:mb-2 ${
                    shown ? "hidden sm:block" : ""
                  }`}
                >
                  The window: {slots} slots
                </p>
                {/* Five slots stand in a row on a phone rather than a column: what
                    the window is for is how much fits, and the count is in the
                    header while the chosen cards are lit in the pile above. */}
                <ul
                  className={`mb-3 grid grid-cols-5 gap-1 sm:mb-4 sm:grid-cols-1 sm:gap-1.5 ${
                    shown ? "hidden sm:grid" : ""
                  }`}
                >
                  {Array.from({ length: slots }, (_, i) => {
                    const id = scene.chosen[i];
                    const card = scenario.cards.find((c) => c.id === id);
                    return (
                      <li
                        key={i}
                        className={`border-ink/25 flex min-h-[2rem] items-center overflow-hidden rounded-[2px] border border-dashed px-1.5 py-1 text-[0.75rem] whitespace-nowrap sm:min-h-[2.5rem] sm:px-3 sm:py-1.5 sm:text-[0.875rem] ${
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
                <div className="plate-flush mb-2 px-3 py-1.5 sm:mb-3 sm:py-3">
                  <p className="label text-ink-faint mb-1 sm:mb-2">
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
                    className="plate misreg btn-primary font-display px-4 py-1.5 font-bold disabled:opacity-40 sm:py-2"
                  >
                    Run it ({scene.runsLeft})
                  </button>
                  <button
                    type="button"
                    onClick={wipe}
                    disabled={scene.chosen.length === 0}
                    className="tap plate hover:border-ink px-4 py-1.5 disabled:opacity-40 sm:py-2"
                  >
                    Empty the window
                  </button>
                  <button
                    type="button"
                    onClick={carryOn}
                    disabled={!shown}
                    className="tap plate hover:border-ink px-4 py-1.5 disabled:opacity-40 sm:py-2"
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
                className="border-ink/20 mt-3 border-t pt-3 sm:mt-5 sm:pt-4"
                aria-live="polite"
              >
                <p className="mb-1 text-[0.9375rem] font-semibold sm:mb-2">
                  {shown.probability >= ceiling.probability * 0.9
                    ? "That is about as good as these cards get."
                    : shown.probability < 0.1
                      ? "Almost no chance. Something in there is actively fighting the answer."
                      : "Something in the window is costing you."}
                </p>
                <p className="label text-ink-faint mb-1 sm:mb-2">
                  What each card in the window is doing, measured
                </p>
                <ul className="space-y-0.5 sm:space-y-1">
                  {scene.chosen.map((id) => {
                    const card = scenario.cards.find((c) => c.id === id)!;
                    const effect = effectOf(scenario, scene.chosen, id);
                    if (!effect) return null;
                    const up = effect.delta >= 0;
                    return (
                      <li
                        key={id}
                        className="flex flex-wrap items-baseline gap-x-3 text-[0.8125rem] leading-tight sm:text-[0.875rem] sm:leading-normal"
                      >
                        <span className="w-36 shrink-0 sm:w-44">
                          {card.label}
                        </span>
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
