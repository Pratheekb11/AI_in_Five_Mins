"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * The landing page's hook: the site's whole argument, running by itself.
 *
 * What stood here before was a four-button quiz, which asked a stranger to
 * commit to an answer before they had been given any reason to care. The claim
 * this site makes does not need their click to be shown. It needs one sentence,
 * one word, and one number.
 *
 * So this plays. A real question goes in, the model's own likeliest next word
 * lands in the blank, and then the true answer turns up somewhere down the
 * rankings: 811th for photosynthesis, 426th for gravity. Same model, same
 * question, with the source in front of it: first choice, 98.6%. That is the
 * distance between sounding right and being right, and it is a distance you can
 * watch rather than be told about.
 *
 * Every number is read straight out of `provenance.json`, the same measurement
 * chapter six is built on. Nothing here is staged and nothing is rounded in the
 * model's favour.
 *
 * ONE OBJECT THAT MORPHS, not a slideshow. The blank in the sentence is the
 * same element throughout: it holds a question mark, then the model's guess,
 * then the answer. The rank marker is one marker sliding on one track. Because
 * they persist, the only thing there is to notice is what moved.
 */

type Measured = {
  probability: number;
  rank: number;
  topText: string;
};

type Round = {
  id: string;
  kind: "memory" | "lookup" | "tool";
  ask: string;
  question: string;
  answerLabel: string;
  bare: Measured;
  sourced: Measured;
};

type ProvenanceData = {
  model: { name: string; url: string };
  rounds: Round[];
};

/** ask, guess, rank, source. How long each holds, in milliseconds. */
const BEATS = [1500, 2300, 2900, 3400] as const;

/** The rank track runs 1st to 1000th on a log scale. Everything measured
 *  fits inside it, and the decade ticks are what make 811th legible as a
 *  distance rather than as a big number. */
const DECADES = [1, 10, 100, 1000];

let cached: Promise<ProvenanceData> | null = null;

function loadProvenance(): Promise<ProvenanceData> {
  if (!cached) {
    cached = fetch("/data/provenance.json").then((r) => {
      if (!r.ok) throw new Error(`provenance: ${r.status}`);
      return r.json() as Promise<ProvenanceData>;
    });
  }
  return cached;
}

/** Where a rank sits along the track, 0 to 1. Rank is zero-based here. */
function trackPosition(rank: number): number {
  return Math.min(1, Math.log10(rank + 1) / 3);
}

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** A probability, at a precision that never prints a misleading zero. */
function percent(p: number): string {
  const value = p * 100;
  if (value >= 10) return `${value.toFixed(1)}%`;
  if (value >= 1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(3)}%`;
}

/**
 * The reel, dealt fresh on every visit.
 *
 * Three questions the model misses and one it genuinely knows, in that order,
 * because a page that only ever showed it failing would be making the opposite
 * mistake to the one it is complaining about. Which bucket a question is in was
 * decided by the measurement, not chosen.
 */
function deal(rounds: Round[]): Round[] {
  /* Fisher-Yates rather than a random sort comparator: the comparator
     version is not a uniform shuffle, and a reel that quietly favours the
     same three questions is not the "deals fresh" it claims to be. */
  const pick = <T,>(pool: T[], n: number) => {
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  };

  const misses = rounds.filter((r) => r.bare.rank >= 8);
  const knows = rounds.filter((r) => r.bare.rank === 0);
  const reel = pick(misses, 3);
  const known = pick(knows, 1);
  // The one it knows goes second: late enough that the surprise has landed,
  // early enough that nobody leaves thinking the machine is useless.
  return [reel[0], ...known, ...reel.slice(1)].filter(Boolean);
}

export function HeroReel() {
  const still = useReducedMotion();
  const [data, setData] = useState<ProvenanceData | null>(null);
  const [reel, setReel] = useState<Round[]>([]);
  const [at, setAt] = useState(0);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    let alive = true;
    loadProvenance()
      .then((d) => {
        if (!alive) return;
        setData(d);
        // Math.random lives here rather than in the render body: rendering has
        // to be pure, and the compiler enforces it.
        setReel(deal(d.rounds));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reel.length === 0) return;
    const id = setTimeout(() => {
      if (beat + 1 < BEATS.length) {
        setBeat(beat + 1);
      } else {
        setBeat(0);
        setAt((n) => (n + 1) % reel.length);
      }
    }, BEATS[beat]);
    return () => clearTimeout(id);
  }, [beat, reel.length]);

  const round = reel[at];

  if (!round || !data) {
    return (
      <div className="plate min-h-[19rem] p-5 md:p-6">
        <p className="label text-ink-faint mb-3">Reading a real model</p>
        <p className="text-ink-soft text-[0.9375rem]">
          Measuring what it says next…
        </p>
      </div>
    );
  }

  /** True where the model's own first choice already is the right answer. */
  const knew = round.bare.rank === 0;
  const guess = round.bare.topText.trim() || "␣";
  const answer = round.answerLabel;

  /* What sits in the blank right now. One element, three contents. */
  const inBlank =
    beat === 0 ? "?" : beat === 1 || (beat === 2 && !knew) ? guess : answer;
  const blankInk =
    beat === 0
      ? "bg-yellow-wash text-yellow-text"
      : beat === 3 || knew
        ? "bg-teal-wash text-teal-text"
        : "bg-pink-wash text-pink-text";

  /* Where the marker is, and how confident the model is, at this beat. */
  const shownRank = beat >= 3 ? round.sourced.rank : knew ? 0 : round.bare.rank;
  const shownProbability =
    beat >= 3 ? round.sourced.probability : round.bare.probability;
  const settled = beat >= 3 || knew;

  return (
    <div className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-3">
        <span className="label">What it says next, measured</span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {reel.map((r, i) => (
            <span
              key={r.id}
              className={`h-1.5 w-4 rounded-[1px] ${
                i === at ? "bg-ink" : "bg-ink/20"
              }`}
            />
          ))}
        </span>
      </div>

      <div className="p-5 md:p-6">
        {/* The sentence, with the blank that everything else is about. */}
        <p className="prose-measure mb-1 min-h-[4.5rem] text-[1.0625rem] leading-relaxed sm:text-[1.125rem]">
          <span className="text-ink-soft">{round.question} </span>
          <span className="relative inline-block align-baseline">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${round.id}-${inBlank}`}
                initial={still ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={still ? undefined : { opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={`font-data inline-block rounded-[2px] px-2 py-0.5 font-bold ${blankInk}`}
              >
                {inBlank}
              </motion.span>
            </AnimatePresence>
          </span>
        </p>

        {/* The rank track. One marker, one track, the whole way through. */}
        <div className="mt-5 mb-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="label text-ink-faint">
              Where the right answer ranked
            </span>
            <span
              className={`data text-lg font-bold tabular-nums ${
                settled ? "text-teal-text" : "text-pink-text"
              }`}
            >
              {beat === 0 ? "—" : ordinal(shownRank + 1)}
            </span>
          </div>

          <div className="border-ink/25 bg-paper-sunk relative h-9 rounded-[2px] border">
            {DECADES.map((d) => (
              <span
                key={d}
                className="border-ink/20 absolute top-0 bottom-0 border-l"
                style={{ left: `${trackPosition(d - 1) * 100}%` }}
              >
                <span className="data text-ink-faint absolute top-full left-1 pt-1 text-[0.6875rem] whitespace-nowrap">
                  {ordinal(d)}
                </span>
              </span>
            ))}

            <motion.span
              className={`absolute top-1 bottom-1 w-1.5 rounded-[1px] ${
                settled ? "bg-teal" : "bg-pink"
              }`}
              initial={false}
              animate={{
                left: `${trackPosition(beat === 0 ? 0 : shownRank) * 100}%`,
              }}
              transition={
                still
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 90, damping: 18 }
              }
              style={{ opacity: beat === 0 ? 0.25 : 1 }}
            />
          </div>
          <div className="h-4" />
        </div>

        {/* How sure it was. Near-empty then full is the whole story, so the
            bar keeps its true width rather than being made visible. */}
        <div className="mb-4 flex items-center gap-3">
          <span className="label text-ink-faint w-24 shrink-0">
            Its confidence
          </span>
          <span className="bg-paper-sunk border-ink/20 h-3.5 flex-1 overflow-hidden rounded-[1px] border">
            <motion.span
              className={`block h-full ${settled ? "bg-teal" : "bg-pink"}`}
              initial={false}
              animate={{
                width: beat === 0 ? "0%" : `${shownProbability * 100}%`,
              }}
              transition={{ duration: still ? 0 : 0.55, ease: "easeOut" }}
            />
          </span>
          <span className="data text-ink-soft w-20 shrink-0 text-right text-xs tabular-nums">
            {beat === 0 ? "—" : percent(shownProbability)}
          </span>
        </div>

        {/* The line that says what just happened. */}
        <p
          className="prose-measure text-ink-soft min-h-[4.25rem] text-[0.9375rem]"
          aria-live="polite"
        >
          {beat === 0 ? (
            <>Ask it something with a checkable answer.</>
          ) : beat === 1 ? (
            <>
              Its likeliest next word is{" "}
              <span className="font-data font-semibold">{guess}</span>, at{" "}
              {percent(round.bare.probability)}. It is not answering the
              question. It is continuing the sentence.
            </>
          ) : beat === 2 ? (
            knew ? (
              <>
                This one it has. <strong>{answer}</strong> is its own first
                choice, at {percent(round.bare.probability)}, with no help at
                all.
              </>
            ) : (
              <>
                The true answer, <strong>{answer}</strong>, was its{" "}
                {ordinal(round.bare.rank + 1)} choice.
              </>
            )
          ) : (
            <>
              Put the source in front of it and the same model answers{" "}
              <strong>{answer}</strong> at {percent(round.sourced.probability)}.
              Nothing about the model changed. What it was given did.
            </>
          )}
        </p>
      </div>

      <p className="border-ink/20 text-ink-faint border-t px-4 py-3 text-[0.8125rem]">
        {data.model.name}, read directly. Which questions it knows and which it
        misses was decided by the measurement, not picked to make a point.
      </p>
    </div>
  );
}
