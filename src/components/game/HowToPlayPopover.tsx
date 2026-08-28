"use client";

import { useEffect, useRef, useState } from "react";
import type { HowToPlay } from "./GameShell";

/**
 * Rules, reachable but never in the way. A "?" in the cabinet's corner, closed
 * by default, everywhere: the ready screen used to print this unconditionally
 * and cost a scroll before anyone could play a single round.
 */
export function HowToPlayPopover({ how }: { how: HowToPlay }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="How to play"
        className="tap border-ink/30 text-ink-faint hover:text-ink hover:border-ink flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border font-bold"
      >
        ?
      </button>

      {open ? (
        <div
          className="plate absolute top-full right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] p-3 text-left sm:w-80"
          role="dialog"
          aria-label="How to play"
        >
          <p className="label text-ink-faint mb-1">How to play</p>
          <p className="mb-2 text-[0.9375rem] font-semibold">{how.goal}</p>
          <ol className="mb-2 space-y-1">
            {how.steps.map((step, i) => (
              <li key={step} className="flex gap-2 text-[0.875rem]">
                <span className="data text-ink-faint shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {how.controls ? (
            <p className="text-ink-faint text-[0.8125rem]">
              <span className="label mr-1">Controls</span>
              {how.controls}
            </p>
          ) : null}
          {how.scoring ? (
            <p className="text-ink-faint text-[0.8125rem]">
              <span className="label mr-1">Scoring</span>
              {how.scoring}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
