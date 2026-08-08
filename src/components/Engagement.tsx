"use client";

import { useEffect, useRef } from "react";
import { trackTimeOnPage } from "@/lib/telemetry";

/**
 * How long a page actually held somebody, and how far down they got.
 *
 * Time on page is usually measured as the gap between two page views, which
 * counts a tab left open over lunch as an hour of rapt attention and counts
 * the last page of a visit as zero. Neither is useful for deciding whether a
 * chapter is working.
 *
 * So this counts only the time the tab was visible, pausing when the reader
 * switches away and resuming when they come back, and reports once on the way
 * out. It also reports the furthest section they reached, because five minutes
 * spent above the game means something quite different from five minutes that
 * ended at the check.
 *
 * The report goes out on `pagehide` rather than `beforeunload`: mobile Safari
 * frequently never fires the latter, which is exactly where a bounce is most
 * likely. `visibilitychange` covers the case of a tab closed while hidden.
 */

/** Sections, in the order a reader meets them, matched on the page's own DOM. */
const MARKERS: { id: string; match: string }[] = [
  { id: "game", match: "[data-section='game']" },
  { id: "walkthrough", match: "[data-section='walkthrough']" },
  { id: "deeper", match: "[data-section='deeper']" },
  { id: "check", match: "[data-section='check']" },
];

export function Engagement({ page }: { page: string }) {
  const visibleSince = useRef<number | null>(null);
  const total = useRef(0);
  const deepest = useRef("top");
  const reported = useRef(false);

  useEffect(() => {
    // Refs are only ever touched from inside effects and listeners, never
    // during render, which the React compiler will not allow.
    visibleSince.current =
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? Date.now()
        : null;
    total.current = 0;
    deepest.current = "top";
    reported.current = false;

    function stopCounting() {
      if (visibleSince.current === null) return;
      total.current += Date.now() - visibleSince.current;
      visibleSince.current = null;
    }

    function report() {
      if (reported.current) return;
      stopCounting();
      reported.current = true;
      trackTimeOnPage(page, total.current / 1000, deepest.current);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        if (visibleSince.current === null) visibleSince.current = Date.now();
      } else {
        stopCounting();
        // A tab closed while hidden never fires pagehide in some browsers, so
        // the number is banked here rather than risked.
        report();
      }
    }

    /**
     * The furthest named section the reader actually got to.
     *
     * Deliberately not a scroll-depth percentage. A percentage of a page whose
     * length varies with the reader's own answers is not comparable between
     * two readers, and "reached the check" is the thing worth knowing anyway.
     */
    const observed = MARKERS.map((marker) => ({
      marker,
      node: document.querySelector(marker.match),
    })).filter(
      (entry): entry is { marker: (typeof MARKERS)[number]; node: Element } =>
        Boolean(entry.node),
    );

    /* A section counts as reached once a quarter of it has been on screen.
       An earlier version marked the section crossing the middle of the
       viewport, which is a tidier definition and answers the wrong question:
       a reader who jumps to an anchor, or flicks quickly on a phone, passes
       straight over sections without any of them ever being centred, and the
       page reported that nobody got past the top. */
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const hit = observed.find((o) => o.node === entry.target);
          if (!hit) continue;
          const order = MARKERS.map((m) => m.id);
          if (order.indexOf(hit.marker.id) > order.indexOf(deepest.current)) {
            deepest.current = hit.marker.id;
          }
        }
      },
      { threshold: 0.25 },
    );
    for (const entry of observed) observer.observe(entry.node);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
      observer.disconnect();
      // Leaving by an internal link is the commonest exit on this site, and it
      // unmounts rather than unloading, so the report happens here too.
      report();
    };
  }, [page]);

  return null;
}
