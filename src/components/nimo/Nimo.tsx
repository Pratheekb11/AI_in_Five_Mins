"use client";

import dynamic from "next/dynamic";
import type { Mood } from "./moods";

/**
 * Nimo, everywhere.
 *
 * The 3D renderer is a few hundred kilobytes, so it is code-split and only
 * fetched once a Nimo is actually on screen. Until it arrives the space is held
 * open at the right size, so nothing on the page jumps when he lands.
 *
 * Server rendering is off because the renderer needs a real canvas. That is the
 * one thing about him that cannot be prerendered.
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
