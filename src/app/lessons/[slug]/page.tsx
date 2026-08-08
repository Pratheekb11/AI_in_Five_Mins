import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { inkClasses } from "@/lib/ink";
import { getLesson, LESSONS, neighbours } from "@/lib/lessons";

/**
 * Holding page for lessons still on the bench.
 *
 * Lessons that are finished have their own route under `lessons/<slug>`, and a
 * static segment wins over this dynamic one, so a lesson graduates simply by
 * gaining its own folder. Anything not in the registry is a genuine 404.
 */

export function generateStaticParams() {
  // Finished lessons have their own route, which takes precedence over this
  // one. Prerendering them here would only build a page nothing can reach.
  return LESSONS.filter((lesson) => lesson.status === "building").map(
    (lesson) => ({ slug: lesson.slug }),
  );
}

export async function generateMetadata(props: PageProps<"/lessons/[slug]">) {
  const { slug } = await props.params;
  const lesson = getLesson(slug);
  if (!lesson) return {};
  return { title: lesson.title, description: lesson.standfirst };
}

export default async function LessonPlaceholder(
  props: PageProps<"/lessons/[slug]">,
) {
  const { slug } = await props.params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const ink = inkClasses[lesson.ink];
  const { next } = neighbours(lesson.slug);

  return (
    <>
      <SiteHeader />

      <main id="content" className="mx-auto max-w-6xl px-5 py-14">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span
            className={`data ${ink.chip} rounded-[2px] border px-2 py-1 text-xs font-bold`}
          >
            Lesson {String(lesson.number).padStart(2, "0")}
          </span>
          <span className="label text-ink-faint">{lesson.machine}</span>
        </div>

        <h1 className="display-xl mb-5">{lesson.title}</h1>
        <p className="prose-measure text-ink-soft mb-9 text-xl">
          {lesson.standfirst}
        </p>

        <div className="plate prose-measure p-6">
          <p className="label text-ink-faint mb-3">Still on the bench</p>
          <p className="text-ink-soft">
            This machine is not built yet. The lessons are being finished in
            order, and each one has to work with real data before it ships.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/lessons/tokens"
              className="plate misreg btn-primary font-display inline-block px-4 py-2.5 font-bold"
            >
              Try the tokenizer instead
            </Link>
            {next ? (
              <Link
                href={`/lessons/${next.slug}`}
                className="plate misreg font-display inline-block px-4 py-2.5 font-bold"
              >
                {next.title}
              </Link>
            ) : null}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
