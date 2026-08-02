"use client";

import { type Mood, POSES } from "./moods";

/**
 * Nimo, printed.
 *
 * The same owl as the 3D model — teal feathers, cream facial disc, amber beak,
 * round dark glasses, perched on a stack of books — redrawn as flat shapes with
 * hard outlines so he belongs on the page rather than sitting on top of it.
 *
 * Used where the 3D renderer would be too much — small inline appearances and
 * loading states. He costs nothing here.
 *
 * His colours are literal, not theme variables. An owl does not change species
 * between light and dark mode, and painting his cream belly with `--paper`
 * turned him into a dark smudge on the dark plate.
 *
 * Moods move the head, wings and lids rather than swapping a face, so the same
 * drawing carries every expression.
 */

export function NimoFlat({
  mood = "idle",
  size = 96,
  className = "",
  showPerch = true,
}: {
  mood?: Mood;
  size?: number;
  className?: string;
  /** The book stack. Dropped when he is inline beside text. */
  showPerch?: boolean;
}) {
  const pose = POSES[mood];
  const lid = pose.lids;

  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={className}
      role="img"
      aria-label={`Nimo the owl, ${mood}`}
    >
      <defs>
        <pattern
          id="nimo-dots"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <circle cx="1" cy="1" r="0.9" fill="#1a1a1a" fillOpacity="0.16" />
        </pattern>
      </defs>

      <g
        style={{
          transform: `translateY(${-pose.bounce * 90}px)`,
          transition: "transform 380ms cubic-bezier(.2,.8,.3,1)",
        }}
      >
        {/* ---------------------------------------------------------- body -- */}
        {/* tail */}
        <path
          d="M60 108 L48 126 L72 126 Z"
          fill="#2f6f6a"
          stroke="#1a1a1a"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* wings — they lift with the mood */}
        {[-1, 1].map((side) => (
          <g
            key={side}
            style={{
              transformOrigin: `${60 + side * 22}px 86px`,
              transform: `rotate(${side * (18 + pose.wings * 46)}deg)`,
              transition: "transform 320ms cubic-bezier(.2,.8,.3,1)",
            }}
          >
            <ellipse
              cx={60 + side * 26}
              cy={92}
              rx="11"
              ry="21"
              fill="#2f6f6a"
              stroke="#1a1a1a"
              strokeWidth="2.4"
            />
            <ellipse
              cx={60 + side * 26}
              cy={92}
              rx="11"
              ry="21"
              fill="url(#nimo-dots)"
            />
          </g>
        ))}

        {/* torso */}
        <ellipse
          cx="60"
          cy="90"
          rx="30"
          ry="32"
          fill="#2f6f6a"
          stroke="#1a1a1a"
          strokeWidth="2.6"
        />
        <ellipse cx="60" cy="90" rx="30" ry="32" fill="url(#nimo-dots)" />

        {/* cream belly */}
        <ellipse
          cx="60"
          cy="95"
          rx="19"
          ry="24"
          fill="#f6ead6"
          stroke="#1a1a1a"
          strokeWidth="2"
        />

        {/* feet */}
        {showPerch
          ? [-1, 1].map((side) => (
              <ellipse
                key={side}
                cx={60 + side * 11}
                cy="121"
                rx="8"
                ry="4.5"
                fill="#e8912f"
                stroke="#1a1a1a"
                strokeWidth="2"
              />
            ))
          : null}

        {/* ---------------------------------------------------------- head -- */}
        <g
          style={{
            transformOrigin: "60px 58px",
            transform: `rotate(${pose.tilt}deg) translateY(${-pose.nod * 0.16}px)`,
            transition: "transform 320ms cubic-bezier(.2,.8,.3,1)",
          }}
        >
          {/* ear tufts */}
          {[-1, 1].map((side) => (
            <path
              key={side}
              d={`M${60 + side * 15} 33 L${60 + side * 23} 16 L${60 + side * 27} 36 Z`}
              fill="#2f6f6a"
              stroke="#1a1a1a"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          ))}

          {/* skull */}
          <circle
            cx="60"
            cy="52"
            r="30"
            fill="#2f6f6a"
            stroke="#1a1a1a"
            strokeWidth="2.6"
          />
          <circle cx="60" cy="52" r="30" fill="url(#nimo-dots)" />

          {/* facial disc */}
          <ellipse
            cx="60"
            cy="56"
            rx="24"
            ry="21"
            fill="#f6ead6"
            stroke="#1a1a1a"
            strokeWidth="2"
          />

          {/* eyes behind the glasses */}
          {[-1, 1].map((side) => (
            <g key={side}>
              <circle
                cx={60 + side * 11}
                cy="52"
                r="8.5"
                fill="#ffffff"
                stroke="#1a1a1a"
                strokeWidth="1.8"
              />
              <circle
                cx={60 + side * 11}
                cy={52 + pose.nod * 0.06}
                r="4.2"
                fill="#1a1a1a"
              />
              <circle
                cx={60 + side * 11 + 1.6}
                cy="50"
                r="1.5"
                fill="#ffffff"
              />
              {/* eyelid — drops for wince and think */}
              {lid > 0.02 ? (
                <path
                  d={`M${60 + side * 11 - 8.5} 52 a8.5 8.5 0 0 1 17 0 Z`}
                  fill="#2f6f6a"
                  stroke="#1a1a1a"
                  strokeWidth="1.6"
                  style={{
                    transformOrigin: `${60 + side * 11}px 52px`,
                    transform: `scaleY(${lid * 2})`,
                    transition: "transform 240ms ease",
                  }}
                />
              ) : null}
            </g>
          ))}

          {/* round glasses, drawn over the eyes */}
          {[-1, 1].map((side) => (
            <circle
              key={side}
              cx={60 + side * 11}
              cy="52"
              r="11"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.4"
            />
          ))}
          <line
            x1="49"
            y1="52"
            x2="71"
            y2="52"
            stroke="#1a1a1a"
            strokeWidth="2.2"
          />
          {[-1, 1].map((side) => (
            <line
              key={side}
              x1={60 + side * 22}
              y1="52"
              x2={60 + side * 30}
              y2="49"
              stroke="#1a1a1a"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}

          {/* beak — opens on cheer and celebrate */}
          <path
            d={
              pose.beak > 0.4
                ? "M54 66 L66 66 L60 78 Z"
                : "M55 65 L65 65 L60 73 Z"
            }
            fill="#e8912f"
            stroke="#1a1a1a"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </g>

        {/* --------------------------------------------------------- perch -- */}
        {showPerch ? (
          <g>
            {[
              { y: 132, w: 46, ink: "var(--pink)" },
              { y: 126, w: 41, ink: "var(--blue)" },
            ].map((book) => (
              <g key={book.y}>
                <rect
                  x={60 - book.w / 2}
                  y={book.y}
                  width={book.w}
                  height="6"
                  fill={book.ink}
                  stroke="#1a1a1a"
                  strokeWidth="2"
                />
                <rect
                  x={60 - book.w / 2 + 2}
                  y={book.y + 1.5}
                  width={book.w - 4}
                  height="3"
                  fill="#f6ead6"
                />
              </g>
            ))}
          </g>
        ) : null}
      </g>
    </svg>
  );
}
