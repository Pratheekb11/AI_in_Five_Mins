"use client";

import Link from "next/link";
import { Certificate } from "@/components/Certificate";
import { NimoSays } from "@/components/nimo/NimoSays";
import { CERTIFICATES, isEarned, lessonsFor } from "@/lib/certificate";
import { useProgress } from "@/lib/progress";

/**
 * Everything there is to collect, and how close each one is.
 *
 * An unearned certificate is shown as what is left rather than as a locked
 * box: the chapters still to play are listed and linked, because that is the
 * only useful thing this page can tell somebody who has not finished.
 */
export function CertificatesView() {
  const { progress } = useProgress();
  const anyEarned = CERTIFICATES.some((spec) => isEarned(spec, progress));

  return (
    <div className="space-y-8">
      {!anyEarned ? (
        <NimoSays mood="curious" size={140}>
          Nothing to print yet. Finish a whole track and the plate below fills
          in with your name on it.
        </NimoSays>
      ) : null}

      {CERTIFICATES.map((spec) => {
        const lessons = lessonsFor(spec);
        const left = lessons.filter(
          (lesson) => !progress.completed.includes(lesson.slug),
        );

        if (isEarned(spec, progress)) {
          return <Certificate key={spec.id} spec={spec} />;
        }

        return (
          <div key={spec.id} className="plate p-5 md:p-6">
            <p className="label text-ink-faint mb-2">{spec.title}</p>
            <h2 className="display-md mb-2">
              {lessons.length - left.length} of {lessons.length} finished
            </h2>
            <p className="prose-measure text-ink-soft mb-4 text-[0.9375rem]">
              The certificate prints once every module in this track has its
              check done. {left.length} to go.
            </p>
            <ul className="flex flex-wrap gap-2">
              {left.map((lesson) => (
                <li key={lesson.slug}>
                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className="plate hover:border-ink block px-3 py-1.5 text-[0.875rem]"
                  >
                    {lesson.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
