"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  advance,
  asText,
  back,
  type BucketId,
  BUCKETS,
  current,
  EVIDENCE,
  mapOf,
  newScene,
  place,
  type SortScene,
  type SortTask,
  start as startSort,
} from "@/lib/game/sort";
import { useOwnTasks } from "@/lib/game/useOwnTasks";
import { Nimo } from "@/components/nimo/Nimo";

/**
 * The Bucket Sort.
 */

export function BucketSort() {
  const { tasks: own, add, remove } = useOwnTasks();
  const [scene, setScene] = useState<SortScene>(newScene);
  const [started, setStarted] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const begin = useCallback(() => {
    const mine: SortTask[] = own.map((t) => ({
      text: t.text,
      exposure: t.exposure,
      evidence: ["context", "reads-fluent"],
      mine: true,
    }));
    setScene(
      startSort(
        mine,
        Array.from({ length: 40 }, () => Math.random()),
      ),
    );
    setStarted(true);
  }, [own]);

  const task = current(scene);
  const chosen = task ? scene.placed[task.text] : undefined;

  const put = useCallback((bucket: BucketId) => {
    setScene((s) => place(s, bucket));
  }, []);
  const onward = useCallback(() => setScene((s) => advance(s)), []);
  const backward = useCallback(() => setScene((s) => back(s)), []);

  useEffect(() => {
    if (!started || scene.done) return;
    const onKey = (e: KeyboardEvent) => {
      const bucket = BUCKETS.find((b) => b.key === e.key);
      if (bucket) put(bucket.id);
      else if (e.key === "Enter") onward();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, scene.done, put, onward]);

  const copy = useCallback(() => {
    navigator.clipboard
      .writeText(asText(scene))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }, [scene]);

  const map = mapOf(scene);

  return (
    /* Marked as the game section like every cabinet, even though this one is
       not wrapped in GameShell, so the engagement measure can tell whether a
       reader ever reached it. */
    <div className="plate" data-section="game">
      <div className="border-ink/20 flex flex-wrap items-baseline justify-between gap-3 border-b px-5 py-3">
        <h3 className="display-md">The Bucket Sort</h3>
        <p className="label text-ink-faint">
          {started && !scene.done
            ? `${scene.at + 1} / ${scene.deck.length}`
            : "no score, no clock"}
        </p>
      </div>

      {!started ? (
        <div className="p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-start gap-4">
            {/* Nimo takes his height from the prop but his WIDTH from the class,
                so an unclassed one is a block that fills the row — 300px wide,
                which runs off a 320px phone. */}
            <Nimo mood="curious" height={96} className="w-24 shrink-0" />
            <p className="prose-measure text-[1.0625rem]">
              This one does not score you. Which of your tasks you are willing
              to hand over depends on your job and on what happens when it is
              wrong, and I do not know either. What I can do is put the
              measurement next to each choice. Add a few of your own first; the
              generic ones are only there to start you off.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) {
                add(draft.trim(), "inside");
                setDraft("");
              }
            }}
            className="mb-4 flex flex-wrap gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Something you actually did this week"
              maxLength={64}
              className="border-ink/30 bg-paper-sunk focus:border-ink min-w-[16rem] flex-1 rounded-[2px] border px-3 py-2 text-[0.9375rem] outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="tap plate hover:border-ink px-4 py-2 text-[0.9375rem] disabled:opacity-40"
            >
              Add
            </button>
          </form>

          {own.length > 0 ? (
            <ul className="mb-5 flex flex-wrap gap-2">
              {own.map((t) => (
                <li key={t.text}>
                  <button
                    type="button"
                    onClick={() => remove(t.text)}
                    title="Remove"
                    className="plate hover:border-pink px-3 py-1.5 text-[0.875rem]"
                  >
                    {t.text} <span className="text-ink-faint">&times;</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-faint mb-5 text-[0.875rem]">
              Nothing added yet. It works without them, but it is a far duller
              map. Your list stays on this machine and is not sent anywhere.
            </p>
          )}

          <button
            type="button"
            onClick={begin}
            className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
          >
            Start sorting
          </button>
        </div>
      ) : scene.done ? (
        <div className="p-5 md:p-6">
          <h4 className="display-md mb-4">Your map</h4>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            {BUCKETS.map((bucket) => (
              <div key={bucket.id} className="plate-flush px-4 py-3">
                <p className="label text-ink-faint mb-1">{bucket.label}</p>
                <p className="text-ink-soft mb-2 text-[0.8125rem]">
                  {bucket.means}
                </p>
                {map[bucket.id].length > 0 ? (
                  <ul className="space-y-1">
                    {map[bucket.id].map((t) => (
                      <li key={t.text} className="text-[0.875rem]">
                        {t.mine ? (
                          <span className="label text-yellow-text mr-1">
                            yours
                          </span>
                        ) : null}
                        {t.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-faint text-[0.875rem]">
                    Nothing here.
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
            >
              {copied ? "Copied" : "Copy my map"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStarted(false);
                setCopied(false);
                setScene(newScene());
              }}
              className="tap plate hover:border-ink px-4 py-2"
            >
              Sort again
            </button>
          </div>

          <p className="text-ink-faint mt-4 text-[0.8125rem]">
            Nothing here was sent anywhere. The sorting is yours; the findings
            it was put beside are measured elsewhere on this site.
          </p>
        </div>
      ) : task ? (
        <div className="p-5 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={task.text}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <p className="label text-ink-faint mb-2">
                {task.mine ? "Yours" : "A common one"} &middot;{" "}
                {task.exposure === "outside"
                  ? "a mistake here leaves the building"
                  : "a mistake here stays internal"}
              </p>
              <p className="prose-measure mb-5 text-[1.25rem] leading-snug">
                {task.text}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {BUCKETS.map((bucket) => (
              <button
                key={bucket.id}
                type="button"
                onClick={() => put(bucket.id)}
                className={`plate px-3 py-3 text-left transition-colors ${
                  chosen === bucket.id
                    ? "border-teal bg-teal-wash"
                    : "hover:border-ink cursor-pointer"
                }`}
              >
                <span className="label text-ink-faint mb-1 block">
                  {bucket.key}
                </span>
                <span className="block text-[0.9375rem] font-semibold">
                  {bucket.label}
                </span>
                <span className="text-ink-soft block text-[0.8125rem]">
                  {bucket.means}
                </span>
              </button>
            ))}
          </div>

          <div className="min-h-[7rem]" aria-live="polite">
            {chosen ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="label text-ink-faint mb-2">
                  What we measured that bears on this. The pairing is our
                  judgement, the numbers are not
                </p>
                <ul className="mb-3 space-y-2">
                  {task.evidence.map((id) => (
                    <li key={id} className="text-[0.875rem]">
                      <a
                        href={`/lessons/${EVIDENCE[id].slug}`}
                        className="label text-blue-text mr-2 underline underline-offset-2"
                      >
                        {EVIDENCE[id].where}
                      </a>
                      <span className="text-ink-soft">
                        {EVIDENCE[id].finding}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onward}
                    className="plate misreg btn-primary font-display px-5 py-2.5 font-bold"
                  >
                    {scene.at + 1 >= scene.deck.length
                      ? "See my map"
                      : "Next task"}
                  </button>
                  {scene.at > 0 ? (
                    <button
                      type="button"
                      onClick={backward}
                      className="tap plate hover:border-ink px-4 py-2"
                    >
                      Back
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <p className="text-ink-soft text-[0.9375rem]">
                Put it in a tray. Keys 1&ndash;4 work, and you can change your
                mind before moving on.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
