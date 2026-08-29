"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { HowToPlay } from "./GameShell";

/**
 * Rules, reachable but never in the way. A "?" in the cabinet's corner, closed
 * by default, everywhere: the ready screen used to print this unconditionally
 * and cost a scroll before anyone could play a single round.
 *
 * Portalled to the body rather than positioned inside the cabinet: the
 * cabinet clips its own overflow for the riso plate effect, so a panel
 * anchored inside it could only ever drop down and cover the round in
 * progress. Fixed-positioned in the viewport instead, it opens into the
 * open margin beside the cabinet when there is room, and only falls back
 * to covering anything if the viewport genuinely has nowhere else to put it.
 */
const PANEL_W = 320;
const GAP = 8;
const EDGE = 16;

export function HowToPlayPopover({ how }: { how: HowToPlay }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const roomRight = window.innerWidth - rect.right - GAP - EDGE;
      const left =
        roomRight >= PANEL_W
          ? rect.right + GAP
          : Math.max(EDGE, Math.min(rect.right - PANEL_W, window.innerWidth - PANEL_W - EDGE));
      const top =
        roomRight >= PANEL_W
          ? rect.top
          : rect.bottom + GAP;
      setPos({ top, left });
    }

    /* Re-placed on resize (rare, not continuous), but closed rather than
       chased on scroll, a fixed panel driven by a JS scroll listener lags a
       frame or more behind native touch-scroll momentum on a phone, which
       reads as the panel "sliding" independently of the button it is meant
       to be attached to. Closing is instant and never looks wrong. */
    place();
    function onScroll() {
      setOpen(false);
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
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
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="How to play"
        className="tap border-ink/30 text-ink-faint hover:text-ink hover:border-ink flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border font-bold"
      >
        ?
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="plate fixed z-40 w-72 max-w-[calc(100vw-2rem)] p-3 text-left sm:w-80"
              style={{ top: pos.top, left: pos.left }}
              role="dialog"
              aria-label="How to play"
            >
              <p className="label text-ink-faint mb-1">How to play</p>
              <p className="mb-2 text-[0.9375rem] font-semibold">
                {how.goal}
              </p>
              <ol className="mb-2 space-y-1">
                {how.steps.map((step, i) => (
                  <li key={step} className="flex gap-2 text-[0.875rem]">
                    <span className="data text-ink-faint shrink-0">
                      {i + 1}.
                    </span>
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
