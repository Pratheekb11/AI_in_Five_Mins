import Link from "next/link";
import { LiveTokenizer } from "@/components/machines/LiveTokenizer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { inkClasses } from "@/lib/ink";
import { LESSONS, TOTAL_MINUTES } from "@/lib/lessons";

export default function Home() {
  return (
    <>
      <header className="border-ink/25 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <span className="font-display text-lg font-extrabold tracking-tight">
            LearnLoop<span className="text-pink-text">AI</span>
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main>
        {/* Hero. The thesis is the machine itself, not a sentence about it —
            the first thing a visitor does is watch their own words get cut up. */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-16 md:pt-20">
          <p className="label text-ink-faint mb-5">
            Field manual · {LESSONS.length} lessons · {TOTAL_MINUTES} minutes
          </p>

          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div>
              <h1 className="display-xl">
                AI doesn&rsquo;t
                <br />
                read your
                <br />
                <span className="text-pink-text">words.</span>
              </h1>

              <div className="prose-measure text-ink-soft mt-7 text-lg">
                <p>
                  It reads these. Every model you have ever used chops your text
                  into pieces first, and only ever sees the pieces.
                </p>
                <p>
                  That is the real tokenizer beside this &mdash; the same one
                  behind GPT&#8209;4o and GPT&#8209;5 &mdash; running on
                  whatever you type. Nothing here is a mock-up of how AI works.
                  You operate the actual machinery.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/lessons/what-is-ai"
                  className="plate misreg bg-blue text-paper border-ink font-display inline-block px-5 py-3 font-bold"
                >
                  Start at lesson 1
                </Link>
                <Link
                  href="/lessons/tokens"
                  className="plate misreg font-display inline-block px-5 py-3 font-bold"
                >
                  Skip to tokens
                </Link>
              </div>
            </div>

            <div className="plate p-5 md:p-6">
              <LiveTokenizer />
            </div>
          </div>
        </section>

        {/* Lesson map */}
        <section
          id="lessons"
          className="border-ink/25 bg-paper-sunk border-t border-b"
        >
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="display-lg mb-2">The eight machines</h2>
            <p className="prose-measure text-ink-soft mb-9">
              Each lesson is one thing you take apart. They run in order because
              each is built out of the one before it &mdash; but the tokenizer
              stands on its own if you want the short version.
            </p>

            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LESSONS.map((lesson) => {
                const ink = inkClasses[lesson.ink];
                return (
                  <li key={lesson.slug}>
                    <Link
                      href={`/lessons/${lesson.slug}`}
                      className="plate misreg flex h-full flex-col p-5"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span
                          className={`data ${ink.solid} ${ink.onSolid} rounded-[2px] px-1.5 py-0.5 text-xs font-bold`}
                        >
                          {String(lesson.number).padStart(2, "0")}
                        </span>
                        <span className="label text-ink-faint">
                          {lesson.minutes} min
                        </span>
                      </div>

                      <h3 className="display-md mb-2">{lesson.title}</h3>
                      <p className="text-ink-soft grow text-[0.9375rem]">
                        {lesson.standfirst}
                      </p>

                      <p className="border-ink/20 label text-ink-faint mt-4 border-t pt-3">
                        {lesson.machine}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="display-md mb-3">Where the numbers come from</h2>
          <p className="prose-measure text-ink-soft">
            Every token, vector and probability on this site is computed from a
            real model or a published dataset, and every lesson ends with the
            sources it drew on. Where a figure is precomputed rather than run in
            your browser, the script that produced it is in the repository.
          </p>
        </section>
      </main>

      <footer className="border-ink/25 border-t">
        <div className="text-ink-faint mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm">
          <span>LearnLoopAI</span>
          <span className="data text-xs">
            Tokenizer: o200k_base · runs entirely in your browser
          </span>
        </div>
      </footer>
    </>
  );
}
