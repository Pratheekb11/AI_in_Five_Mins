"use client";

import type { ReactNode } from "react";
import { type Mood } from "./moods";
import { Nimo } from "./Nimo";

/**
 * Nimo with something to say.
 *
 * The guide voice across the site: a small owl and a printed speech plate. Used
 * beside walkthroughs, on loading states, and wherever a page would otherwise
 * be a blank rectangle waiting for data.
 *
 * The tail on the plate is drawn as a rotated square rather than a border
 * triangle so it inherits both the fill and the outline, and stays correct on
 * either plate.
 */
export function NimoSays({
  children,
  mood = "curious",
  size = 110,
  side = "left",
}: {
  children: ReactNode;
  mood?: Mood;
  size?: number;
  side?: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        side === "right" ? "flex-row-reverse" : ""
      }`}
    >
      <span className="shrink-0" style={{ width: size }}>
        <Nimo mood={mood} follow={false} height={size} />
      </span>

      <div className="relative min-w-0">
        <div className="border-ink/40 bg-paper-raised rounded-[3px] border px-3.5 py-2.5">
          <p className="text-[0.9375rem] leading-snug">{children}</p>
        </div>
        <span
          aria-hidden="true"
          className={`border-ink/40 bg-paper-raised absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 ${
            side === "right"
              ? "-right-1.5 border-t border-r"
              : "-left-1.5 border-b border-l"
          }`}
        />
      </div>
    </div>
  );
}
