"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` fires before the browser paints, so a client-only
 * randomised setup (dealing a round, picking a reel) can land before anyone
 * sees the pre-interactive state. On the server it would just warn, so SSR
 * falls back to `useEffect`.
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
