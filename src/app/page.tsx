import Link from "next/link";
import { AboveFoldFit } from "@/components/AboveFoldFit";
import { AiPathLine } from "@/components/AiPathLine";
import { BeatThePredictor } from "@/components/games/BeatThePredictor";
import { Engagement } from "@/components/Engagement";
import { MlPathTeaser } from "@/components/MlPathTeaser";
import { NimoSays } from "@/components/nimo/NimoSays";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TodaysPuzzleCard } from "@/components/TodaysPuzzleCard";
import type { HuntData } from "@/lib/game/hunt";
import { getLesson, lessonsIn } from "@/lib/lessons";
import {
  start as dealPredictor,
  type PredictorData,
} from "@/lib/game/predictor";
import { readGameData } from "@/lib/server/gameData";

/* Read and dealt server-side, same as the chapter-one page: the very first
   HTML this route sends already has a live, playable round, above the fold,
   with nothing to click through first. */
const predictorData = readGameData<PredictorData>("predictor.json");
const initialScene = dealPredictor(
  predictorData,
  Array.from({ length: 120 }, () => Math.random()),
);
const huntData = readGameData<HuntData>("hunt.json");

export default function Home() {
  const chapters = lessonsIn("chapter");
  const chapterMinutes = chapters.reduce((n, l) => n + l.minutes, 0);
  const first = getLesson(chapters[0].slug)!;

  return (
    <>
      <Engagement page="home" />
      <SiteHeader />

      <main id="content">
        {/* Above the fold on a phone: one headline, one line of subcopy, one
            playable game, stacked, nothing else competing with it. From lg up
            there is room for both at once, so the game sits beside the pitch
            instead of under a headline-width column of bare paper. */}
        <section className="mx-auto max-w-6xl px-5 pt-6 pb-10 sm:pt-10 sm:pb-14 md:pt-14">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="max-w-2xl">
              <h1 className="display-xl mb-2 sm:mb-3">
                Stop guessing
                <br />
                what AI is
                <br />
                <span className="text-pink-text">actually doing.</span>
              </h1>
              <p className="text-ink-soft mb-4 text-lg sm:mb-6">
                Play one round against a real language model. No sign-up,
                nothing to read first.
              </p>
              <Link
                href={`/lessons/${first.slug}`}
                className="plate misreg btn-primary font-display inline-block px-5 py-3 font-bold"
              >
                Take the whole chapter →
              </Link>
              <div className="mt-8 hidden lg:block">
                <NimoSays mood="curious" size={72}>
                  I am Nimo. Before anyone explains anything to you, play one
                  round against a real model and see how you do.
                </NimoSays>
              </div>
            </div>

            <div className="max-w-2xl lg:max-w-none">
              <AboveFoldFit>
                <BeatThePredictor
                  initialData={predictorData}
                  initialScene={initialScene}
                />
              </AboveFoldFit>
            </div>
          </div>
        </section>

        {/* The path and the daily puzzle, side by side from lg up, both are
            "what's next", not a linear read, so pairing them uses the width
            instead of stacking two full-bleed bands. */}
        <section
          id="puzzle"
          className="border-ink/25 bg-paper-sunk scroll-mt-20 border-t"
        >
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-2xl lg:max-w-none">
                <Reveal>
                  <p className="label text-ink-faint mb-3">The AI path</p>
                  <h2 className="display-lg mb-2">
                    Six chapters, about {chapterMinutes} minutes.
                  </h2>
                  <p className="prose-measure text-ink-soft mb-9">
                    One idea and one game per chapter. Every game makes you
                    commit to a guess before it shows you what a real model
                    actually did.
                  </p>
                </Reveal>
                <Reveal delay={0.08}>
                  <AiPathLine />
                </Reveal>
              </div>
              <div className="max-w-2xl lg:max-w-none">
                <Reveal delay={0.04}>
                  <TodaysPuzzleCard initialData={huntData} />
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* The ML path and "why this exists" paired the same way, two short
            pitches that don't need to be read in order. */}
        <section className="border-ink/25 border-t">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-2xl lg:max-w-none">
                <Reveal>
                  <p className="label text-ink-faint mb-3">
                    If you want to build them
                  </p>
                  <h2 className="display-lg mb-4">
                    The craft underneath it.
                  </h2>
                </Reveal>
                <Reveal delay={0.06}>
                  <MlPathTeaser />
                </Reveal>
              </div>
              <div className="max-w-2xl lg:max-w-none">
                <Reveal>
                  <p className="label text-ink-faint mb-3">Why this exists</p>
                  <h2 className="display-lg prose-measure mb-4">
                    Everyone is using these tools. Almost nobody was shown how
                    they work.
                  </h2>
                  <div className="prose-measure text-ink-soft space-y-3">
                    <p>
                      So most of the advice going around is guesswork. A magic
                      phrase that is meant to unlock better answers. A rule
                      that you should never trust it with anything that
                      matters. A vague sense that it thinks the way a
                      colleague does. All of it falls apart the moment you
                      watch one of these models work.
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <section className="border-ink/25 bg-paper-sunk border-t">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="display-md mb-3">Where the numbers come from</h2>
            <p className="prose-measure text-ink-soft mb-6">
              Every token, vector and probability here is computed from a real
              model or a published dataset, and every page ends with the
              sources it drew on. If a number cannot be traced, it does not
              ship.
            </p>
            <Link
              href="/curriculum"
              className="label underline underline-offset-2"
            >
              See everything: all four tracks, 25 modules
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
