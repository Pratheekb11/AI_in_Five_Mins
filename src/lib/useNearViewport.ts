"use client";

import { useEffect, useState } from "react";

/**
 * Whether a node has come near the viewport yet, for work that should not be
 * done before somebody can see the thing it is for.
 *
 * Three of the heaviest things on this site are attached to one element each
 * and were all being fetched and run the moment their page mounted: the 233 KB
 * that draws the mascot, the 998 KB o200k vocabulary behind the two live
 * tokenizers, and a sixty-second clock. None of them were on screen. The
 * mascot is `hidden lg:block` in the game cabinet, and a lesson deck keeps
 * every beat in the DOM with `display: none` on the ones it is not showing, so
 * a reader on beat one was paying for a machine on beat five.
 *
 * An IntersectionObserver settles all of it with one rule, because an element
 * CSS has hidden never intersects anything. The answer latches: once something
 * has been near, it stays loaded, and nothing is ever torn back down.
 *
 * Returns a callback ref to put on the element, and the answer.
 */
export function useNearViewport(
  rootMargin = "300px",
): [(node: HTMLElement | null) => void, boolean] {
  /* A callback ref rather than useRef: reading a ref during render is a
     compiler error here, and the observer needs the node as state anyway. */
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near || !node) return;

    /* No observer to ask, so it is simply near. Deferred to a timer rather
       than set here: a setState in an effect body is a compiler error, and a
       timer callback is an event like any other. */
    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(id);
    }

    /* The observer's callback is an event, not effect-body work, which is why
       the state may be set from it. */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, near, rootMargin]);

  return [setNode, near];
}
