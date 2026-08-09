"use client";

/**
 * Everything this browser remembers about a learner, in one place.
 */

import { RECORD_KEYS } from "./storageKeys";

export { KEPT_KEYS, RECORD_KEYS } from "./storageKeys";

export function clearLocalRecord() {
  for (const key of RECORD_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Private mode, or storage full. Nothing to clear and nothing to say.
    }
  }
  /* The stores that read these keys listen for `storage`, which only fires in
     OTHER tabs. This one has to be told. */
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("llai-name-change"));
}
