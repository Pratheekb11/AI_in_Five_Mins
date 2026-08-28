import type { Metadata } from "next";
import { CertificatesView } from "@/components/CertificatesView";
import { Engagement } from "@/components/Engagement";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TodaysPuzzleCard } from "@/components/TodaysPuzzleCard";
import type { HuntData } from "@/lib/game/hunt";
import { pageMetadata } from "@/lib/metadata";
import { readGameData } from "@/lib/server/gameData";

export const metadata: Metadata = pageMetadata({
  title: "Your certificate",
  description:
    "Print what you finished, with your name on it, and take it wherever you like.",
  path: "/certificate",
});

const huntData = readGameData<HuntData>("hunt.json");

export default function CertificatePage() {
  return (
    <>
      <Engagement page="certificate" />
      <SiteHeader />

      <main id="content" className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="label text-ink-faint mb-3">Proof, of a sort</p>
        <h1 className="display-lg mb-4">What you finished</h1>
        <p className="prose-measure text-ink-soft mb-9">
          There are no accounts here, so this is not a credential and does not
          pretend to be one. It is a printed plate with your name on it, drawn
          in this browser, saying what you played and when. Take it or leave it.
        </p>

        <CertificatesView />

        <div className="border-ink/25 mt-14 border-t pt-12">
          <TodaysPuzzleCard initialData={huntData} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
