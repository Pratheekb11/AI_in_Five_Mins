import type { Metadata } from "next";
import type { Lesson } from "./lessons";

/**
 * The tags that decide what a shared link looks like.
 *
 * Next inherits `title` and `description` down the tree but does NOT merge
 * `openGraph` into a child that declares its own metadata, so every lesson
 * page was shipping a title, a description and no card at all: no image, no
 * og:title, nothing. A chapter posted anywhere previewed as a bare blue link
 * while the home page previewed properly, which is exactly backwards, because
 * the thing people share is the chapter that surprised them.
 *
 * So every page builds its tags through here. One card image for the whole
 * site — twenty-five drawn cards would be twenty-five things to keep true —
 * and the per-page title and standfirst carry the difference.
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
