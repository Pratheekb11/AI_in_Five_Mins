"use client";

import { useEffect, useRef } from "react";

/**
 * A per-frame animation loop.
 *
 * `hz` caps how often the callback is actually called, for a loop whose state
 * is not worth a frame. It defaults to zero, which is every frame, and that is
 * what a moving board wants. A clock printed in whole seconds does not: it was
 * committing a new scene sixty times a second to change a number once, which
 * re-renders everything the scene draws, sixty times, to no visible end. The
 * delta handed over is the whole interval since the last call, so a slower
 * loop measures exactly the same elapsed time as a per-frame one.
 */
export function useGameLoop(
  onFrame: (delta: number) => void,
  running: boolean,
  hz = 0,
) {
  const callback = useRef(onFrame);

  // Written in an effect rather than during render, refs are not render data.
  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let last = performance.now();
    /* Time gathered since the last call, so nothing is lost between them. */
    let owed = 0;
    const step = hz > 0 ? 1 / hz : 0;

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      owed += delta;
      if (owed >= step) {
        callback.current(owed);
        owed = 0;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, hz]);
}
