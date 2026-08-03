"use client";

import { useEffect, useRef } from "react";

/**
 * A per-frame animation loop.
 *
 * Games here keep their whole moving scene in one piece of React state and
 * replace it once per frame with a pure step function. Holding it in refs and
 * forcing a repaint would be faster in principle, but reading a ref while
 * rendering is exactly what React's compiler rules forbid — and a pure
 * `advance(scene, delta)` turns out to be easier to reason about and possible
 * to unit test, which a mutable ref never was.
 *
 * `delta` is clamped: a backgrounded tab produces a multi-second frame, and
 * without the clamp everything teleports through walls on return.
 */
export function useGameLoop(
  onFrame: (delta: number) => void,
  running: boolean,
) {
  const callback = useRef(onFrame);

  // Written in an effect rather than during render — refs are not render data.
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
