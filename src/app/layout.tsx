import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Literata, Martian_Mono } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

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

const DESCRIPTION =
  "Six short chapters that let you operate the machinery behind AI. Real tokenizers, real word vectors, real probabilities. No maths required.";

/**
 * `metadataBase` is what makes the social card absolute. Without it every
 * `openGraph.images` entry stays relative, which no crawler follows, and the
 * certificate's share buttons post a link that previews as bare text.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "AIinFive: take the machine apart",
    template: "%s · AIinFive",
  },
  description: DESCRIPTION,
  applicationName: "AIinFive",
  authors: [{ name: "Pratheek B" }],
  openGraph: {
    type: "website",
    siteName: "AIinFive",
    title: "AIinFive: take the machine apart",
    description: DESCRIPTION,
    locale: "en",
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
        <Analytics />
      </body>
    </html>
  );
}
