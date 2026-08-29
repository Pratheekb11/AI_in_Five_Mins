"use client";

import Link from "next/link";
import { CERTIFICATES, isEarned } from "@/lib/certificate";
import { inkClasses } from "@/lib/ink";
import { getLesson, lessonsIn } from "@/lib/lessons";
import { useProgress } from "@/lib/progress";

/**
 * Which rabbit-hole module each chapter actually links to, read off the
 * `deeper=` prop each chapter page hands its own `MechanismPanel`s. Not every
 * "how" module is reachable from a chapter this way; only the ones that are
 * get drawn as a branch. Nothing here is a claim about content, only about
 * which page links to which.
 */
const BRANCHES: Record<string, string[]> = {
  "what-an-llm-is": ["how-llms-answer"],
  "context-is-everything": ["attention"],
  "prompting-as-delegation": ["how-llms-answer"],
  "where-it-breaks": ["why-ai-gets-things-wrong", "how-llms-answer"],
  "tools-change-the-game": ["how-llms-answer"],
};

/**
 * The AI path, drawn as a line: one node per chapter, a certificate at the
 * end, and the rabbit-hole modules as small branches off the chapters that
 * actually link to them. Where the learner is gets its own marker, and
 * finished nodes fill in.
 */
export function AiPathLine() {
  const { progress, isComplete } = useProgress();
  const chapters = lessonsIn("chapter");
  const cert = CERTIFICATES.find((c) => c.id === "chapter")!;
  const certDone = isEarned(cert, progress);

  const firstIncomplete = chapters.findIndex((l) => !isComplete(l.slug));
  const currentIndex =
    firstIncomplete === -1 ? chapters.length : firstIncomplete;

  return (
    <ol className="relative">
      {chapters.map((lesson, i) => {
        const ink = inkClasses[lesson.ink];
        const done = isComplete(lesson.slug);
        const isCurrent = i === currentIndex;
        const branches = BRANCHES[lesson.slug] ?? [];

        return (
          <li key={lesson.slug} className="relative flex gap-4 pb-2">
            {/* The line segment below this node, teal once this chapter is
                behind the learner. Runs for every node, including the last
                chapter, so it carries through to the certificate. */}
            <span
              className={`absolute top-9 left-[15px] w-0.5 ${
                i < currentIndex ? "bg-teal" : "bg-ink/15"
              }`}
              style={{ height: "calc(100% - 0.75rem)" }}
              aria-hidden="true"
            />

            <Link
              href={`/lessons/${lesson.slug}`}
              className={`tap relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                done
                  ? "border-teal bg-teal-wash text-teal-text"
                  : isCurrent
                    ? `${ink.chip} border-current`
                    : "border-ink/25 text-ink-faint bg-paper"
              }`}
              title={
                done
                  ? `${lesson.title}: done`
                  : isCurrent
                    ? `${lesson.title}: you are here`
                    : lesson.title
              }
            >
              {done ? (
                <svg width="14" height="11" viewBox="0 0 14 11" aria-hidden="true">
                  <path
                    d="M1 5.5 L5 9.5 L13 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="data text-xs">{i + 1}</span>
              )}
            </Link>

            <div className="min-w-0 flex-1 pb-5">
              <Link
                href={`/lessons/${lesson.slug}`}
                className="group flex items-baseline justify-between gap-2 pt-1"
              >
                <span className="font-display group-hover:underline">
                  {lesson.title}
                </span>
                {isCurrent ? (
                  <span className="label text-pink-text shrink-0">
                    you are here
                  </span>
                ) : done ? (
                  <span className="label text-teal-text shrink-0">done</span>
                ) : (
                  <span className="label text-ink-faint shrink-0">
                    {lesson.minutes}m
                  </span>
                )}
              </Link>

              {branches.length > 0 ? (
                <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {branches.map((slug) => {
                    const branch = getLesson(slug);
                    if (!branch) return null;
                    return (
                      <li key={slug}>
                        <Link
                          href={`/lessons/${slug}`}
                          className="label text-ink-faint hover:text-ink border-ink/20 rounded-[2px] border border-dashed px-1.5 py-0.5 underline-offset-2 hover:underline"
                        >
                          ↳ {branch.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}

      {/* The certificate, as the line's own last node. */}
      <li className="relative flex gap-4">
        <Link
          href="/certificate"
          className={`tap relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${
            certDone
              ? "border-teal bg-teal-wash text-teal-text"
              : currentIndex === chapters.length
                ? "border-pink-text text-pink-text"
                : "border-ink/25 text-ink-faint bg-paper"
          }`}
          title={certDone ? "Certificate earned" : "The certificate"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1 L9.6 5 L14 5.3 L10.6 8 L11.7 12.3 L8 10 L4.3 12.3 L5.4 8 L2 5.3 L6.4 5 Z"
              fill="currentColor"
            />
          </svg>
        </Link>
        <div className="pt-1">
          <Link href="/certificate" className="group">
            <span className="font-display group-hover:underline">
              {cert.title}
            </span>
          </Link>
          <p className="label text-ink-faint mt-0.5">
            {certDone
              ? "Earned"
              : currentIndex === chapters.length
                ? "Ready to claim"
                : `After chapter ${chapters.length}`}
          </p>
        </div>
      </li>
    </ol>
  );
}
