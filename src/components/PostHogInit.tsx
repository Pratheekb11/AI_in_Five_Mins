"use client";

import { useEffect } from "react";
import { startPostHog } from "@/lib/posthog";

/**
 * Starts PostHog once the page has stopped being busy.
 *
 * Renders nothing. It waits for an idle callback rather than loading on mount
 * because the first few seconds after paint are exactly when somebody is
 * pressing the button, and this site has already paid once for filling that
 * window with work nobody asked for. Nothing is lost by waiting: events fired
 * in the meantime queue in `posthog.ts` and go out when it lands.
 */
export function PostHogInit() {
  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (!cancelled) void startPostHog();
    };

    // Safari has no requestIdleCallback; a timeout is the same intent.
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      const handle = idle(start, { timeout: 4000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(handle);
      };
    }
    const timer = window.setTimeout(start, 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
