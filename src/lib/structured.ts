import { type Lesson, LESSONS, lessonsIn, TRACKS } from "./lessons";
import { lessonSeo, teaches } from "./seo";
import { siteUrl } from "./site";
import type { Source } from "./sources";

/**
 * JSON-LD. The part of SEO that is actually read.
 *
 * A meta keyword is ignored; a `LearningResource` with `teaches`, a time cost
 * and a price of zero is how a search engine learns this is a free interactive
 * lesson rather than a blog post. Nothing here renders anything visible, and
 * every claim in it is already true of the page it sits on.
 */

const NAME = "AIinFive";
const AUTHOR = "Pratheek B";

type Node = Record<string, unknown>;

export function organisation(): Node {
  const base = siteUrl();
  return {
    "@type": "Organization",
    "@id": `${base}/#site-owner`,
    name: NAME,
    url: base,
    logo: `${base}/og.png`,
    founder: { "@type": "Person", name: AUTHOR },
  };
}

/** The site itself, once, in the root layout. */
export function webSite(): Node {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      organisation(),
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: NAME,
        alternateName: ["AI in Five", "AI in Five Minutes"],
        description:
          "A free, interactive course on how AI actually works. Every game runs on real measurements from real models.",
        inLanguage: "en",
        publisher: { "@id": `${base}/#site-owner` },
        author: { "@type": "Person", name: AUTHOR },
      },
    ],
  };
}

/**
 * One lesson, as a thing somebody can learn from. `Course` is what earns a
 * rich result; `LearningResource` is what describes it honestly. Declaring
 * both types on one node is legal and is how to have each.
 */
export function lessonResource(lesson: Lesson, sources: Source[] = []): Node {
  const base = siteUrl();
  const url = `${base}/lessons/${lesson.slug}`;
  const seo = lessonSeo(lesson);

  return {
    "@context": "https://schema.org",
    "@type": ["Course", "LearningResource"],
    "@id": `${url}#lesson`,
    url,
    name: lesson.title,
    alternateName: seo.title,
    headline: seo.title,
    description: seo.description,
    keywords: seo.keywords.join(", "),
    about: TRACKS[lesson.track].title,
    teaches: teaches(lesson),
    learningResourceType: "interactive simulation",
    interactivityType: "active",
    educationalLevel: "beginner",
    timeRequired: `PT${lesson.minutes}M`,
    inLanguage: "en",
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    author: { "@type": "Person", name: AUTHOR },
    provider: { "@id": `${base}/#site-owner` },
    publisher: { "@id": `${base}/#site-owner` },
    isPartOf: { "@id": `${base}/#website` },
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      category: "Free",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${lesson.minutes}M`,
    },
    ...(sources.length > 0
      ? {
          citation: sources.map((source) => ({
            "@type": "CreativeWork",
            name: source.title,
            url: source.url,
            publisher: { "@type": "Organization", name: source.publisher },
          })),
        }
      : {}),
  };
}

/** Home, this track, this lesson. Draws the crumb trail under a result. */
export function lessonCrumbs(lesson: Lesson): Node {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: base },
      {
        "@type": "ListItem",
        position: 2,
        name: TRACKS[lesson.track].title,
        item: `${base}/curriculum`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: lesson.title,
        item: `${base}/lessons/${lesson.slug}`,
      },
    ],
  };
}

/** A track, as an ordered list of its lessons. Home and the curriculum page. */
export function trackList(track: Parameters<typeof lessonsIn>[0]): Node {
  const base = siteUrl();
  const lessons = lessonsIn(track).filter((l) => l.status === "ready");

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TRACKS[track].title,
    description: TRACKS[track].blurb,
    numberOfItems: lessons.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: lessons.map((lesson, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: lessonSeo(lesson).title,
      url: `${base}/lessons/${lesson.slug}`,
    })),
  };
}

/** Every ready module, for the curriculum page. */
export function wholeCurriculum(): Node {
  const base = siteUrl();
  const ready = LESSONS.filter((l) => l.status === "ready");

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "The AIinFive curriculum",
    numberOfItems: ready.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: ready.map((lesson, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: lessonSeo(lesson).title,
      url: `${base}/lessons/${lesson.slug}`,
    })),
  };
}
