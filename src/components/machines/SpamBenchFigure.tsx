"use client";

import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { WhatIsAI } from "./WhatIsAI";

/**
 * The spam bench, driven by the walkthrough instead of by a timer.
 *
 * `WhatIsAI` already told this story on its own clock, sitting above the
 * walkthrough that then told it again in words. Two accounts of the same three
 * bars, out of step with each other, and a reader who had to work out that
 * they were the same thing.
 *
 * So the machine moved into the walkthrough and the reader advances it. One
 * bar per step, arriving as the sentence that explains it arrives. Nothing is
 * duplicated and nothing plays past you while you are still reading.
 *
 * A wrapper rather than a prop on the page, because lesson pages are server
 * components and the step arrives through React context.
 */
export function SpamBenchFigure() {
  return <WhatIsAI driven={useWalkthroughStep()} />;
}
