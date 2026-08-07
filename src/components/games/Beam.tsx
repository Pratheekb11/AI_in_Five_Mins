"use client";

import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/game/GameShell";
import {
  type AttentionData,
  type BeamRound,
  buildRounds,
  loadAttention,
  shuffled,
} from "@/lib/attention";

/**
 * Beam, where does this word look?
 *
 * A sentence, one word lit up, and a single attention head. Say which earlier
 * word that head sends most of its beam to, then watch the real row of weights
 * come up as bars.
 *
 * Two things make this worth playing rather than reading. The heads disagree
 * with each other constantly, so you cannot learn one rule and coast. And the
 * first token takes an enormous share of almost every row for no meaning-
 * related reason at all, a documented artefact called an attention sink,
 * which is why the question sets it aside and then tells you about it.
 */

const ROUNDS = 8;

type Phase = "ready" | "playing" | "over";

export function Beam() {
  const [data, setData] = useState<AttentionData | null>(null);
  const [failed, setFailed] = useState(false);
  const [rounds, setRounds] = useState<BeamRound[]>([]);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");

  useEffect(() => {
    let alive = true;
    loadAttention()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(() => {
    if (!data) return;
    setRounds(shuffled(buildRounds(data)).slice(0, ROUNDS));
    setAt(0);
    setPicked(null);
    setScore(0);
    setRight(0);
    setStreak(0);
    setBestStreak(0);
    setPhase("playing");
  }, [data]);

  const round = rounds[at];
  const revealed = picked !== null;

  function pick(index: number) {
    if (revealed || !round) return;
    setPicked(index);
    const ok = index === round.answer;
    if (ok) {
      const gained = 100 + Math.round(round.answerWeight * 100) + streak * 15;
      setScore((s) => s + gained);
      setRight((r) => r + 1);
      setStreak((s) => s + 1);
      setBestStreak((b) => Math.max(b, streak + 1));
    } else {
      setStreak(0);
    }
  }

  function next() {
    if (at + 1 >= rounds.length) {
      setPhase("over");
      return;
    }
    setAt((n) => n + 1);
    setPicked(null);
  }

  return (
    <GameShell
      gameId="beam"
      name="Beam"
      instruction="One word is lit up, and one attention head is switched on. Say which earlier word that head sends most of its attention to. The first word of the sentence is set aside. It soaks up a huge share of nearly every head, for reasons that have nothing to do with meaning, and you will see why below."
      howToPlay={{
        goal: "Say which earlier word this attention head is looking at.",
        steps: [
          "One word in the sentence is lit up, and one of the model's 72 attention heads is switched on.",
          "Click the earlier word you think that head sends most of its attention to.",
          "The real row of weights comes up as bars. The first word is set aside, because it soaks up attention for reasons unrelated to meaning.",
        ],
        controls: "Click a word.",
        scoring: "100 plus the weight that actually went there, plus a streak bonus.",
      }}
      startLabel={data ? "Fire the beam" : "Loading the weights…"}
      phase={phase}
      onStart={start}
      finalScore={score}
      mood={
        !revealed
          ? "think"
          : picked === round?.answer
            ? streak >= 3
              ? "celebrate"
              : "cheer"
            : "wince"
      }
      readouts={[
        { label: "Score", value: score, accent: true },
        { label: "Streak", value: `×${streak}` },
        {
          label: "Round",
          value: `${Math.min(at + 1, Math.max(rounds.length, 1))}/${rounds.length || ROUNDS}`,
        },
      ]}
      again={
        <div className="max-w-md">
          <p className="display-md mb-2">
            {right} of {rounds.length} right
          </p>
          <p className="text-ink-soft mb-1 text-[0.9375rem]">
            Best run of correct calls: {bestStreak}.
          </p>
          <p className="text-ink-soft text-[0.9375rem]">
            Hard, because there is no single rule to learn. Each head has ended
            up doing its own job. Some track the word before, some hunt
            for a matching noun, some do something nobody has a name for. All
            {" "}
            {data ? data.model.layers * data.model.heads : 72} of them run at
            once, and the model adds up what they all found.
          </p>
        </div>
      }
      footer={
        data ? (
          <>
            Real weights from {data.model.name}: {data.model.layers} layers ×{" "}
            {data.model.heads} heads. Extracted by running the published
            parameters forward and checking the result against the reference
            implementation to {data.verification.tolerance} per logit.
          </>
        ) : failed ? (
          <>The attention weights did not load.</>
        ) : (
          <>Loading the attention weights…</>
        )
      }
    >
      <div className="min-h-[19rem] p-5 md:p-6">
        {round ? (
          <>
            <p className="label text-ink-faint mb-3">
              Layer {round.layer + 1}, head {round.head + 1}. Where does
              the lit word look?
            </p>

            <p className="mb-5 flex flex-wrap gap-1.5">
              {round.sentence.tokens.map((token, i) => {
                const isQuery = i === round.query;
                const isAnswer = revealed && i === round.answer;
                const isPicked = revealed && i === picked;
                const selectable = !revealed && i > 0 && i < round.query;

                let tone = "border-ink/20 bg-paper-sunk text-ink-faint";
                if (isQuery) tone = "border-pink bg-pink-wash text-pink-text";
                else if (isAnswer) tone = "border-teal bg-teal-wash text-teal-text";
                else if (isPicked) tone = "border-pink bg-pink-wash text-pink-text";
                else if (selectable)
                  tone = "border-ink/40 bg-paper hover:border-ink text-ink";

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!selectable}
                    onClick={() => pick(i)}
                    className={`font-data rounded-[2px] border px-2.5 py-2 text-[0.9375rem] transition-colors ${tone} ${
                      selectable ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {token.text.trim() || "␣"}
                  </button>
                );
              })}
            </p>

            {revealed ? (
              <div aria-live="polite">
                <p
                  className={`mb-3 text-[0.9375rem] font-semibold ${
                    picked === round.answer ? "text-teal-text" : "text-pink-text"
                  }`}
                >
                  {picked === round.answer
                    ? `Right. ${(round.answerWeight * 100).toFixed(0)}% of this head's beam went there.`
                    : `Not quite. It went to “${round.sentence.tokens[round.answer].text.trim()}” at ${(round.answerWeight * 100).toFixed(0)}%, against ${((picked !== null ? round.weights[picked] : 0) * 100).toFixed(0)}% for your pick.`}
                </p>

                <ul className="mb-4 space-y-1.5">
                  {round.sentence.tokens.slice(0, round.query + 1).map((token, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="font-data w-24 shrink-0 truncate text-sm">
                        {token.text.trim() || "␣"}
                      </span>
                      <span
                        className={`h-3 rounded-[1px] ${
                          i === 0
                            ? "bg-yellow"
                            : i === round.answer
                              ? "bg-teal"
                              : "bg-blue"
                        }`}
                        style={{ width: `${round.weights[i] * 70}%` }}
                        aria-hidden="true"
                      />
                      <span className="data text-ink-soft text-xs tabular-nums">
                        {(round.weights[i] * 100).toFixed(0)}%
                      </span>
                      {i === 0 ? (
                        <span className="label text-yellow-text">sink</span>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={next}
                  className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                >
                  {at + 1 >= rounds.length ? "See the result" : "Next head"}
                </button>
              </div>
            ) : (
              <p className="text-ink-soft text-[0.9375rem]">
                The lit word can only look backwards. Nothing in a
                language model is allowed to see its own future.
              </p>
            )}
          </>
        ) : (
          <p className="text-ink-soft text-[0.9375rem]">
            {failed
              ? "The attention weights did not load, so there is nothing to fire at."
              : "Loading the attention weights…"}
          </p>
        )}
      </div>
    </GameShell>
  );
}
