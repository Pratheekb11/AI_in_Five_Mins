"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  answerFor,
  type CheckScene,
  choose,
  current,
  LAW,
  newScene,
  next,
  ROUND_SIZE,
  start as startRound,
  verdictFor,
  WHY_IT_MATTERS,
} from "@/lib/game/check";
import {
  type Door,
  DOORS,
  doorSpec,
  KIND_LABEL,
  KIND_NOTE,
} from "@/lib/game/paste";

/**
 * Would you paste it?
 */

export function PasteCheck({
  initialScene,
}: {
  /** Dealt server-side, this game has no external data, only a random
   *  seed, so there is nothing to wait on and no reason not to. */
  initialScene?: CheckScene;
} = {}) {
  const [scene, setScene] = useState<CheckScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  const begin = useCallback(() => {
    setScene(startRound(Array.from({ length: 40 }, () => Math.random())));
    setPlaying(true);
  }, []);

  const pick = useCallback(
    (door: Door) => setScene((s) => choose(s, door)),
    [],
  );
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const payload = current(scene);
  const revealed = scene.chosen !== null;
  const answer = payload ? answerFor(payload) : null;
  const verdict =
    payload && revealed ? verdictFor(payload, scene.chosen!) : null;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      const door = DOORS.find((d) => d.key === e.key);
      if (door) pick(door.id);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, pick, carryOn]);

  return (
    <GameShell
      gameId="paste-check"
      name="Would you paste it?"
      instruction="One thing at a time, and no clock. Deciding whether something may leave your organisation is not a reflex test. Say what you would do with it. Sending something further out than it should go costs you everything; holding back something harmless only costs you the tool."
      howToPlay={{
        goal: "Decide what you would actually do with each thing before pasting it in.",
        steps: [
          "Read what you are about to paste and what is in it.",
          "Choose: paste it as it is, strip the names and numbers first, or keep it out of the tool entirely.",
          "The category and the reasoning follow. There is no clock.",
        ],
        controls: "Tap or click a door, or press 1–3. Enter moves on.",
        scoring:
          "Sending something further out than it should go scores nothing. That is the mistake you cannot take back. Being too careful costs you a little.",
      }}
      startLabel="Open the first one"
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : verdict === "right"
            ? "cheer"
            : verdict === "leak"
              ? "wince"
              : "curious"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Right", value: scene.right },
        { label: "Leaked", value: scene.leaked },
        {
          label: "Item",
          value: `${Math.min(scene.at + 1, Math.max(scene.deck.length, 1))}/${
            scene.deck.length || ROUND_SIZE
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.deck.length} handled well
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            {scene.leaked > 0
              ? `${scene.leaked} ${scene.leaked === 1 ? "item" : "items"} sent further out than it should have gone. That is the one that cannot be taken back.`
              : "Nothing went further out than it should have."}
            {scene.overCautious > 0
              ? ` ${scene.overCautious} held back that would have been fine. That is worth knowing too, because a tool nobody is allowed to use is not a safe tool. It is an unused one.`
              : ""}
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            The useful habit is not a rule about AI. It is the question you
            would ask about any outside supplier: whose data is this, and did
            they agree to it going here?
          </p>
        </div>
      }
      footer={
        <>
          The routing rule scored against is this module&rsquo;s own policy, not
          a measurement. You cannot measure whether something ought to be
          pasted. The legal category is not ours to invent though: see{" "}
          <a
            href={LAW.url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
          >
            {LAW.article}
          </a>{" "}
          and the{" "}
          <a
            href={LAW.guidanceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
          >
            {LAW.guidance}
          </a>
          . None of the items is anybody&rsquo;s real data.
        </>
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {payload ? (
          <>
            {/* The premise. A board that opens on a bare task reads as a
                quiz somebody forgot to write the question for. */}
            <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-4">
              You are deciding what to hand an assistant, not whether to use
              one. Read what is in the request below, then choose how much of
              it you would really send.
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={payload.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="label text-ink-faint mb-2">
                  You are about to paste this in
                </p>
                <p className="prose-measure mb-1 text-[1.25rem] leading-snug">
                  {payload.text}
                </p>
                <p className="text-ink-soft mb-5 text-[0.9375rem]">
                  {payload.contains}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {DOORS.map((door) => {
                const isAnswer = revealed && door.id === answer;
                const isYours = scene.chosen === door.id;
                return (
                  <button
                    key={door.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => pick(door.id)}
                    className={`plate px-3 py-3 text-left transition-colors ${
                      isAnswer
                        ? "border-teal bg-teal-wash"
                        : isYours
                          ? "border-pink bg-pink-wash"
                          : revealed
                            ? ""
                            : "hover:border-ink cursor-pointer"
                    }`}
                  >
                    <span className="label text-ink-faint mb-1 block">
                      {door.key}
                    </span>
                    <span className="block text-[0.9375rem] font-semibold">
                      {door.label}
                    </span>
                    <span className="text-ink-soft block text-[0.8125rem]">
                      {door.means}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-[5rem] sm:min-h-[9rem]" aria-live="polite">
              {revealed && verdict ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p
                    className={`mb-2 text-[0.9375rem] font-semibold ${
                      verdict === "right"
                        ? "text-teal-text"
                        : verdict === "leak"
                          ? "text-pink-text"
                          : "text-yellow-text"
                    }`}
                  >
                    {verdict === "right"
                      ? `${doorSpec(answer!).label}. Yes.`
                      : verdict === "leak"
                        ? `That sends it further out than it should go. The call here is “${doorSpec(answer!).label}”.`
                        : verdict === "cautious"
                          ? "Safe, but this one was fine to use. Over-caution has a cost too."
                          : `Careful rather than wrong. The call here is “${doorSpec(answer!).label}”.`}
                  </p>

                  <p className="label text-ink-faint mb-1">
                    {KIND_LABEL[payload.kind]}
                  </p>
                  <p className="prose-measure text-ink-soft mb-3 text-[0.9375rem]">
                    {KIND_NOTE[payload.kind]}
                  </p>

                  {payload.kind !== "open" ? (
                    <ul className="mb-3 space-y-1">
                      {WHY_IT_MATTERS.map((row) => (
                        <li key={row.where} className="text-[0.875rem]">
                          <a
                            href={`/lessons/${row.slug}`}
                            className="label text-blue-text mr-2 underline underline-offset-2"
                          >
                            {row.where}
                          </a>
                          <span className="text-ink-soft">{row.finding}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <button
                    type="button"
                    onClick={carryOn}
                    className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                  >
                    {scene.at + 1 >= scene.deck.length
                      ? "See the result"
                      : "Next item"}
                  </button>
                </motion.div>
              ) : (
                <p className="text-ink-soft text-[0.9375rem]">
                  Keys 1&ndash;3 work. Take as long as you like, because that is
                  rather the point.
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </GameShell>
  );
}
