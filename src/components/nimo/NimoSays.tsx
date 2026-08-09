"use client";

import type { ReactNode } from "react";
import { type Mood } from "./moods";
import { Nimo } from "./Nimo";

/**
 * Nimo with something to say.
 */
export function NimoSays({
  children,
  mood = "curious",
  size = 110,
  side = "left",
  follow = false,
}: {
  children: ReactNode;
  mood?: Mood;
  size?: number;
  side?: "left" | "right";
  /** Watch the cursor. Worth it where he is the thing you look at first. */
  follow?: boolean;
}) {
  return (
    /* Owl and plate sit side by side once there is room for both. On a phone
       that split left the plate about three words wide, so below the small
       breakpoint he stands above what he is saying instead. */
    <div
      className={`flex flex-col items-start gap-2 sm:flex-row sm:items-center ${
        side === "right" ? "sm:flex-row-reverse" : ""
      }`}
    >
      <span className="shrink-0" style={{ width: size }}>
        <Nimo mood={mood} follow={follow} height={size} />
      </span>

      <div className="relative w-full min-w-0 sm:w-auto">
        <div className="border-ink/40 bg-paper-raised rounded-[3px] border px-3.5 py-2.5">
          <p className="text-[0.9375rem] leading-snug">{children}</p>
        </div>
        <span
          aria-hidden="true"
          className={`border-ink/40 bg-paper-raised absolute top-1/2 hidden h-3 w-3 -translate-y-1/2 rotate-45 sm:block ${
            side === "right"
              ? "-right-1.5 border-t border-r"
              : "-left-1.5 border-b border-l"
          }`}
        />
      </div>
    </div>
  );
}
