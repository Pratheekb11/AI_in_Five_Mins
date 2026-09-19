import type { MetadataRoute } from "next";
import { LESSONS } from "@/lib/lessons";
import { siteUrl } from "@/lib/site";

/* Both of these are the same on every request, and saying so is what lets
   `STATIC_EXPORT=1 npm run build` write them out as files. */
export const dynamic = "force-static";

/**
 * The home page, the certificate, and every lesson that is actually built.
 * A module still on the bench is a holding page, and listing it would send
 * somebody to a page that says come back later.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  /* One stamp for the whole build. Per-page dates would have to come from git,
     and a date that is not the date the page changed is worse than none. */
  const lastModified = new Date();

  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    /* The syllabus is the page that should rank for "free AI course", and it
       links to every module, so it sits above the two utility pages. */
    {
      url: `${base}/curriculum`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/certificate`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.1,
    },
    ...LESSONS.filter((lesson) => lesson.status === "ready").map((lesson) => ({
      url: `${base}/lessons/${lesson.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      /* The six chapters are the site. The rest is real and worth indexing,
         and saying so is what a priority is for. */
      priority: lesson.track === "chapter" ? 0.9 : 0.7,
    })),
  ];
}
