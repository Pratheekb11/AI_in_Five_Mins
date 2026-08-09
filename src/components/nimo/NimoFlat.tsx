import type { Mood } from "./moods";

/**
 * Nimo, flat.
 *
 * The 3D one is a real renderer, and measured on the production build it is
 * **232 KB gzipped on every page he appears on** — more than half the
 * JavaScript a lesson downloads, for a mascot. That is a fine trade on a
 * laptop and a bad one on a phone on mobile data, so below `sm` this is the
 * one that ships and the renderer is never fetched at all.
 *
 * The geometry is the same otter, ported from `drawNimo` in `certificate.ts`,
 * which already had to draw him with primitives for the certificate plate.
 * Round head, glasses, whiskers, a tail out to his left and a stack of books
 * under him.
 *
 * His colours are literal hex and never theme variables. Painting his cream
 * belly with `--paper-raised` once turned him into a dark smudge in dark mode;
 * an otter does not change species between themes.
 *
 * A mood moves his brow and his mouth and nothing else. There is no animation
 * here on purpose: this is the cheap one.
 */

const BROWN = "#7a6552";
const BROWN_DARK = "#57453a";
const FACE = "#efe6d2";
const WHITE = "#fffdf6";
const NOSE = "#1c1712";
const FRAME = "#2a2a2a";
const BOOK = "#dd2a72";
const BOOK_TEAL = "#009180";

/** Brow angle and mouth curve per mood, in the same units as the drawing. */
const FACE_BY_MOOD: Record<Mood, { brow: number; smile: number }> = {
  idle: { brow: 0, smile: 0.02 },
  curious: { brow: -8, smile: 0.03 },
  think: { brow: -14, smile: 0 },
  cheer: { brow: 6, smile: 0.06 },
  celebrate: { brow: 10, smile: 0.07 },
  wince: { brow: 14, smile: -0.03 },
};

export function NimoFlat({
  mood = "idle",
  height = 110,
  className = "",
}: {
  mood?: Mood;
  height?: number;
  className?: string;
}) {
  const { brow, smile } = FACE_BY_MOOD[mood] ?? FACE_BY_MOOD.idle;

  /* One unit is the same `s` the canvas version scales by, so every number
     below can be read straight across from `drawNimo`. */
  const s = 100;
  const cx = 0;
  const cy = 0;

  return (
    <svg
      /* Tall enough for the whole book stack: the lowest book runs to 1.06
         units and a box that stopped at 0.85 sliced it in half. */
      viewBox="-90 -105 180 222"
      height={height}
      className={className}
      role="img"
      aria-label="Nimo, a small otter in round glasses, sitting on a stack of books"
    >
      {/* Books first: he sits on them. */}
      <rect x={-0.6 * s} y={0.94 * s} width={1.2 * s} height={0.12 * s} fill={BOOK} />
      <rect x={-0.55 * s} y={0.81 * s} width={1.1 * s} height={0.12 * s} fill={BOOK_TEAL} />
      <rect x={-0.5 * s} y={0.68 * s} width={1.0 * s} height={0.12 * s} fill={BOOK} />

      {/* Tail, out to his left, so the silhouette says otter. */}
      <ellipse
        cx={0}
        cy={0}
        rx={0.34 * s}
        ry={0.13 * s}
        fill={BROWN_DARK}
        transform={`translate(${cx - 0.52 * s} ${cy + 0.3 * s}) rotate(-28.6)`}
      />

      {/* Body, belly, feet. */}
      <ellipse cx={cx} cy={cy + 0.24 * s} rx={0.52 * s} ry={0.546 * s} fill={BROWN} />
      <ellipse cx={cx} cy={cy + 0.3 * s} rx={0.34 * s} ry={0.391 * s} fill={FACE} />
      <ellipse cx={cx - 0.34 * s} cy={cy + 0.62 * s} rx={0.15 * s} ry={0.09 * s} fill={BROWN_DARK} />
      <ellipse cx={cx + 0.34 * s} cy={cy + 0.62 * s} rx={0.15 * s} ry={0.09 * s} fill={BROWN_DARK} />

      {/* Ears, then head, then muzzle. */}
      <circle cx={cx - 0.4 * s} cy={cy - 0.52 * s} r={0.13 * s} fill={BROWN_DARK} />
      <circle cx={cx + 0.4 * s} cy={cy - 0.52 * s} r={0.13 * s} fill={BROWN_DARK} />
      <ellipse cx={cx} cy={cy - 0.34 * s} rx={0.46 * s} ry={0.432 * s} fill={BROWN} />
      <ellipse cx={cx} cy={cy - 0.22 * s} rx={0.3 * s} ry={0.216 * s} fill={FACE} />

      {/* Whiskers, under the glasses so the frames read on top. */}
      {[-1, 1].map((side) =>
        [0, 1, 2].map((i) => (
          <line
            key={`${side}-${i}`}
            x1={cx + side * 0.06 * s}
            y1={cy - 0.18 * s + i * 0.035 * s}
            x2={cx + side * 0.42 * s}
            y2={cy - 0.26 * s + i * 0.07 * s}
            stroke={FACE}
            strokeWidth={0.014 * s}
            strokeLinecap="round"
          />
        )),
      )}

      {/* Eyes. */}
      {[-1, 1].map((side) => (
        <g key={side}>
          <circle cx={cx + side * 0.17 * s} cy={cy - 0.38 * s} r={0.12 * s} fill={WHITE} />
          <circle cx={cx + side * 0.17 * s} cy={cy - 0.38 * s} r={0.075 * s} fill="#17171f" />
          <circle
            cx={cx + side * 0.17 * s + 0.025 * s}
            cy={cy - 0.41 * s}
            r={0.025 * s}
            fill={WHITE}
          />
        </g>
      ))}

      {/* The brow is the whole of the mood. */}
      {[-1, 1].map((side) => (
        <line
          key={side}
          x1={cx + side * 0.05 * s}
          y1={cy - 0.55 * s}
          x2={cx + side * 0.29 * s}
          y2={cy - 0.55 * s}
          stroke={BROWN_DARK}
          strokeWidth={0.035 * s}
          strokeLinecap="round"
          transform={`rotate(${side * brow} ${cx + side * 0.17 * s} ${cy - 0.55 * s})`}
        />
      ))}

      {/* Glasses: two rings and a bridge, the thing that makes him him. */}
      {[-1, 1].map((side) => (
        <circle
          key={side}
          cx={cx + side * 0.17 * s}
          cy={cy - 0.38 * s}
          r={0.15 * s}
          fill="none"
          stroke={FRAME}
          strokeWidth={0.028 * s}
        />
      ))}
      <line
        x1={cx - 0.02 * s}
        y1={cy - 0.38 * s}
        x2={cx + 0.02 * s}
        y2={cy - 0.38 * s}
        stroke={FRAME}
        strokeWidth={0.028 * s}
      />

      {/* Nose, then a mouth that carries the rest of the mood. */}
      <ellipse cx={cx} cy={cy - 0.2 * s} rx={0.045 * s} ry={0.034 * s} fill={NOSE} />
      <path
        d={`M ${cx - 0.09 * s} ${cy - 0.14 * s} Q ${cx} ${cy - 0.14 * s + smile * s} ${cx + 0.09 * s} ${cy - 0.14 * s}`}
        fill="none"
        stroke={NOSE}
        strokeWidth={0.018 * s}
        strokeLinecap="round"
      />
    </svg>
  );
}
