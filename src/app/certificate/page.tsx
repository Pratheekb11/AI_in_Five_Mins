import type { Metadata } from "next";
import { CertificatesView } from "@/components/CertificatesView";
import { Engagement } from "@/components/Engagement";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Your certificate",
  description:
    "Print what you finished, with your name on it, and take it wherever you like.",
};

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
      </main>

      <SiteFooter />
    </>
  );
}
