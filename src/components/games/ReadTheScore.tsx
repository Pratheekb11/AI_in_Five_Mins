"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import { HoldRoom } from "@/components/game/HoldRoom";
import {
  BANDS,
  type BandId,
  bandOf,
  call,
  current,
  type LogisticData,
  type LogisticScene,
  newScene,
  next,
  pointsFor,
  ROUNDS,
  start as startRound,
} from "@/lib/game/logistic";

/**
 * Read the Score. A real message, two numbers, and how sure the model is.
 */

let cached: Promise<LogisticData> | null = null;

function loadLogistic(): Promise<LogisticData> {
  if (!cached) {
    cached = fetch("/data/logistic.json").then((r) => {
      if (!r.ok) throw new Error(`logistic: ${r.status}`);
      return r.json() as Promise<LogisticData>;
    });
  }
  return cached;
}

export function ReadTheScore({
  initialData,
  initialScene,
}: {
  initialData?: LogisticData;
  initialScene?: LogisticScene;
} = {}) {
  const [data, setData] = useState<LogisticData | null>(initialData ?? null);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<LogisticScene>(
    () => initialScene ?? newScene(),
  );
  const [playing, setPlaying] = useState(!!initialScene);

  useEffect(() => {
    if (initialScene) return;
    let alive = true;
    (async () => {
      const d = initialData ?? (await loadLogistic().catch(() => null));
      if (!alive) return;
      if (!d) {
        setFailed(true);
        return;
      }
      if (!initialData) setData(d);
      setScene(
        startRound(
          d,
          Array.from({ length: 20 }, () => Math.random()),
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
        Array.from({ length: 20 }, () => Math.random()),
      ),
    );
    setPlaying(true);
  }, [data]);

  const choose = useCallback((id: BandId) => setScene((s) => call(s, id)), []);
  const carryOn = useCallback(() => setScene((s) => next(s)), []);

  const round = current(scene);
  const revealed = scene.called !== null;
  const truth = round ? bandOf(round.probability) : null;
  const earned = round && scene.called ? pointsFor(round, scene.called) : 0;

  useEffect(() => {
    if (!playing || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "5") choose(BANDS[Number(e.key) - 1].id);
      else if (e.key === "Enter" || e.key === " ") carryOn();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, scene.done, choose, carryOn]);

  /* The verdict for this message. Drawn invisibly before the call too, so
     the board already holds its room and answering moves nothing. */
  const verdict = (good: boolean, live: boolean) => {
    if (!round) return null;
    return (
      <div aria-live={live ? "polite" : undefined}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          /* On a phone the number, then Next message, then why. */
          className="flex flex-col sm:block"
        >
          <p className="display-md order-1 mb-1">
            <span className={good ? "text-teal-text" : "text-pink-text"}>
              {(round.probability * 100).toFixed(1)}%
            </span>
            <span className="text-ink-faint text-base font-normal">
              {" "}
              is what it gives this one
            </span>
          </p>
          <p className="prose-measure text-ink-soft order-3 mt-2 text-[0.9375rem] sm:mt-0">
            It really was {round.spam ? "spam" : "an ordinary message"}.
            {round.spam === 1 && round.probability < 0.5
              ? " So the model got it wrong, and its own number said it was unsure. That is the useful part: a model that says 20% is telling you something a yes or a no would have hidden."
              : round.spam === 0 && round.probability >= 0.5
                ? " So the model got it wrong, and confidently. Two features are not many, and the page under this game says so."
                : " The model called it correctly."}
          </p>
          <button
            type="button"
            onClick={carryOn}
            className="plate misreg btn-primary font-display order-2 mt-2 self-start px-5 py-2.5 font-bold sm:mt-4"
          >
            {scene.at + 1 >= scene.rounds.length ? "Finish" : "Next message"}
          </button>
        </motion.div>
      </div>
    );
  };

  return (
    <GameShell
      gameId="read-the-score"
      name="Read the Score"
      instruction="A real message the model has never seen, and the only two things it knows about it: how long it is, and how many digits it has. How sure will it be?"
      howToPlay={{
        goal: "Say how confident the model will be, not whether the message is spam.",
        steps: [
          "Read the message, its length and its digit count.",
          "Pick a band, from almost certainly not to almost certainly spam.",
          "The model's real probability arrives, along with whether it was right.",
        ],
        controls: "Tap or click a band, or press 1–5. Enter moves on.",
        scoring: "100 for the right band, 40 for either side of it.",
      }}
      startLabel={data ? "Read the first one" : "Loading the messages…"}
      phase={!playing ? "ready" : scene.done ? "over" : "playing"}
      onStart={begin}
      finalScore={scene.score}
      mood={
        !revealed
          ? "think"
          : earned >= 100
            ? scene.streak >= 3
              ? "celebrate"
              : "cheer"
            : "wince"
      }
      readouts={[
        { label: "Score", value: scene.score, accent: true },
        { label: "Exact", value: scene.right },
        { label: "Streak", value: `×${scene.streak}` },
        {
          label: "Message",
          value: `${Math.min(scene.at + 1, Math.max(scene.rounds.length, 1))}/${
            scene.rounds.length || ROUNDS
          }`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {scene.right} of {scene.rounds.length} in the right band
          </p>
          <p className="text-ink-soft mb-2 text-[0.9375rem]">
            Best run: {scene.bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Notice how much of that you could do from two numbers. That is what
            a model with two features is: a line, and a way of turning distance
            from that line into a probability. Everything else in machine
            learning is the same idea with more numbers, which is why this one
            is worth being able to draw.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            {data.model.name}, trained on {data.corpus.trainSize} messages and
            scoring {(data.final.testAccuracy * 100).toFixed(1)}% on the{" "}
            {data.corpus.testSize} it never saw. {data.model.note}
          </>
        ) : failed ? (
          <>The messages did not load.</>
        ) : (
          <>Loading the messages…</>
        )
      }
    >
      <div className="min-h-[13rem] p-4 sm:min-h-[24rem] sm:p-5 md:p-6">
        {round ? (
          <>
            {/* The premise. A board that opens on a bare task reads as a
                quiz somebody forgot to write the question for. */}
            <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-4">
              <span className="sm:hidden">
                Say how likely a trained filter is to call this message spam.
              </span>
              <span className="hidden sm:inline">
                A trained spam filter is about to score the message below, and
                the only two things it looks at are printed underneath it. Say
                how likely you think it is to call this one spam.
              </span>
            </p>
            <p className="label text-ink-faint mb-2">
              A message it has not seen
            </p>
            <p className="font-data prose-measure mb-3 text-[0.9375rem] whitespace-pre-wrap">
              {round.text}
            </p>
            <p className="text-ink-soft mb-3 text-[0.9375rem] sm:mb-5">
              <span className="data font-bold">{round.length}</span> characters
              · <span className="data font-bold">{round.digits}</span> digits.
              That is everything the model gets.
            </p>

            <div className="mb-4 grid gap-2 sm:mb-5 sm:grid-cols-5">
              {BANDS.map((band, i) => {
                const yours = scene.called === band.id;
                const won = truth === band.id;
                return (
                  <button
                    key={band.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => choose(band.id)}
                    className={`plate px-3 py-2 text-left transition-colors sm:py-3 ${
                      !revealed
                        ? "hover:border-ink cursor-pointer"
                        : won
                          ? "border-teal bg-teal-wash"
                          : yours
                            ? "border-pink bg-pink-wash"
                            : ""
                    }`}
                  >
                    {/* One line each on a phone: number, label, range. */}
                    <span className="label text-ink-faint mr-2 sm:mb-1 sm:block">
                      {i + 1}
                    </span>
                    <span className="text-[0.875rem] font-semibold sm:block">
                      {band.label}
                    </span>
                    <span className="text-ink-faint ml-2 text-[0.8125rem] sm:mt-1 sm:ml-0 sm:block">
                      {band.means}
                    </span>
                  </button>
                );
              })}
            </div>

            <HoldRoom
              shown={revealed ? verdict(earned >= 100, true) : null}
              held={revealed ? null : verdict(true, false)}
            />
          </>
        ) : (
          <p className="text-ink-soft">Loading the messages…</p>
        )}
      </div>
    </GameShell>
  );
}
