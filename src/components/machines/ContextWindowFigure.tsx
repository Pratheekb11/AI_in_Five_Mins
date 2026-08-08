"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import {
  type ContextData,
  KIND_NAMES,
  resultFor,
  type Scenario,
} from "@/lib/game/budget";

/**
 * One window, one meter, and cards moving in and out of it.
 *
 * The window and the meter never leave the screen. Cards arrive, the window
 * fills, the oldest card is pushed out, and the meter answers. That is the
 * whole chapter, and it only reads as cause and effect because the meter is
 * the same meter throughout: if it were redrawn each step you would be
 * comparing two pictures from memory instead of watching one number move.
 *
 * The number is the model's measured probability of producing the right answer
 * from exactly the cards in the window, read out of the same file the game
 * upstairs is scored from. Every subset of the seven cards was measured, so
 * whatever the learner builds here has a real number waiting for it. Nothing is
 * interpolated and nothing is estimated.
 *
 * Stages:
 *   0  an empty window, and what it says with nothing in it
 *   1  the one card that carries the answer
 *   2  the window fills, and the oldest card falls out
 *   3  the reply does not change tone when the answer has gone
 *   4  put it back, and try any combination you like
 */

/** The order cards arrive in as the window fills, after the memo. */
const ARRIVALS = ["chat1", "chat2", "policy", "stale", "decoy"];

/**
 * The wifi scenario, because its measurements tell the story cleanly: nothing
 * at all without the memo, 89.9% with it, and a confident wrong answer when the
 * memo has been pushed out and only the decoy is left. It is also the scenario
 * the rest of this chapter already quotes.
 */
const SCENARIO = "wifi";

function stageCards(stage: number, slots: number): string[] {
  if (stage <= 0) return [];
  if (stage === 1) return ["doc"];
  // Full, and the memo has just been pushed off the end.
  if (stage === 2 || stage === 3) return ARRIVALS.slice(0, slots);
  // Put it back, and drop the two cards that were fighting it.
  return ["doc", "chat1", "chat2"];
}

export function ContextWindowFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<ContextData | null>(null);
  const [failed, setFailed] = useState(false);
  const [edit, setEdit] = useState<{ stage: number; cards: string[] }>();

  useEffect(() => {
    let alive = true;
    fetch("/data/context.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ContextData>;
      })
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="plate-flush p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          The measurements did not load, so there is nothing to fill. The rest
          of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the measurements…
        </p>
      </div>
    );
  }

  const scenario: Scenario =
    data.scenarios.find((s) => s.id === SCENARIO) ?? data.scenarios[0];
  const slots = data.slots;

  const chosen =
    edit && edit.stage === stage ? edit.cards : stageCards(stage, slots);
  const result = resultFor(scenario, chosen);
  const probability = result?.probability ?? 0;
  const canEdit = stage >= 4;

  function toggle(id: string) {
    const next = chosen.includes(id)
      ? chosen.filter((c) => c !== id)
      : chosen.length >= slots
        ? chosen
        : [...chosen, id];
    setEdit({ stage, cards: next });
  }

  const meterInk =
    probability > 0.4
      ? "bg-teal"
      : probability > 0.05
        ? "bg-yellow"
        : "bg-pink";

  return (
    <figure className="plate-flush overflow-hidden">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
        <p className="label text-ink-faint">
          Everything it can see, and nothing else
        </p>
        <p className="data text-ink-faint text-xs">
          {chosen.length} of {slots} slots
        </p>
      </div>

      <div className="px-4 py-4">
        {/* The window. Cards animate in and out of these slots rather than the
            list being redrawn, so a card being pushed out is a thing you see
            happen rather than a difference between two states. */}
        <ul className="mb-4 space-y-1.5">
          {Array.from({ length: slots }, (_, i) => {
            const id = chosen[i];
            const card = scenario.cards.find((c) => c.id === id);

            return (
              <li key={i}>
                <AnimatePresence mode="wait">
                  {card ? (
                    <motion.span
                      key={card.id}
                      layout={!still}
                      initial={still ? false : { opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={still ? undefined : { opacity: 0, x: -24 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex min-h-[2.5rem] items-center gap-3 rounded-[2px] border px-3 py-1.5 ${
                        card.kind === "relevant"
                          ? "border-teal bg-teal-wash"
                          : "border-yellow bg-yellow-wash"
                      }`}
                    >
                      <span className="text-[0.875rem] font-semibold">
                        {card.label}
                      </span>
                      <span className="label text-ink-faint">
                        {KIND_NAMES[card.kind]}
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="empty"
                      initial={false}
                      className="border-ink/25 text-ink-faint flex min-h-[2.5rem] items-center rounded-[2px] border border-dashed px-3 py-1.5 text-[0.875rem]"
                    >
                      empty
                    </motion.span>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>

        {/* The meter. This is the only thing in the figure that is allowed to
            be the hero, and it is the one thing that never gets replaced. */}
        <div className="border-ink/20 border-t pt-4">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="label text-ink-faint">
              Chance it answers &ldquo;{scenario.answerLabel}&rdquo;
            </p>
            <motion.p
              key={probability}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="data text-[1.5rem] leading-none font-bold tabular-nums"
            >
              {(probability * 100).toFixed(1)}%
            </motion.p>
          </div>

          <span className="bg-paper-sunk border-ink/20 block h-4 overflow-hidden rounded-[1px] border">
            <motion.span
              className={`block h-full ${meterInk}`}
              initial={false}
              animate={{ width: `${Math.max(probability * 100, 0)}%` }}
              transition={{ duration: still ? 0 : 0.6, ease: "easeOut" }}
            />
          </span>

          {result ? (
            <p className="text-ink-faint mt-2 text-[0.8125rem]">
              Its own favourite continuation right now is &ldquo;
              <span className="font-data">{result.topText.trim() || "␣"}</span>
              &rdquo;, at {(result.topProbability * 100).toFixed(1)}%.
            </p>
          ) : null}
        </div>

        {/* Stage three is the point of the whole chapter: the reply is written
            in the same voice whether the answer is in the window or not. */}
        {stage === 3 ? (
          <motion.p
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-ink/20 prose-measure text-ink-soft mt-4 border-t pt-4 text-[0.9375rem]"
          >
            Nothing above tells the reader the memo has gone, and the model does
            not know it is missing either. It still writes a confident sentence.
            The code in that sentence is now{" "}
            <span className="font-data">
              {result?.topText.trim() || "something else"}
            </span>
            , which it got from the leftover cards rather than from the answer.
          </motion.p>
        ) : null}
      </div>

      {canEdit ? (
        <div className="border-ink/20 border-t px-4 py-3">
          <p className="label text-ink-faint mb-2">
            Build it yourself. Every combination below was measured.
          </p>
          <div className="flex flex-wrap gap-2">
            {scenario.cards.map((card) => {
              const inWindow = chosen.includes(card.id);
              const full = chosen.length >= slots && !inWindow;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => toggle(card.id)}
                  disabled={full}
                  className={`rounded-[2px] border px-2 py-1 text-xs transition-colors ${
                    inWindow
                      ? "border-ink bg-paper-sunk font-semibold"
                      : full
                        ? "border-ink/20 opacity-40"
                        : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {card.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.model.name}, run on exactly the cards in the window. Every subset
        of the seven was measured, so nothing here is interpolated.
      </figcaption>
    </figure>
  );
}
