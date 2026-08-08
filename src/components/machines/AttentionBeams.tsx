"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AttentionData,
  type AttentionSentence,
  loadAttention,
  matrixOf,
} from "@/lib/attention";

/**
 * One word looking back at the others.
 *
 * The module already had a heat map of all seventy-two heads, which is the
 * right thing to have and the wrong thing to meet first: a grid of grey squares
 * is not an idea, it is a result. This figure is the idea. A single word, a
 * single head, and arcs reaching back to the words it draws from, thick where
 * it takes a lot, thin where it takes little.
 *
 * The beats are ordered so that each one answers the question the last one
 * raises. Why can it only reach backwards? Because of the mask. How much is "a
 * lot"? Because the weights are a share of one. Why is the first token always
 * fat? Because of a known artefact with a name, which is also the moment to say
 * that a heat map is not a mind.
 *
 * The head shown by default is not chosen for looking good. It is the head that
 * sends the largest share of this word's attention somewhere other than the
 * first token or the word immediately before it, computed here, from the real
 * weights, and named on screen so it can be checked.
 */

const BEAT_MS = 2600;
const BEATS = [0, 1, 2, 3, 4] as const;

/** Token box geometry, in SVG units. */
const CH = 8.4;
const PADX = 9;
const GAP = 5;
const BOX_H = 30;
/** Bar height at full weight, and the room its percentage label needs below. */
const BAR_MAX = 44;
const BAR_GAP = 6;
const LABEL_ROOM = 20;

type Pick = { layer: number; head: number; score: number };

/**
 * The head that most strongly connects this word to something that is neither
 * the sentence's first token nor its own immediate neighbour.
 *
 * Both exclusions are mechanical rather than aesthetic. Position zero attracts
 * weight in nearly every head for reasons unrelated to meaning, and the
 * previous token is the trivially available one, a head attending to either
 * tells you nothing about whether attention resolves anything.
 */
function pickHead(sentence: AttentionSentence, query: number): Pick {
  let best: Pick = { layer: 0, head: 0, score: -1 };
  for (let l = 0; l < sentence.attention.length; l++) {
    for (let h = 0; h < sentence.attention[l].length; h++) {
      const row = matrixOf(sentence, l, h)[query];
      for (let t = 1; t < query - 1; t++) {
        if (row[t] > best.score) best = { layer: l, head: h, score: row[t] };
      }
    }
  }
  return best;
}

export function AttentionBeams({ driven }: { driven?: number }) {
  const still = useReducedMotion();
  const [data, setData] = useState<AttentionData | null>(null);
  const [pick, setPick] = useState(0);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    let alive = true;
    loadAttention()
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!playing || driven !== undefined) return;
    const id = setTimeout(
      () => setAt((n) => (n + 1 < BEATS.length ? n + 1 : n)),
      still ? 600 : BEAT_MS,
    );
    return () => clearTimeout(id);
  }, [playing, at, still, driven]);

  const choose = useCallback((n: number) => {
    setPick(n);
    setAt(0);
    setPlaying(true);
  }, []);

  // Driven from a walkthrough, the reader advances the beats with the
  // walkthrough's own controls and the machine keeps its own clock out of it.
  const beat = driven === undefined ? at : Math.min(driven, BEATS.length - 1);

  const sentence = data?.sentences[pick] ?? null;

  /** The word doing the looking. "it" where there is one, else the last word. */
  const query = useMemo(() => {
    if (!sentence) return 0;
    const i = sentence.tokens.findIndex((t) => t.text.trim() === "it");
    return i > 1 ? i : sentence.tokens.length - 1;
  }, [sentence]);

  const head = useMemo(
    () => (sentence ? pickHead(sentence, query) : { layer: 0, head: 0, score: 0 }),
    [sentence, query],
  );
  const weights = useMemo(
    () => (sentence ? matrixOf(sentence, head.layer, head.head)[query] : []),
    [sentence, head, query],
  );

  /**
   * What the first token takes, averaged over every head, for this same word.
   *
   * Needed because the head on show is by construction the one that attends
   * *away* from the sink, so quoting its own first-token share would make the
   * sink look like nothing. The claim is about the population of heads, so the
   * number has to be about the population too.
   */
  const sinkAverage = useMemo(() => {
    if (!sentence) return 0;
    let total = 0;
    let count = 0;
    for (let l = 0; l < sentence.attention.length; l++) {
      for (let h = 0; h < sentence.attention[l].length; h++) {
        total += matrixOf(sentence, l, h)[query][0];
        count += 1;
      }
    }
    return count === 0 ? 0 : total / count;
  }, [sentence, query]);

  /** Where each token box sits. */
  const boxes = useMemo(() => {
    // A plain loop rather than a map with a running cursor: the compiler
    // rejects reassigning a variable captured by the callback, and it is right
    // to, the closure would outlive the render.
    const out: { label: string; x: number; w: number; mid: number }[] = [];
    let cursor = 10;
    for (const token of sentence?.tokens ?? []) {
      const label = token.text.trim() || "␣";
      const w = label.length * CH + PADX * 2;
      out.push({ label, x: cursor, w, mid: cursor + w / 2 });
      cursor += w + GAP;
    }
    return out;
  }, [sentence]);

  /**
   * The frame is sized to its contents rather than fixed.
   *
   * A constant height left a third of the box empty above short arcs and clipped
   * both the tallest arc and the percentage under the heaviest bar on long ones.
   * The tallest arc is the one spanning the most tokens, so that span sets the
   * headroom and everything else follows from it.
   */
  const arcLift = (from: number, to: number) =>
    Math.max(40, Math.abs(from - to) * 0.45);

  const maxLift = boxes.length
    ? Math.max(
        40,
        ...boxes.slice(0, query).map((b) => arcLift(boxes[query].mid, b.mid)),
      )
    : 40;
  const rowY = Math.round(maxLift + 22);
  const W = boxes.length
    ? boxes[boxes.length - 1].x + boxes[boxes.length - 1].w + 10
    : 600;
  const H = rowY + BOX_H + BAR_GAP + BAR_MAX + LABEL_ROOM;

  if (!data || !sentence) {
    return (
      <div className="plate min-h-[22rem] p-5">
        <p className="text-ink-soft text-[0.9375rem]">
          Loading the extracted weights&hellip;
        </p>
      </div>
    );
  }

  const maxWeight = Math.max(...weights.slice(0, query + 1), 0.0001);
  const strongest = weights.indexOf(
    Math.max(...weights.slice(1, query).concat(weights[0] * 0)),
  );
  const sinkShare = weights[0];

  const captions = [
    `${sentence.tokens.length} tokens. Nothing here yet knows what any of them refer to.`,
    `Take the word “${boxes[query].label}”. It is allowed to look at everything before it, and at nothing after it. Ever.`,
    `It looks back at all of them at once, and takes more from some than others. Thickness is how much.`,
    `Those amounts are a share of one. They are computed from this sentence, not looked up in a rule.`,
    `Now look at the first token across all ${data?.model.layers ?? 6} × ${data?.model.heads ?? 12} heads: on average it takes ${(sinkAverage * 100).toFixed(0)}% of this word's attention, for reasons nothing to do with meaning.`,
  ];

  return (
    <figure className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3">
        <span className="label">One word, looking back</span>
        <span className="label text-ink-faint">
          layer {head.layer + 1} · head {head.head + 1} · beat {beat + 1} of{" "}
          {BEATS.length}
        </span>
      </div>

      <div className="border-ink/20 flex flex-wrap gap-1.5 border-b px-4 py-3">
        {data.sentences.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => choose(i)}
            className={`rounded-[2px] border px-2.5 py-1 text-left text-[0.8125rem] ${
              i === pick
                ? "border-ink bg-paper-raised font-bold"
                : "border-ink/25 text-ink-soft hover:border-ink"
            }`}
          >
            {s.text.length > 34 ? s.text.slice(0, 32) + "…" : s.text}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-5">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full min-w-[34rem]"
            role="img"
            aria-label={`Attention from the word ${boxes[query].label} to the words before it`}
          >
            {/* The arcs. One per earlier token, thickness proportional to the
                real weight. Drawn above the row so the sentence stays readable. */}
            {boxes.map((b, i) => {
              if (i >= query) return null;
              const w = weights[i];
              const from = boxes[query].mid;
              const lift = arcLift(from, b.mid);
              /* The control point is twice the height the curve reaches: a
                 quadratic Bézier peaks halfway to its control. Reserving
                 headroom for the control point rather than the apex left a
                 third of the frame empty. */
              const d = `M ${from} ${rowY - 4} Q ${(from + b.mid) / 2} ${
                rowY - 4 - lift * 2
              } ${b.mid} ${rowY - 4}`;
              const share = w / maxWeight;
              return (
                <motion.path
                  key={i}
                  d={d}
                  fill="none"
                  className={i === 0 ? "stroke-yellow" : "stroke-pink"}
                  strokeWidth={1 + share * 13}
                  strokeLinecap="round"
                  opacity={0.28 + share * 0.6}
                  initial={false}
                  animate={{
                    pathLength: beat >= 2 ? 1 : 0,
                    opacity: beat >= 2 ? 0.28 + share * 0.6 : 0,
                  }}
                  transition={{
                    duration: still ? 0 : 0.7,
                    delay: still ? 0 : (query - i) * 0.05,
                    ease: "easeOut",
                  }}
                />
              );
            })}

            {/* The sentence. */}
            {boxes.map((b, i) => {
              const isQuery = i === query;
              const masked = i > query;
              return (
                <motion.g
                  key={i}
                  initial={false}
                  animate={{ opacity: masked && beat >= 1 ? 0.22 : 1 }}
                  transition={{ duration: still ? 0 : 0.4 }}
                >
                  <rect
                    x={b.x}
                    y={rowY}
                    width={b.w}
                    height={BOX_H}
                    rx={2}
                    className={
                      isQuery
                        ? "fill-pink-wash stroke-pink"
                        : "fill-paper-sunk stroke-ink/30"
                    }
                    strokeWidth={isQuery ? 2 : 1}
                  />
                  <text
                    x={b.mid}
                    y={rowY + 20}
                    textAnchor="middle"
                    className={`font-data text-[14px] ${
                      isQuery ? "fill-pink-text font-bold" : "fill-ink"
                    }`}
                  >
                    {b.label}
                  </text>

                  {/* The weight bars, once the shares are the point. */}
                  <motion.rect
                    x={b.x}
                    width={b.w}
                    rx={1}
                    className={i === 0 ? "fill-yellow" : "fill-pink"}
                    initial={false}
                    animate={{
                      height:
                        beat >= 3 && i < query
                          ? (weights[i] / maxWeight) * BAR_MAX
                          : 0,
                      y: rowY + BOX_H + BAR_GAP,
                      opacity: beat >= 3 && i < query ? 1 : 0,
                    }}
                    transition={{
                      duration: still ? 0 : 0.5,
                      delay: still ? 0 : i * 0.04,
                    }}
                  />
                  {beat >= 3 && i < query ? (
                    <motion.text
                      x={b.mid}
                      y={
                        rowY +
                        BOX_H +
                        BAR_GAP +
                        (weights[i] / maxWeight) * BAR_MAX +
                        13
                      }
                      textAnchor="middle"
                      className="font-data fill-ink-soft text-[11px]"
                      initial={still ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: still ? 0 : 0.3 + i * 0.04 }}
                    >
                      {(weights[i] * 100).toFixed(0)}%
                    </motion.text>
                  ) : null}
                </motion.g>
              );
            })}

            {/* The mask, said out loud rather than merely implied by dimming. */}
            {beat >= 1 && query < boxes.length - 1 ? (
              /* Anchored to the right edge of the frame rather than to the
                 first masked token, which pushed the label off the canvas on
                 the longer sentences, and below the row, where the arcs are
                 not. */
              <motion.text
                x={W - 10}
                y={H - 4}
                textAnchor="end"
                className="font-data fill-ink-faint text-[12px]"
                initial={still ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                ✕ never visible from here
              </motion.text>
            ) : null}
          </svg>
        </div>

        <p
          className={`border-ink/20 mt-2 min-h-[3.25rem] border-t pt-3 text-[1.0625rem] ${
            driven === undefined ? "" : "hidden"
          }`}
          aria-live="polite"
        >
          {captions[beat]}
        </p>

        <div className="border-ink/20 bg-paper-sunk mt-3 rounded-[2px] border p-4">
          {beat >= 4 ? (
            <p className="text-ink-soft text-[0.9375rem]">
              That is an <strong>attention sink</strong>. A large share of
              nearly every head landing on the first token regardless of what the
              sentence says. The head drawn above is the exception, and
              deliberately so: it was chosen for attending elsewhere, and takes
              only {(sinkShare * 100).toFixed(0)}% itself. The{" "}
              {(sinkAverage * 100).toFixed(0)}% is the average across all of
              them. It is documented and named (Xiao et al., 2023), and
              it is the cheapest reminder available that a heat map is not a
              mind: a head with nothing it needs this time still has to put its
              weights somewhere, because the row is forced to add up to one.
            </p>
          ) : (
            <p className="text-ink-soft text-[0.9375rem]">
              Shown is layer {head.layer + 1}, head {head.head + 1}, out of{" "}
              {data.model.layers * data.model.heads}, this is the one
              that sends the most of &ldquo;{boxes[query].label}&rdquo;&rsquo;s
              attention somewhere other than the first token or the word right
              before it. Its strongest such target here is{" "}
              <span className="font-data">{boxes[strongest]?.label}</span> at{" "}
              {(weights[strongest] * 100).toFixed(0)}%. The other{" "}
              {data.model.layers * data.model.heads - 1} disagree, and
              you can go through all of them further down.
            </p>
          )}
        </div>

        <div className="border-ink/20 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-ink-faint text-[0.8125rem]">
            {data.model.name}, real weights from a verified forward pass.
          </p>
          <span
            className={`flex shrink-0 gap-2 ${driven === undefined ? "" : "hidden"}`}
          >
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={beat >= BEATS.length - 1}
              className="plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setAt((n) => Math.min(BEATS.length - 1, n + 1));
              }}
              disabled={beat >= BEATS.length - 1}
              className="plate hover:border-ink px-3 py-1.5 text-[0.875rem] disabled:opacity-40"
            >
              Next beat
            </button>
            <button
              type="button"
              onClick={() => {
                setAt(0);
                setPlaying(true);
              }}
              className="plate hover:border-ink px-3 py-1.5 text-[0.875rem]"
            >
              Replay
            </button>
          </span>
        </div>
      </div>
    </figure>
  );
}
