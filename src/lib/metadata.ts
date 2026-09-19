import type { Metadata } from "next";
import type { Lesson } from "./lessons";
import { lessonSeo, SITE_KEYWORDS } from "./seo";

/**
 * The tags that decide what a shared link looks like, and what a search
 * engine files the page under.
 */

const SITE = "AIinFive";
const AUTHOR = "Pratheek B";
const CARD = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "AIinFive: stop guessing what AI is actually doing.",
};

/**
 * Let the snippet and the thumbnail run at full size. Left unsaid, Google
 * picks a short text snippet and a small image, which is the difference
 * between a result that shows the measured number and one that shows a
 * truncated half sentence.
 */
export const INDEXING: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  keywords = [],
}: {
  title: string;
  description: string;
  /** Site-relative, leading slash. Becomes the canonical URL. */
  path: string;
  type?: "website" | "article";
  /** Page-specific terms. The site-wide set is appended to every page. */
  keywords?: string[];
}): Metadata {
  /* The document title picks up the root template; an og:title does not, and
     a card headed by a bare lesson name reads as somebody else's page. */
  const shared = `${title} · ${SITE}`;

  return {
    title,
    description,
    keywords: [...keywords, ...SITE_KEYWORDS],
    authors: [{ name: AUTHOR }],
    creator: AUTHOR,
    publisher: SITE,
    alternates: { canonical: path },
    robots: INDEXING,
    openGraph: {
      type,
      siteName: SITE,
      title: shared,
      description,
      url: path,
      /* og:locale takes a language_TERRITORY pair. A bare "en" is silently
         dropped by the scrapers that validate it. */
      locale: "en_US",
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

/**
 * Every lesson page, from the registry, so none of them can drift.
 *
 * The title and description come from `seo.ts` rather than from the lesson's
 * own words: the `<h1>` is written for somebody already reading, and a result
 * in a list has to be written for somebody who typed a question.
 */
export function lessonMetadata(lesson: Lesson): Metadata {
  const seo = lessonSeo(lesson);

  return pageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/lessons/${lesson.slug}`,
    type: "article",
    keywords: seo.keywords,
  });
}
