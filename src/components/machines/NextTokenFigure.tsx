"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import {
  atTemperature,
  loadLogits,
  type LogitData,
  type LogitPrompt,
} from "@/lib/logits";

/**
 * The whole operation, as one figure that never resets.
 */

/** Which prompt each stage is making its point with. */
const STAGE_PROMPT: Record<number, string> = {
  0: "memorised",
  1: "memorised",
  2: "open",
  3: "fact",
  4: "open",
};

/** How many candidates to draw. Twelve rows is a wall; eight reads. */
const ROWS = 8;

function promptFor(data: LogitData, stage: number): LogitPrompt {
  const wanted = STAGE_PROMPT[Math.min(stage, 4)] ?? "memorised";
  return (
    data.prompts.find((p) => p.id === wanted) ??
    data.prompts.find((p) => p.text.startsWith("Paris")) ??
    data.prompts[0]
  );
}

/** The candidate the fact-checking stage is really asking about. */
const TRUE_ANSWER: Record<string, string> = {
  fact: " France",
};

export function NextTokenFigure() {
  const stage = useWalkthroughStep();
  const still = useReducedMotion();
  const [data, setData] = useState<LogitData | null>(null);
  const [failed, setFailed] = useState(false);

  /* Both of these are tagged with the stage they were set on. Reading them back
     only when the stage still matches is how the figure follows the walkthrough
     without an effect reaching in to reset state, which the React Compiler
     forbids and which would fight the learner anyway. */
  const [picked, setPicked] = useState<{ stage: number; id: string } | null>(
    null,
  );
  const [drawn, setDrawn] = useState<{ stage: number; text: string } | null>(
    null,
  );
  const [temperature, setTemperature] = useState(1);

  useEffect(() => {
    let alive = true;
    loadLogits()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const choose = useCallback((id: string, at: number) => {
    setPicked({ stage: at, id });
    setDrawn(null);
  }, []);

  /* Declared up here, above the early returns, so the hook order never changes
     and so the roll happens inside a callback. The React Compiler treats a
     bare function in the component body as render code and rejects Math.random
     there, which is correct: a draw is an event, not a render. */
  const draw = useCallback(
    (options: { text: string; weight: number }[], at: number) => {
      const total = options.reduce((sum, o) => sum + o.weight, 0);
      let roll = Math.random() * total;
      for (const option of options) {
        roll -= option.weight;
        if (roll <= 0) {
          setDrawn({ stage: at, text: option.text });
          return;
        }
      }
      setDrawn({ stage: at, text: options[0].text });
    },
    [],
  );

  if (failed) {
    return (
      <div className="plate-flush p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          The recorded probabilities did not load, so there is nothing to show
          here. The rest of the chapter still works.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="plate-flush min-h-[18rem] p-4">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the measured probabilities…
        </p>
      </div>
    );
  }

  const override =
    picked && picked.stage === stage
      ? data.prompts.find((p) => p.id === picked.id)
      : undefined;
  const prompt = override ?? promptFor(data, stage);

  const showBars = stage >= 1;
  const showDial = stage >= 4;
  const marksTruth = stage >= 3 && Boolean(TRUE_ANSWER[prompt.id]);

  /* The dial must not silently change what a percentage means. `atTemperature`
     renormalises over the kept candidates, so at temperature 1 it would report
     20.6% where the previous step reported the recorded 7.0% for the very same
     sentence, and the figure would look like it had rounded differently for no
     reason. Rescaling by the mass those candidates actually hold puts the dial
     back into whole-vocabulary units: at temperature 1 it reproduces the
     recorded probabilities exactly, and elsewhere it holds the unseen tail
     fixed while re-weighting what is on screen. */
  const kept = prompt.candidates.reduce((sum, c) => sum + c.probability, 0);
  const weights = showDial
    ? atTemperature(prompt, temperature).map((w) => w * kept)
    : prompt.candidates.map((c) => c.probability);

  const rows = prompt.candidates.slice(0, ROWS).map((candidate, i) => ({
    candidate,
    weight: weights[i] ?? 0,
  }));
  const widest = Math.max(...rows.map((r) => r.weight), 0.0001);

  const filled = drawn && drawn.stage === stage ? drawn.text : null;

  return (
    <figure className="plate-flush overflow-hidden">
      {/* ------------------------------------------------ the sentence --- */}
      <div className="border-ink/20 border-b px-4 py-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="label text-ink-faint">
            {stage === 0
              ? "What goes in, cut into tokens"
              : "The text so far, as the model receives it"}
          </p>
          <p className="data text-ink-faint text-xs">
            {prompt.vocabSize.toLocaleString("en-US")} possible next tokens
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {prompt.tokens.map((token, i) => (
            <motion.span
              key={`${prompt.id}-${i}`}
              layout={!still}
              initial={still ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: still ? 0 : Math.min(i, 10) * 0.035,
              }}
              className="bg-blue-wash text-blue-text border-blue/40 font-data rounded-[2px] border px-2 py-1 text-[0.9375rem] whitespace-pre"
            >
              {token.text}
            </motion.span>
          ))}

          {/* The slot. It is the question the whole figure is about, so it is
              yellow, which on this site always means the bit that is yours. */}
          <motion.span
            layout={!still}
            className={`font-data rounded-[2px] border px-3 py-1 text-[0.9375rem] ${
              filled
                ? "bg-teal-wash text-teal-text border-teal font-bold"
                : "bg-yellow-wash text-yellow-text border-yellow border-dashed"
            }`}
          >
            {filled ? (
              <motion.span layoutId="llai-drawn-token">{filled}</motion.span>
            ) : (
              <motion.span
                animate={still ? undefined : { opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                ?
              </motion.span>
            )}
          </motion.span>
        </div>
      </div>

      {/* --------------------------------------------- pick a sentence --- */}
      <div className="border-ink/20 flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <span className="label text-ink-faint">Try another sentence</span>
        {data.prompts.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => choose(option.id, stage)}
            className={`tap font-data rounded-[2px] border px-2 py-1 text-xs transition-colors ${
              option.id === prompt.id
                ? "border-ink bg-paper-sunk"
                : "border-ink/25 hover:border-ink"
            }`}
          >
            {option.text.length > 26
              ? `${option.text.slice(0, 24)}…`
              : option.text}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------- the bars --- */}
      <div className="px-4 py-4">
        <AnimatePresence initial={false}>
          {showBars ? (
            <motion.div
              key="bars"
              initial={still ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={still ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="label text-ink-faint">
                  Its score for each one, as a probability
                </p>
                <p className="data text-ink-faint text-xs">
                  top {ROWS} of {prompt.vocabSize.toLocaleString("en-US")} ·{" "}
                  {prompt.entropyBits.toFixed(2)} bits of uncertainty
                </p>
              </div>

              <ul className="space-y-1.5">
                {rows.map(({ candidate, weight }) => {
                  const isTruth =
                    marksTruth && candidate.text === TRUE_ANSWER[prompt.id];
                  const isDrawn = filled === candidate.text;

                  return (
                    <li
                      key={`${prompt.id}-${candidate.id}`}
                      className="flex items-center gap-3"
                    >
                      <span
                        className={`font-data w-24 shrink-0 truncate text-sm ${
                          isTruth
                            ? "text-teal-text font-bold"
                            : isDrawn
                              ? "text-teal-text font-bold"
                              : "text-ink-soft"
                        }`}
                      >
                        {candidate.text.trim() || "␣"}
                      </span>

                      <span className="bg-paper-sunk border-ink/20 h-3.5 flex-1 overflow-hidden rounded-[1px] border">
                        <motion.span
                          className={`block h-full ${
                            isTruth ? "bg-teal" : "bg-pink"
                          }`}
                          initial={false}
                          animate={{ width: `${(weight / widest) * 100}%` }}
                          transition={{
                            duration: still ? 0 : 0.55,
                            ease: "easeOut",
                          }}
                        />
                      </span>

                      <span className="data text-ink-soft w-16 shrink-0 text-right text-xs tabular-nums">
                        {(weight * 100).toFixed(weight < 0.01 ? 2 : 1)}%
                      </span>

                      {isTruth ? (
                        <span className="label text-teal-text shrink-0">
                          true
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {marksTruth ? (
                <p className="prose-measure text-ink-soft mt-3 text-[0.875rem]">
                  The true answer is in there. It is just not the one the
                  sentence was pulling towards.
                </p>
              ) : null}
            </motion.div>
          ) : (
            <motion.p
              key="waiting"
              className="text-ink-soft text-[0.9375rem]"
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Next it scores every token it knows, and picks one. Keep going and
              those scores arrive here.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------- the dial --- */}
      <AnimatePresence initial={false}>
        {showDial ? (
          <motion.div
            key="dial"
            initial={still ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={still ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="border-ink/20 border-t px-4 py-4"
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex flex-1 basis-56 items-center gap-3">
                <span className="label text-ink-faint shrink-0">
                  Temperature
                </span>
                <input
                  type="range"
                  min={0.2}
                  max={1.5}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="accent-pink flex-1"
                  aria-label="Temperature"
                />
                <span className="data w-8 shrink-0 text-sm tabular-nums">
                  {temperature.toFixed(1)}
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  draw(
                    rows.map((r) => ({
                      text: r.candidate.text,
                      weight: r.weight,
                    })),
                    stage,
                  )
                }
                className="plate misreg btn-primary font-display px-4 py-2 font-bold"
              >
                Draw a token
              </button>

              {filled ? (
                <span className="label text-teal-text">
                  drawn, and added to the sentence
                </span>
              ) : null}
            </div>

            <p className="prose-measure text-ink-faint mt-3 text-[0.8125rem]">
              Cold stretches the odds towards the favourite. Hot flattens them
              into the tail. The dial re-weights the model&rsquo;s own recorded
              scores and never invents one. At 1.0 these are exactly the
              probabilities it produced. The rest of the vocabulary is held
              where it was.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <figcaption className="border-ink/20 text-ink-faint border-t px-4 py-2.5 text-[0.8125rem]">
        {data.model.name}, measured. {prompt.why}
      </figcaption>
    </figure>
  );
}
