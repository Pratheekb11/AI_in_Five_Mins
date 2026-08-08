import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Everything here is meant to be found. The one exception is the assistant
 * endpoint, which is a POST target and has nothing to index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
