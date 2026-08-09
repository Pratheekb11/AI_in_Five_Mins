"use client";

import { useWalkthroughStep } from "@/components/lesson/Walkthrough";
import { AttentionBeams } from "./AttentionBeams";

/**
 * The beams, advanced by the walkthrough rather than by their own timer.
 */
export function AttentionBeamsFigure() {
  return <AttentionBeams driven={useWalkthroughStep()} />;
}
