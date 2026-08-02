import type { NextConfig } from "next";

/**
 * Response headers.
 *
 * This site has no server, no accounts and no database. It reads nothing from
 * the network at runtime except its own static files, one YouTube embed per
 * lesson, and the thumbnail for that embed. So the policy can be tight, and
 * the two places it is loose are both deliberate and written down here rather
 * than left for someone to discover.
 *
 * `script-src` allows inline scripts. Next inlines its own bootstrap and flight
 * payload into every prerendered page, and the theme script in the root layout
 * has to run before first paint or a returning reader gets a flash of the wrong
 * plate. Nonces would fix this and would also force every page to render on
 * request, which throws away the fact that the whole site is static. The trade
 * is worth stating plainly: what remains is that no script from another origin
 * can execute, `object-src` is closed, and there is nowhere on the site that
 * renders user input as markup — the one text field writes to localStorage and
 * comes back out through React, which escapes it.
 *
 * `style-src` allows inline styles for the same reason: the framework emits
 * them, and a style injection with no script execution is not a route to
 * anything.
 */
/**
 * React's development build calls `eval` to rebuild stack traces, and
 * Turbopack's hot reload needs it too. Neither exists in the production build,
 * so the allowance is scoped to `next dev` and never ships.
 */
const DEV = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  // The lesson videos, and nothing else.
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          // Belt and braces for frame-ancestors, for anything that predates it.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
