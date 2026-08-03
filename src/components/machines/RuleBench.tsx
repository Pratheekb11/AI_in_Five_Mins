"use client";

import { useMemo, useState } from "react";
import { SPAM_BENCH } from "@/lib/datasets";
import { scoreRules } from "@/lib/ml";

/**
 * Write a spam filter by hand, then find out what it cost.
 *
 * Every number moves against the real held-out messages — the same ones the
 * learned model was judged on, so the comparison at the bottom is fair rather
 * than flattering. The lesson is not that hand-written rules are useless: they
 * get remarkably close. It is that somebody had to think of each one, and the
 * model thought of better ones by itself.
 */

const { rules, perRule, learned, baseline, bestSubset, testSet, ruleCount, corpus } =
  SPAM_BENCH;

export function RuleBench() {
  const [selected, setSelected] = useState(0);

  const score = useMemo(
    () => scoreRules(testSet, selected, ruleCount),
    [selected],
  );

  const chosen = selected !== 0;
  const totalSpam = score.caught + score.missed;

  function toggle(index: number) {
    setSelected((mask) => mask ^ (1 << index));
  }

  return (
    <div className="space-y-4">
      <div className="plate p-5 md:p-6">
        <p className="label text-ink-faint mb-1">Your filter</p>
        <p className="text-ink-soft mb-5 text-sm">
          Tick the rules you would use. Anything matching{" "}
          <em>any</em> ticked rule gets flagged as spam.
        </p>

        <ul className="grid gap-2 sm:grid-cols-2">
          {rules.map((rule, i) => {
            const on = (selected & (1 << i)) !== 0;
            const stats = perRule[i];
            return (
              <li key={rule.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-[2px] border px-3.5 py-3 transition-colors ${
                    on
                      ? "border-blue bg-blue-wash"
                      : "border-ink/30 bg-paper hover:border-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(i)}
                    className="accent-blue mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-[0.9375rem] font-medium">
                      {rule.label}
                    </span>
                    <span className="data text-ink-faint mt-1 block text-xs">
                      catches {stats.caught} · {stats.falseAlarms} false alarm
                      {stats.falseAlarms === 1 ? "" : "s"}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="plate p-5 md:p-6" aria-live="polite">
        <p className="label text-ink-faint mb-4">
          Scored on {score.total.toLocaleString()} messages it has never seen
        </p>

        {!chosen ? (
          <p className="text-ink-soft py-2">
            No rules ticked, so nothing gets flagged. That still scores{" "}
            <strong className="text-ink font-semibold">
              {(baseline.accuracy * 100).toFixed(1)}% accuracy
            </strong>{" "}
            — because most messages really are ordinary. Accuracy on its own is a
            bad way to judge this.
          </p>
        ) : (
          <>
            <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure
                label="Spam caught"
                value={`${score.caught} / ${totalSpam}`}
                tone="teal"
              />
              <Figure label="Spam missed" value={score.missed} tone="pink" />
              <Figure
                label="Wrongly flagged"
                value={score.falseAlarms}
                tone="pink"
              />
              <Figure
                label="Accuracy"
                value={`${(score.accuracy * 100).toFixed(1)}%`}
              />
            </dl>

            <Comparison
              rows={[
                {
                  name: "Your rules",
                  value: score.accuracy,
                  ink: "var(--yellow)",
                },
                {
                  name: "Flag nothing",
                  value: baseline.accuracy,
                  ink: "var(--ink-faint)",
                },
                {
                  name: "Best possible rule set",
                  value: bestSubset.accuracy,
                  ink: "var(--blue)",
                },
                {
                  name: "Learned from examples",
                  value: learned.accuracy,
                  ink: "var(--teal)",
                },
              ]}
            />

            <p className="border-ink/20 text-ink-soft mt-5 border-t pt-4 text-sm">
              The best any combination of these eight rules can manage is{" "}
              <strong className="text-ink font-semibold">
                {(bestSubset.accuracy * 100).toFixed(1)}%
              </strong>
              . A naive Bayes classifier, given{" "}
              {learned.trainSize.toLocaleString()} labelled messages and no rules
              at all, reaches{" "}
              <strong className="text-ink font-semibold">
                {(learned.accuracy * 100).toFixed(1)}%
              </strong>
              . Nobody told it to look for shortcodes.
            </p>
          </>
        )}
      </div>

      <p className="data text-ink-faint text-xs">
        {corpus.name} · {corpus.total.toLocaleString()} messages,{" "}
        {corpus.spam} of them spam
      </p>
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "teal" | "pink";
}) {
  const colour =
    tone === "teal"
      ? "text-teal-text"
      : tone === "pink"
        ? "text-pink-text"
        : "text-ink";
  return (
    <div>
      <dt className="label text-ink-faint mb-1.5">{label}</dt>
      <dd className={`data text-xl font-semibold ${colour}`}>{value}</dd>
    </div>
  );
}

/**
 * Four accuracies on one scale. A shared axis is the whole point — the numbers
 * are close together, and bars make "close" visible in a way percentages don't.
 * The axis starts at the flag-nothing baseline rather than zero, because the
 * range below it is not reachable and would flatten every difference.
 */
function Comparison({
  rows,
}: {
  rows: { name: string; value: number; ink: string }[];
}) {
  const floor = 0.84;
  const span = 1 - floor;

  return (
    <div className="space-y-1.5">
      {rows.map((row) => (
        <div
          key={row.name}
          className="grid grid-cols-[9.5rem_minmax(0,1fr)_3rem] items-center gap-3"
        >
          <span className="text-ink-soft truncate text-xs">{row.name}</span>
          <span className="bg-paper-sunk relative block h-3.5 w-full">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px]"
              style={{
                width: `${Math.max(0, (row.value - floor) / span) * 100}%`,
                background: row.ink,
              }}
            />
          </span>
          <span className="data text-right text-xs font-semibold tabular-nums">
            {(row.value * 100).toFixed(1)}
          </span>
        </div>
      ))}
      <p className="text-ink-faint pt-1 text-[0.6875rem]">
        Scale starts at {(floor * 100).toFixed(0)}%.
      </p>
    </div>
  );
}
