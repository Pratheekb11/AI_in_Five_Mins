import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Literata, Martian_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "LearnLoopAI: take the machine apart",
    template: "%s · LearnLoopAI",
  },
  description:
    "Six short chapters that let you operate the machinery behind AI. Real tokenizers, real word vectors, real probabilities. No maths required.",
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
