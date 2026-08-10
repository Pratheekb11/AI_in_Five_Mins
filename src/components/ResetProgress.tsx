"use client";

import { useState } from "react";
import { clearLocalRecord } from "@/lib/reset";
import { useProgress } from "@/lib/progress";

/**
 * Wipe everything and start again.
 */
export function ResetProgress() {
  const { totals, reset } = useProgress();
  const [asking, setAsking] = useState(false);

  // Nothing to reset, nothing to offer. The button appears with the pill.
  if (totals.xp === 0) return null;

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="tap label text-ink-faint hover:text-ink hover:border-ink border-ink/30 cursor-pointer rounded-[2px] border px-2 py-1"
        title={`Erase level ${totals.level} and all ${totals.completedCount} finished chapters from this browser`}
      >
        Reset
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="label text-ink-faint hidden sm:inline">Erase all?</span>
      <button
        type="button"
        onClick={() => {
          reset();
          clearLocalRecord();
          setAsking(false);
        }}
        className="label border-pink text-pink-text hover:bg-pink-wash cursor-pointer rounded-[2px] border px-2 py-1"
      >
        Erase
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="label text-ink-faint hover:text-ink cursor-pointer px-1 py-1"
      >
        Keep
      </button>
    </span>
  );
}
