import type { MetadataRoute } from "next";
import { LESSONS } from "@/lib/lessons";
import { siteUrl } from "@/lib/site";

/**
 * The home page, the certificate, and every lesson that is actually built.
 * A module still on the bench is a holding page, and listing it would send
 * somebody to a page that says come back later.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/certificate`, changeFrequency: "monthly", priority: 0.3 },
    ...LESSONS.filter((lesson) => lesson.status === "ready").map((lesson) => ({
      url: `${base}/lessons/${lesson.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
