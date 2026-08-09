import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { lessonsIn } from "@/lib/lessons";

/**
 * The page for an address that is not here.
 */
export default function NotFound() {
  /* The two front doors, and nothing else: a 404 is not a place to put a
     syllabus. */
  const doors = (["chapter", "ml"] as const)
    .map((track) => lessonsIn(track).find((lesson) => lesson.status === "ready"))
    .filter((lesson) => lesson !== undefined);

  return (
    <>
      <SiteHeader />

      <main id="content" className="mx-auto max-w-6xl px-5 py-16">
        <p className="label text-ink-faint mb-4">404 · no such page</p>
        <h1 className="display-xl mb-5">That address is not here.</h1>
        <p className="prose-measure text-ink-soft mb-9 text-xl">
          Nothing is broken. The link was either mistyped or it points at
          something that has since been renamed. Everything the site has is one
          press away.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="plate misreg btn-primary font-display inline-block px-4 py-2.5 font-bold"
          >
            Back to the start
          </Link>
          {doors.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/lessons/${lesson.slug}`}
              className="plate misreg font-display inline-block px-4 py-2.5 font-bold"
            >
              {lesson.title}
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
