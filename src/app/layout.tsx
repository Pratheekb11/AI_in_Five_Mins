import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Literata, Martian_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { INDEXING } from "@/lib/metadata";
import { SITE_KEYWORDS } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { webSite } from "@/lib/structured";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
});

const OG_ALT = "AIinFive: stop guessing what AI is actually doing.";

/** The share card's words. This is the voice, and it stays the voice. */
const DESCRIPTION =
  "Six short chapters that let you operate the machinery behind AI. Real tokenizers, real word vectors, real probabilities. No maths required.";

/**
 * The words under a search result, which is a different job: somebody who has
 * typed a question and has not heard of this site. Same claims, front-loaded
 * with what they searched for, inside the 160 characters Google will show.
 */
const SEARCH_DESCRIPTION =
  "Learn how AI actually works by playing it. Six short interactive chapters on LLMs, tokens, prompts and machine learning. Free, no sign-up, no maths needed.";

/**
 * `metadataBase` is what makes the social card absolute. Without it every
 * `openGraph.images` entry stays relative, which no crawler follows, and the
 * certificate's share buttons post a link that previews as bare text.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    /* The document title, which is also the blue line in a result list, so it
       says what the site is rather than only what it is called. The share
       card's og:title below keeps the house phrasing. */
    default: "AIinFive: learn how AI actually works",
    template: "%s · AIinFive",
  },
  description: SEARCH_DESCRIPTION,
  /* Inherited by every page that does not set its own, which is how one
     phrase covers the home page, the 404 and anything added later. */
  keywords: SITE_KEYWORDS,
  alternates: { canonical: "/" },
  applicationName: "AIinFive",
  authors: [{ name: "Pratheek B" }],
  creator: "Pratheek B",
  publisher: "AIinFive",
  category: "education",
  robots: INDEXING,
  /* Search Console wants a token in the head before it will show this site
     any data. Set GOOGLE_SITE_VERIFICATION in the host and it appears; left
     unset, no empty tag is printed. */
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    type: "website",
    siteName: "AIinFive",
    title: "AIinFive: take the machine apart",
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIinFive: take the machine apart",
    description: DESCRIPTION,
    images: [{ url: "/og.png", alt: OG_ALT }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eae7de" },
    { media: "(prefers-color-scheme: dark)", color: "#131319" },
  ],
};

// Applied before first paint so a returning learner never sees the wrong
// plate flash. Kept inline and tiny for that reason.
const themeBootstrap = `(function(){try{var t=localStorage.getItem("llai-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${literata.variable} ${martian.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full">
        {children}
        {/* Who this site is and what it is called, once, for the whole
            tree. Nothing visible. */}
        <JsonLd data={webSite()} />
        <Analytics />
      </body>
    </html>
  );
}
