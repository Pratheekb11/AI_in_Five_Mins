"use client";

import { useState } from "react";
import type { Exposure } from "@/lib/game/sort";
import { useOwnTasks } from "@/lib/game/useOwnTasks";

/**
 * Add the tasks we could not have guessed.
 *
 * The deck that ships with the module is generic, and a generic audit is not an
 * audit. Whatever you type here is shuffled into the next round, so the game
 * starts asking about your actual week.
 *
 * It is stored in this browser and nowhere else. There is no account, no
 * server, and nothing is sent anywhere — which is the same standard the last
 * module of this track asks you to hold your tools to.
 */
export function YourWeek() {
  const { tasks, add, remove, limit, maxLength } = useOwnTasks();
  const [text, setText] = useState("");
  const [exposure, setExposure] = useState<Exposure>("inside");

  const full = tasks.length >= limit;

  return (
    <section className="plate p-5 md:p-6">
      <p className="label text-yellow-text mb-3">Make it your week</p>
      <h3 className="display-md mb-2">Add your own tasks</h3>
      <p className="prose-measure text-ink-soft mb-5 text-[0.9375rem]">
        Type the jobs that actually filled your last five days. They get
        shuffled into the deck the next time you play, and they stay in this
        browser &mdash; nothing is sent anywhere.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(text, exposure);
          setText("");
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <label className="min-w-[16rem] flex-1">
          <span className="label text-ink-faint mb-1.5 block">The task</span>
          <input
            type="text"
            value={text}
            maxLength={maxLength}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write the Monday status note"
            disabled={full}
            className="border-ink/30 bg-paper focus-visible:outline-ink w-full rounded-[2px] border px-3 py-2.5 text-[0.9375rem] outline-none focus-visible:outline-2 disabled:opacity-40"
          />
        </label>

        <fieldset className="min-w-0">
          <legend className="label text-ink-faint mb-1.5">
            If it went wrong, who sees it?
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["inside", "Stays inside"],
                ["outside", "Reaches outside"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setExposure(value)}
                aria-pressed={exposure === value}
                className={`rounded-[2px] border px-3 py-2.5 text-[0.875rem] transition-colors ${
                  exposure === value
                    ? "border-ink bg-yellow-wash text-yellow-text font-semibold"
                    : "border-ink/30 bg-paper hover:border-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={full || text.trim().length === 0}
          className="plate misreg btn-primary font-display px-5 py-2.5 font-bold disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {tasks.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tasks.map((task) => (
            <li key={task.text}>
              <button
                type="button"
                onClick={() => remove(task.text)}
                className="border-ink/30 bg-paper-sunk hover:border-pink hover:text-pink-text flex items-center gap-2 rounded-[2px] border px-2.5 py-1.5 text-[0.875rem] transition-colors"
                aria-label={`Remove ${task.text}`}
              >
                {task.text}
                <span className="label text-ink-faint">
                  {task.exposure === "outside" ? "outside" : "inside"}
                </span>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-faint text-[0.875rem]">
          Nothing added yet. Three or four is enough to change the round.
        </p>
      )}

      {full ? (
        <p className="text-ink-faint mt-3 text-[0.875rem]">
          That is the {limit} the deck will take. Remove one to add another.
        </p>
      ) : null}
    </section>
  );
}
