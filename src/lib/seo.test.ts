import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LESSONS } from "./lessons";
import { lessonSeo, READY_SLUGS, SITE_KEYWORDS, seoSlugs } from "./seo";
import { lessonMetadata, pageMetadata } from "./metadata";
import {
  lessonCrumbs,
  lessonResource,
  trackList,
  webSite,
  wholeCurriculum,
} from "./structured";

/**
 * The search-facing copy, guarded.
 *
 * Titles and descriptions are cut off at a length nobody sees while writing
 * them, and a lesson added later would silently ship its own headline into a
 * result list. Both are cheap to check and expensive to notice in the wild.
 */

/** The root template appends " · AIinFive", and Google shows about 60. */
const TITLE_MAX = 48;
/** Google truncates the snippet around 160. */
const DESCRIPTION_MAX = 165;
const DESCRIPTION_MIN = 100;

describe("search copy", () => {
  it("covers every ready lesson", () => {
    const missing = READY_SLUGS.filter((slug) => !seoSlugs().includes(slug));
    expect(missing).toEqual([]);
  });

  it("has no entry for a lesson that does not exist", () => {
    const slugs = LESSONS.map((lesson) => lesson.slug);
    expect(seoSlugs().filter((slug) => !slugs.includes(slug))).toEqual([]);
  });

  it("keeps every title inside what a result shows", () => {
    const long = LESSONS.map((lesson) => lessonSeo(lesson))
      .filter((seo) => seo.title.length > TITLE_MAX)
      .map((seo) => `${seo.title} (${seo.title.length})`);
    expect(long).toEqual([]);
  });

  it("keeps every description inside the snippet, and worth showing", () => {
    const bad = LESSONS.map((lesson) => lessonSeo(lesson))
      .filter(
        (seo) =>
          seo.description.length > DESCRIPTION_MAX ||
          seo.description.length < DESCRIPTION_MIN,
      )
      .map((seo) => `${seo.title}: ${seo.description.length}`);
    expect(bad).toEqual([]);
  });

  it("gives every lesson its own title", () => {
    const titles = LESSONS.map((lesson) => lessonSeo(lesson).title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("gives every lesson its own keywords, with no duplicates inside one", () => {
    for (const lesson of LESSONS) {
      const words = lessonSeo(lesson).keywords;
      expect(words.length).toBeGreaterThan(2);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it("puts the page's own words before the site's in the tag", () => {
    const lesson = LESSONS[0];
    const words = lessonMetadata(lesson).keywords as string[];
    expect(words[0]).toBe(lessonSeo(lesson).keywords[0]);
    expect(words).toContain(SITE_KEYWORDS[0]);
  });

  it("canonicalises and indexes every page it builds", () => {
    const meta = pageMetadata({
      title: "T",
      description: "D",
      path: "/somewhere",
    });
    expect(meta.alternates?.canonical).toBe("/somewhere");
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    /* A bare "en" is dropped by scrapers that validate og:locale. */
    expect(meta.openGraph).toMatchObject({ locale: "en_US" });
  });
});

describe("page structure", () => {
  /**
   * Exactly one top heading per lesson, and the deck has no masthead of its
   * own, so on those pages it has to come from the page itself: either the
   * `Hook`, which promotes its claim when it is inside a stage, or the premise
   * on the first board. Fifteen pages shipped with no `h1` at all before this
   * was checked.
   */
  it("gives every lesson page exactly one top heading", () => {
    const wrong: string[] = [];
    for (const lesson of LESSONS) {
      const source = readFileSync(
        resolve(process.cwd(), `src/app/lessons/${lesson.slug}/page.tsx`),
        "utf8",
      );
      const deck = source.includes("LessonStageShell");
      const ownH1 = (source.match(/<h1[\s>]/g) ?? []).length;
      const hook = source.includes("<Hook");

      if (deck) {
        /* One of the two, never both: `Hook` renders the `h1` itself. */
        if (ownH1 + (hook ? 1 : 0) !== 1) {
          wrong.push(`${lesson.slug}: deck with ${ownH1} h1 and ${hook ? "a" : "no"} Hook`);
        }
      } else if (ownH1 !== 0) {
        /* The scrolling shell prints the title as the `h1` already. */
        wrong.push(`${lesson.slug}: scrolling page with its own h1`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("structured data", () => {
  it("declares the site once, with an owner every node can point at", () => {
    const graph = webSite()["@graph"] as Record<string, unknown>[];
    const owner = graph.find((node) => node["@type"] === "Organization");
    expect(owner).toBeTruthy();
    const site = graph.find((node) => node["@type"] === "WebSite");
    expect(site?.publisher).toEqual({ "@id": owner?.["@id"] });
  });

  it("describes a lesson as a free, timed, interactive course", () => {
    const lesson = LESSONS[0];
    const node = lessonResource(lesson);
    expect(node["@type"]).toEqual(["Course", "LearningResource"]);
    expect(node.timeRequired).toBe(`PT${lesson.minutes}M`);
    expect(node.isAccessibleForFree).toBe(true);
    expect(node.teaches).not.toHaveLength(0);
    expect(node.description).toBe(lessonSeo(lesson).description);
  });

  it("cites its sources by URL when the page has any", () => {
    const node = lessonResource(LESSONS[0], [
      {
        title: "A paper",
        publisher: "Somebody",
        url: "https://example.com/a",
        used: "A number.",
      },
    ]);
    expect(node.citation).toHaveLength(1);
  });

  it("leaves citation out entirely when there are none", () => {
    expect(lessonResource(LESSONS[0])).not.toHaveProperty("citation");
  });

  it("walks home, track, lesson in the crumbs", () => {
    const items = lessonCrumbs(LESSONS[0]).itemListElement as {
      position: number;
    }[];
    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("lists a track in reading order and counts it right", () => {
    const list = trackList("chapter");
    const items = list.itemListElement as { position: number; url: string }[];
    expect(list.numberOfItems).toBe(items.length);
    expect(items[0].url).toContain("/lessons/what-an-llm-is");
    expect(items.map((item) => item.position)).toEqual(
      items.map((_, i) => i + 1),
    );
  });

  it("lists every ready module on the curriculum", () => {
    expect(wholeCurriculum().numberOfItems).toBe(READY_SLUGS.length);
  });

  it("never emits a raw angle bracket into a script element", () => {
    const rendered = JSON.stringify(lessonResource(LESSONS[0])).replace(
      /</g,
      "\\u003c",
    );
    expect(rendered).not.toContain("<");
  });
});
