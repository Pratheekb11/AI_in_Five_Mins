"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Content that arrives as you reach it.
 *
 * The page was a stack of static plates: everything was already there, so
 * nothing ever felt like it was happening. This is the cheapest fix that is not
 * decoration — sections lift into place as they come into view, which gives the
 * eye somewhere to go and makes a long lesson read as a sequence rather than a
 * wall.
 *
 * It fires once. Content that re-animates every time it crosses the viewport is
 * the thing that makes people close the tab.
 *
 * Honours `prefers-reduced-motion`: with it set, children render in place with
 * no transform and no delay at all.
 */
export function Reveal({
  children,
  delay = 0,
  /** How far it travels. Small by default — this should be barely noticed. */
  distance = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
}) {
  const still = useReducedMotion();

  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
