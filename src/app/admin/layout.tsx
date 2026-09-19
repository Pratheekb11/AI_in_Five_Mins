import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * The diagnostic view reads this one browser's own localStorage, so there is
 * nothing here for anybody who is not the person who built the site. Kept out
 * of the index by the tag as well as by robots.txt: a disallowed URL can still
 * be listed from a link elsewhere, and only `noindex` stops that.
 */
export const metadata: Metadata = {
  title: "Signals",
  description:
    "A local diagnostic view of this one browser's own interaction signals.",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
