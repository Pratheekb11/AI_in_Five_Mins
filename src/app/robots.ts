import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/* Both of these are the same on every request, and saying so is what lets
   `STATIC_EXPORT=1 npm run build` write them out as files. */
export const dynamic = "force-static";

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
