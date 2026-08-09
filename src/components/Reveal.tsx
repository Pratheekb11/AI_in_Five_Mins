"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Content that arrives as you reach it.
 */
export function Reveal({
  children,
  delay = 0,
  /** How far it travels. Small by default, this should be barely noticed. */
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
