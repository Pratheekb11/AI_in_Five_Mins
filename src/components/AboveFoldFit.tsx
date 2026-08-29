"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scales the homepage's hero-plus-game block down until it fits one real
 * viewport, on a phone. Same trick as the lesson deck's `FitBox`, CSS
 * `zoom`, down only, a floor below which a short scroll beats small type,
 * but measured against `window.innerHeight` directly rather than a deck's
 * scroll port, since the homepage is an ordinary scrolling page. A real
 * phone's usable height (browser chrome included) is well under the 844px a
 * device-width viewport suggests, so this is not optional polish.
 */
const FLOOR = 0.62;

export function AboveFoldFit({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const scale = useRef(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.innerWidth >= 640) return; // Desktop never needed this room.

    let frame = 0;
    let against = "";

    function fit() {
      const el = box.current;
      if (!el) return;
      const screen = `${window.innerWidth}x${window.innerHeight}`;
      if (screen !== against) {
        against = screen;
        if (scale.current !== 1) {
          scale.current = 1;
          el.style.zoom = "";
          el.style.removeProperty("--fit-zoom");
        }
      }

      const room = window.innerHeight;
      for (let i = 0; i < 6; i++) {
        const need = el.getBoundingClientRect().bottom;
        if (need <= 0) return;
        if (need <= room + 1) break;
        if (scale.current <= FLOOR) break;
        const next = Math.max(FLOOR, scale.current * (room / need));
        if (next > scale.current - 0.004) break;
        scale.current = next;
        el.style.zoom = String(next);
        // See FitBox: `.tap`'s own 44px minimum is inside this zoom too, so
        // it needs the current scale to compensate against.
        el.style.setProperty("--fit-zoom", String(next));
      }
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        fit();
      });
    }

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    schedule();
    window.addEventListener("resize", schedule);
    // A web font swapping in after first paint reflows the text without
    // necessarily firing the observer in time to catch it before someone
    // looks. Fit again once the real fonts are actually in.
    document.fonts?.ready?.then(schedule).catch(() => {});
    // Belt and braces for the first couple of seconds: hydration, the sound
    // toggle's stored-preference read and the mascot's own mount can all
    // still be settling the layout after the observer's first pass.
    const poll = window.setInterval(schedule, 150);
    const stopPolling = window.setTimeout(() => window.clearInterval(poll), 4000);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.clearInterval(poll);
      window.clearTimeout(stopPolling);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={box} data-fit="">
      {children}
    </div>
  );
}
