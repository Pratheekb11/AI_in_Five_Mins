"use client";

import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { AttentionBeams } from "./AttentionBeams";

/**
 * The beams, advanced by the walkthrough rather than by their own timer.
 *
 * The five beats and the five walkthrough steps were already saying the same
 * five things, in two places, on two different clocks. Now there is one clock
 * and the reader holds it: the mask lands as the sentence about the mask
 * arrives, and the attention sink lands with its own paragraph.
 *
 * A wrapper rather than a prop from the page, because lesson pages are server
 * components and the step arrives through React context.
 */
export function AttentionBeamsFigure() {
  return <AttentionBeams driven={useWalkthroughStep()} />;
}
