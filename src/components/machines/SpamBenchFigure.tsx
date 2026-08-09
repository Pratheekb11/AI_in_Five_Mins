"use client";

import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { WhatIsAI } from "./WhatIsAI";

/**
 * The spam bench, driven by the walkthrough instead of by a timer.
 */
export function SpamBenchFigure() {
  return <WhatIsAI driven={useWalkthroughStep()} />;
}
