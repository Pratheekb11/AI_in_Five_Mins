import type { Metadata } from "next";
import type { Lesson } from "./lessons";

/**
 * The tags that decide what a shared link looks like.
 */

const SITE = "AIinFive";
const CARD = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "AIinFive: stop guessing what AI is actually doing.",
};

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  /** Site-relative, leading slash. Becomes the canonical URL. */
  path: string;
  type?: "website" | "article";
}): Metadata {
  /* The document title picks up the root template; an og:title does not, and
     a card headed by a bare lesson name reads as somebody else's page. */
  const shared = `${title} · ${SITE}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE,
      title: shared,
      description,
      url: path,
      locale: "en",
      images: [CARD],
    },
    twitter: {
      card: "summary_large_image",
      title: shared,
      description,
      images: [{ url: CARD.url, alt: CARD.alt }],
    },
  };
}

/** Every lesson page, from the registry, so none of them can drift. */
export function lessonMetadata(lesson: Lesson): Metadata {
  return pageMetadata({
    title: lesson.title,
    description: lesson.standfirst,
    path: `/lessons/${lesson.slug}`,
    type: "article",
  });
}
