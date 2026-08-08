/**
 * Where this site is, according to the machine it is running on.
 *
 * Social cards and a sitemap both need an absolute URL, and the site has no
 * domain of its own yet. Hard-coding one would put a dead link in every link
 * preview and every search result, so the address is read from the deployment:
 *
 *   NEXT_PUBLIC_SITE_URL           set this once there is a real domain
 *   VERCEL_PROJECT_PRODUCTION_URL  set by Vercel, the production hostname
 *   VERCEL_URL                     set by Vercel, this particular deployment
 *
 * Locally it falls back to the dev server, which is correct there and wrong
 * nowhere else, because nothing local is being shared.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
