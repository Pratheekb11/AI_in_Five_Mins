"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  type BudgetScene,
  ceilingFor,
  type ContextData,
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

/** Plain names for the kinds of card, where the scenario's own label leans on
 *  a word a newcomer does not use ("superseded"). */
const PLAIN_LABEL: Partial<Record<string, string>> = {
  stale: "An old plan, since changed",
  example: "An example answer",
};

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
      instruction="Pick which cards the AI gets to read, then ask it. It only knows what you give it."
      howToPlay={{
        goal: "Get the AI to give the right answer.",
        steps: [
          "Read the question.",
          "Tap the cards the AI should read. Tap again to take one back.",
          "Press Ask the AI and see what it says.",
        ],
        controls: "Tap or click.",
        scoring:
          "More points the closer you get to the best answer these cards allow.",
      }}
      startLabel={data ? "Play" : "Loading…"}
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
        { label: "Question", value: `${scene.at + 1}/${scene.order.length}` },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.solved} of {scene.order.length} filled well
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            The card with the answer did nearly all the work. The most dangerous
            card was the example answer: the AI copied it. Give it the right
            thing, not more things.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            The cards were written for the game. Every answer and chance is{" "}
            {data.model.name}&rsquo;s real output on exactly the cards you
            picked.
          </>
        ) : failed ? (
          <>The game did not load.</>
        ) : (
          <>Loading…</>
        )
      }
    >
      <div className="min-h-[13rem] p-3 sm:min-h-[26rem] sm:p-5 md:p-6">
        {scenario ? (
          <>
            <p className="text-ink-soft mb-2 text-[0.9375rem] sm:mb-3">
              Tap the cards the AI should read, then ask it.
            </p>
            <p className="prose-measure mb-3 text-[1.0625rem] font-semibold sm:mb-4">
              {scenario.ask}
            </p>

            <div className="grid gap-2 sm:gap-5 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="label text-ink-faint mb-1 sm:mb-2">
                  Cards ({scene.chosen.length} of {slots} picked)
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
                            {PLAIN_LABEL[card.kind] ?? card.label}
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
                <p className="label text-ink-faint mb-2 hidden sm:block">
                  What the AI will read
                </p>
                {/* The slots themselves are for a wide screen. On a phone the
                    chosen cards are lit in the pile above and the label carries
                    the count, and drawing the slots as well put Run below the
                    bottom of the screen. Hidden from the start, not only after
                    a run, so the board is one height throughout. */}
                <ul className="mb-3 hidden grid-cols-1 gap-1 sm:grid">
                  {Array.from({ length: slots }, (_, i) => {
                    const id = scene.chosen[i];
                    const card = scenario.cards.find((c) => c.id === id);
                    return (
                      <li
                        key={i}
                        className={`border-ink/25 flex min-h-[2rem] items-center overflow-hidden rounded-[2px] border border-dashed px-1.5 py-1 text-[0.75rem] whitespace-nowrap sm:min-h-[2rem] sm:px-3 sm:py-1 sm:text-[0.875rem] ${
                          card
                            ? "bg-yellow-wash border-yellow border-solid"
                            : ""
                        }`}
                      >
                        {card ? (
                          (PLAIN_LABEL[card.kind] ?? card.label)
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
                    What the AI says
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
                      {scene.chosen.some(
                        (id) =>
                          scenario.cards.find((c) => c.id === id)?.kind ===
                          "relevant",
                      )
                        ? "The answer was in there, but another card confused it."
                        : "The answer was not in what it read, so it guessed."}{" "}
                      Right answer: {scenario.answerLabel}.
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
                  {/* One button. It asks; once the answer is in and there is
                      nothing new to ask, it moves on. Changing a card makes
                      it ask again. */}
                  {pending && pending !== shown && !spent ? (
                    <button
                      type="button"
                      onClick={fire}
                      className="plate misreg btn-primary font-display px-4 py-1.5 font-bold sm:py-2"
                    >
                      {shown ? "Ask again" : "Ask the AI"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={carryOn}
                      disabled={!shown}
                      className="plate misreg btn-primary font-display px-4 py-1.5 font-bold disabled:opacity-40 sm:py-2"
                    >
                      {scene.at + 1 >= scene.order.length
                        ? "See the result"
                        : "Next question"}
                    </button>
                  )}
                </div>
              </div>
            </div>
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
