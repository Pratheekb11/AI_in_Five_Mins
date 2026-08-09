import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { KEPT_KEYS } from "@/lib/storageKeys";

export const metadata: Metadata = {
  title: "What this site keeps",
  description:
    "Everything AIinFive stores, where it stores it, and how to wipe it. There are no accounts and nothing identifying is ever sent.",
};

/**
 * The privacy page.
 *
 * A site whose whole pitch is that every number can be traced should be able
 * to say exactly what it keeps, and it is a short list. There is no login, no
 * database and no server holding anything: progress lives in the reader's own
 * browser and the analytics are cookieless counts of pages.
 *
 * Written as prose rather than as a policy, because a policy nobody reads is
 * not disclosure. The list of storage keys is imported from `reset.ts` rather
 * than typed out, so this page cannot quietly go out of date when a key is
 * added. They come from `storageKeys.ts` rather than from `reset.ts`, which is
 * a client module: a server component importing a value from one of those gets
 * a client reference and not the value.
 */

const STORED = [
  {
    key: "llai-progress",
    what: "Which modules you have finished and what each check scored.",
  },
  { key: "llai-best", what: "Your best score in each game." },
  {
    key: "llai-own-tasks",
    what: "The tasks you typed into the task audit, if you typed any.",
  },
  {
    key: "llai-name",
    what: "The name you asked to have printed on a certificate, if you asked.",
  },
  { key: "llai-theme", what: "Light or dark." },
  { key: "llai-muted", what: "Whether the game sounds are off." },
];

export default function Privacy() {
  return (
    <>
      <SiteHeader />

      <main id="content" className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <p className="label text-ink-faint mb-4">Privacy</p>
        <h1 className="display-xl mb-5">What this site keeps.</h1>
        <p className="prose-measure text-ink-soft mb-10 text-xl">
          There is no account to make, no server holding your work and nothing
          here that could identify you. This page is the whole of it.
        </p>

        <section className="mb-10">
          <h2 className="display-md mb-3">Everything is in your browser</h2>
          <div className="prose-measure text-ink-soft space-y-3">
            <p>
              Your progress, your scores and your name on a certificate are
              written to this browser&rsquo;s local storage and never leave it.
              Nobody else can read them, including me. Open the site in a
              different browser and it will not know you.
            </p>
            <p>
              That also means it is not a backup. Clearing your browser data
              clears this too.
            </p>
          </div>

          <ul className="mt-5 space-y-2">
            {STORED.map((item) => (
              <li key={item.key} className="plate flex flex-col gap-1 p-3">
                <span className="data text-sm font-bold">{item.key}</span>
                <span className="text-ink-soft text-sm">{item.what}</span>
              </li>
            ))}
          </ul>

          <p className="prose-measure text-ink-soft mt-5">
            The Reset button in the masthead wipes the first four. It
            deliberately keeps{" "}
            {KEPT_KEYS.map((key) => (
              <span key={key} className="data text-sm">
                {key}{" "}
              </span>
            ))}
            &mdash; being flipped back to light mode with the sound on is a
            worse surprise than keeping them.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="display-md mb-3">What is counted</h2>
          <div className="prose-measure text-ink-soft space-y-3">
            <p>
              Page views and visitor counts come from Vercel Web Analytics,
              which sets no cookies and builds no profile across sites. On top
              of that the site sends four events: how long a page was open, when
              a game was started and finished, and what a check scored.
            </p>
            <p>
              Every value in those is either the lesson slug, which is already
              in the address bar, or a number the site itself produced. Nothing
              you type is sent anywhere, nothing from local storage is sent
              anywhere, and there is no identifier to join any of it up.
            </p>
            <p>
              If your browser or an extension blocks it, nothing on the site
              stops working. That is on purpose.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="display-md mb-3">What is loaded from elsewhere</h2>
          <div className="prose-measure text-ink-soft space-y-3">
            <p>
              Each lesson can embed one YouTube video. Those are loaded from{" "}
              <span className="data text-sm">youtube-nocookie.com</span> and
              only after you press play &mdash; until then the page holds a
              still image and no request has been made on your behalf. Once you
              press play, YouTube&rsquo;s own terms apply to that player.
            </p>
            <p>
              Nothing else on any page comes from another company. There are no
              trackers, no advertising, no fonts loaded at request time and no
              third-party scripts.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="display-md mb-3">Where the material comes from</h2>
          <p className="prose-measure text-ink-soft">
            The datasets, encyclopedia paragraphs and word vectors the games run
            on carry their own licences, and each one is named with its source
            and revision at the foot of the page that uses it.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="plate misreg btn-primary font-display inline-block px-4 py-2.5 font-bold"
          >
            Back to the start
          </Link>
          <a
            href="mailto:bpratheek122@gmail.com"
            className="plate misreg font-display inline-block px-4 py-2.5 font-bold"
          >
            Ask me about any of this
          </a>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
