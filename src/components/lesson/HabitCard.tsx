import type { Habit } from "@/lib/lessons";

/**
 * The chapter, turned into one thing to do differently tomorrow. Sits on the
 * closing screen above the way onward, so somebody who stops here still leaves
 * with something they can use the next time they open an assistant.
 *
 * Yellow is the learner's own input, which is what the "try" prompt is.
 */
export function HabitCard({ habit }: { habit: Habit }) {
  return (
    <section
      aria-label="Next time you use an AI assistant"
      className="plate mx-auto mb-6 max-w-xl p-4 text-left sm:p-5"
    >
      <p className="label text-ink-faint">Next time you use ChatGPT</p>
      <p className="font-display mt-1 text-lg leading-snug font-bold sm:text-xl">
        {habit.line}
      </p>
      <dl className="mt-3 space-y-2 text-[0.9375rem] leading-snug">
        <div>
          <dt className="label text-ink-faint">Instead of</dt>
          <dd className="text-ink-soft mt-0.5">
            {habit.instead}
          </dd>
        </div>
        <div>
          <dt className="label text-yellow-text">Try</dt>
          <dd className="bg-yellow-wash border-yellow/40 mt-0.5 rounded-[2px] border px-2 py-1.5">
            {habit.try}
          </dd>
        </div>
      </dl>
    </section>
  );
}
