"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query as a value. `useSyncExternalStore` rather than state in an
 * effect: the React Compiler rejects a `setState` in an effect body, and this
 * is exactly the shape that store is for, an outside thing the render reads.
 *
 * The server render answers `false`, so anything keyed on this must be a
 * refinement of the wide layout rather than the only way to reach something.
 */
export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below Tailwind's `sm`. A phone held in the hand, in practice. */
export function useIsPhone(): boolean {
  return useMedia("(max-width: 639px)");
}
