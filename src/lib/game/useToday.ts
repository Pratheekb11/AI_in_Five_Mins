"use client";

import { useSyncExternalStore } from "react";

/**
 * Today's date as YYYY-MM-DD, in the reader's own timezone.
 */

function subscribe() {
  // The date does not change under us in any way worth re-rendering for. A
  // reader who leaves the tab open across midnight gets yesterday's puzzle
  // until they reload, which is the right trade for not polling a clock.
  return () => {};
}

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function useToday(): string {
  return useSyncExternalStore(subscribe, today, () => "");
}
