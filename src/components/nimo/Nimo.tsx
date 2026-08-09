"use client";

import dynamic from "next/dynamic";
import type { Mood } from "./moods";

/**
 * Nimo, everywhere.
 *
 * The 3D renderer is code-split and only fetched once a Nimo is actually on
 * screen, and server rendering is off because it needs a real canvas.
 *
 * MEASURED, so the cost is at least known: the renderer's chunk is 232 KB
 * gzipped, which is more than half the JavaScript a lesson page downloads —
 * the privacy page, the only one without him, ships 212 KB against a lesson's
 * 460 KB. It is paid on every device, phones included, because he is the
 * character of the site rather than an ornament on it and a flat stand-in on
 * the screen most people arrive on is the wrong trade. `NimoFlat` exists for
 * the one case where there is no choice: a device that refuses a WebGL
 * context at all, where the alternative is no otter.
 */
const Nimo3D = dynamic(() => import("./Nimo3D").then((m) => m.Nimo3D), {
  ssr: false,
  loading: () => null,
});

export function Nimo({
  mood = "idle",
  follow = true,
  height = 260,
  className = "",
  interactive = true,
}: {
  mood?: Mood;
  follow?: boolean;
  height?: number;
  className?: string;
  /** Press him for a wave, hold him for a spin. Off where he is scenery. */
  interactive?: boolean;
}) {
  return (
    <Nimo3D
      mood={mood}
      follow={follow}
      height={height}
      className={className}
      interactive={interactive}
    />
  );
}
