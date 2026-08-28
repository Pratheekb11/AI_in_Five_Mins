"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fits a beat to the screen it is on.
 *
 * The deck's promise is one screenful per tap. A beat that runs past the
 * bottom breaks it: the reader has to scroll to reach the thing they were
 * asked to do, which is the exact attention cost the deck exists to remove.
 *
 * So the beat is scaled down until it fits. CSS `zoom` rather than
 * `transform: scale`, deliberately, for two reasons. Zoom relayouts instead of
 * squashing, so a paragraph rewraps at the wider box and loses lines rather
 * than getting thin — the beat usually ends up shorter than the scale factor
 * alone would predict. And a transformed ancestor stops `sticky` working for
 * everything inside it, which is what pins a walkthrough's own controls.
 *
 * There is a floor. Below it, small type is a worse answer than a short
 * scroll, so the beat is left to scroll.
 */

/**
 * How far a beat may be scaled before scrolling becomes the better answer.
 *
 * A phone gets the deep floor: the alternative there is scrolling past the
 * thing you were asked to do, and the reflow that comes with zoom buys back
 * most of what the smaller type costs. A wide screen gets a shallow one. There
 * the beat nearly always fits already, so this is a nudge that closes the last
 * few per cent, and a laptop reader should never be handed small type to save
 * a scroll they were not going to notice.
 */
const FLOOR_PHONE = 0.6;
const FLOOR_WIDE = 0.85;

export function FitBox({
  active,
  enabled = true,
  children,
}: {
  /** Only the beat on screen is measured; the rest are `display: none`. */
  active: boolean;
  /**
   * Off for a beat that is honestly long — the closing screen carries every
   * fold on the page and is meant to be read down.
   */
  enabled?: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const scale = useRef(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;

    if (!active || !enabled) {
      /* Leave nothing behind: a hidden beat keeps its zoom otherwise, and the
         next measurement of it would start from the wrong place. */
      el.style.zoom = "";
      el.style.removeProperty("--fit-zoom");
      scale.current = 1;
      return;
    }

    const port = el.closest<HTMLElement>("[data-stage-port]");
    const pad = port?.querySelector<HTMLElement>("[data-stage-pad]");
    if (!port || !pad) return;

    let frame = 0;
    /* The size of the screen this scale was decided against. A different
       screen — a rotation, a resized window — is a new question, and only then
       is the beat allowed to start again from full size. */
    let against = "";

    /* Incremental on purpose. Resetting the zoom to 1 in order to measure
       would be a style write on every pass, the observer would see it, and the
       two would drive each other forever. Each pass instead nudges the current
       scale towards a fit and stops once it fits.

       The beat is measured with `getBoundingClientRect`, which is in screen
       pixels whatever the zoom is. The scroll port cannot be measured instead:
       its content is `min-h-full`, so its scrollHeight is pinned to its own
       height and a beat with room to spare looks exactly like one that fits
       exactly.

       Down only, and that is the whole trick. A beat is not one height: a game
       grows when it reveals an answer and shrinks again on the next round, a
       walkthrough changes with every step. Scaling back up for the short state
       means scaling down again for the tall one, and the reader watches the
       page jump on every single answer. So the scale a beat settles on is the
       one its TALLEST state needed, and it holds there until the screen
       itself changes. */
    function fit() {
      const el = box.current;
      if (!el || !port || !pad || el.offsetParent === null) return;

      const screen = `${port.clientWidth}x${port.clientHeight}`;
      if (screen !== against) {
        against = screen;
        if (scale.current !== 1) {
          scale.current = 1;
          el.style.zoom = "";
          el.style.removeProperty("--fit-zoom");
        }
      }

      const floor = port.clientWidth < 640 ? FLOOR_PHONE : FLOOR_WIDE;
      const cs = getComputedStyle(pad);
      const room =
        port.clientHeight -
        parseFloat(cs.paddingTop) -
        parseFloat(cs.paddingBottom);
      if (room <= 0) return;

      for (let i = 0; i < 6; i++) {
        const need = el.getBoundingClientRect().height;
        if (need <= 0) return;
        if (need <= room + 1) break;
        if (scale.current <= floor) break;

        const next = Math.max(floor, scale.current * (room / need));
        if (next > scale.current - 0.004) break;
        scale.current = next;
        el.style.zoom = String(next);
        /* `zoom` scales everything inside it uniformly, including a
           `.tap::after` pseudo-element's own hardcoded 44px minimum — so a
           beat scaled to 0.6 was quietly handing out a 26px real tap target
           while believing it had fixed one. `.tap` reads this back to
           compensate. */
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

    /* Two things move: the screen, and the beat itself — a game changes height
       between rounds, a walkthrough between steps. */
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    ro.observe(port);
    schedule();

    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active, enabled]);

  return (
    <div ref={box} data-fit="" className="min-w-0">
      {children}
    </div>
  );
}
