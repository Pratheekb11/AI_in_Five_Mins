"use client";

import dynamic from "next/dynamic";
import { useNearViewport } from "@/lib/useNearViewport";
import type { Mood } from "./moods";

/**
 * Nimo, everywhere.
 */
const Nimo3D = dynamic(() => import("./Nimo3D").then((m) => m.Nimo3D), {
  ssr: false,
  loading: () => null,
});

/**
 * The renderer is not asked for until he is about to be looked at.
 *
 * He is 3D on every screen, phones included, and stays that way. What changed
 * is when the 233 KB that draws him is fetched and parsed. It used to be on
 * mount, everywhere he appeared in the markup, and most of those places are
 * not places anybody can see him: he is `hidden lg:block` in the game cabinet
 * and `hidden sm:block` in the walkthrough, so a phone was paying for two
 * WebGL contexts and two megabytes of parsed three.js to draw a mascot that
 * `display: none` was hiding the whole time. Measured at 390px on a throttled
 * phone, that alone was 6.6 seconds of blocked main thread on the home page.
 *
 * An IntersectionObserver answers both cases with one rule, because an element
 * that CSS has hidden never intersects anything: a Nimo that is off screen, on
 * a deck beat that is not the one showing, or hidden at this width, costs
 * nothing until that stops being true. The margin is generous so he is already
 * loading before he is scrolled to, and one that is on screen at first paint
 * asks for the chunk immediately, exactly as before.
 */
const NEAR = "400px";

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
  const [setFrame, wanted] = useNearViewport(NEAR);

  if (wanted) {
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

  /* The same box he will occupy, so nothing moves when he arrives, and no
     `display` of its own: the class name is what carries `hidden sm:block`,
     and an inline display would override it and undo the whole point. */
  return (
    <div ref={setFrame} className={className} style={{ height }} aria-hidden />
  );
}
