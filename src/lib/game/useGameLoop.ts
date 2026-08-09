"use client";

import { useEffect, useRef } from "react";

/**
 * A per-frame animation loop.
 */
export function useGameLoop(
  onFrame: (delta: number) => void,
  running: boolean,
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

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      callback.current(delta);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
}
