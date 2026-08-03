/**
 * Game art.
 *
 * Everything is drawn as SVG paths in the site's print system: flat spot inks,
 * hard edges, visible halftone, no gradients and no glow. The pieces are meant
 * to look cut and printed rather than rendered — a guillotine blade, a strip of
 * paper with sprocket holes, chips of paper flying off a cut.
 *
 * Drawn rather than fetched so they inherit the theme: every fill is a CSS
 * variable, so the same blade prints correctly on both plates.
 */

/** A dot screen any shape can be filled with. Register once per SVG. */
export function HalftoneDefs({ id = "halftone" }: { id?: string }) {
  return (
    <defs>
      <pattern
        id={id}
        width="4"
        height="4"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <circle cx="1" cy="1" r="1" fill="var(--ink)" fillOpacity="0.22" />
      </pattern>
      <pattern
        id={`${id}-dense`}
        width="3"
        height="3"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <circle cx="1" cy="1" r="1.1" fill="var(--ink)" fillOpacity="0.35" />
      </pattern>
    </defs>
  );
}

/**
 * The cutting blade. A heavy angled wedge with a bright edge — the one part of
 * the frame that should read as dangerous.
 */
export function Blade({
  x,
  y,
  height = 54,
  armed = true,
}: {
  x: number;
  y: number;
  height?: number;
  armed?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      {/* handle */}
      <rect
        x={-11}
        y={-height - 16}
        width={22}
        height={18}
        rx={2}
        fill="var(--ink)"
      />
      <rect
        x={-7}
        y={-height - 12}
        width={14}
        height={10}
        rx={1}
        fill="var(--paper)"
        fillOpacity={0.25}
      />
      {/* body — an angled wedge, heavier on the left like a guillotine */}
      <path
        d={`M -10 ${-height} L 10 ${-height} L 10 -8 L 0 2 L -10 -8 Z`}
        fill={armed ? "var(--pink)" : "var(--ink-faint)"}
        stroke="var(--ink)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d={`M -10 ${-height} L 10 ${-height} L 10 -8 L 0 2 L -10 -8 Z`}
        fill="url(#halftone)"
      />
      {/* the edge */}
      <path
        d="M -10 -8 L 0 2 L 10 -8"
        fill="none"
        stroke="var(--paper)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * A strip of paper running through the press, with sprocket holes punched down
 * both edges. The holes are what sell the motion — they give the eye something
 * repeating to track.
 */
export function PaperStrip({
  x,
  y,
  width,
  height,
  offset = 0,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  offset?: number;
}) {
  const pitch = 22;
  const first = Math.floor(-offset / pitch) * pitch + offset;
  const holes: number[] = [];
  for (let hx = first; hx < x + width + pitch; hx += pitch) {
    if (hx > x - pitch) holes.push(hx);
  }

  return (
    <g aria-hidden="true">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="var(--paper-raised)"
        stroke="var(--ink)"
        strokeWidth={1.5}
      />
      <rect x={x} y={y} width={width} height={height} fill="url(#halftone)" />
      {holes.map((hx, i) => (
        <g key={i}>
          <rect
            x={hx - 3}
            y={y + 5}
            width={6}
            height={6}
            rx={1}
            fill="var(--paper-sunk)"
            stroke="var(--ink)"
            strokeWidth={1}
          />
          <rect
            x={hx - 3}
            y={y + height - 11}
            width={6}
            height={6}
            rx={1}
            fill="var(--paper-sunk)"
            stroke="var(--ink)"
            strokeWidth={1}
          />
        </g>
      ))}
    </g>
  );
}

/** A chip of paper thrown off by a cut. */
export type Chip = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  life: number;
  ink: string;
};

export function Chips({ chips }: { chips: Chip[] }) {
  return (
    <g aria-hidden="true">
      {chips.map((c, i) => (
        <rect
          key={i}
          x={-3}
          y={-2.5}
          width={6}
          height={5}
          fill={c.ink}
          stroke="var(--ink)"
          strokeWidth={0.75}
          opacity={Math.min(1, c.life * 2)}
          transform={`translate(${c.x} ${c.y}) rotate(${c.angle})`}
        />
      ))}
    </g>
  );
}

/**
 * A printed ball — solid ink with a halftone shoulder, so it reads as a
 * physical object rolling rather than a dot moving.
 */
export function InkBall({
  x,
  y,
  r = 11,
  spin = 0,
}: {
  x: number;
  y: number;
  r?: number;
  spin?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${spin})`} aria-hidden="true">
      <circle r={r} fill="var(--pink)" stroke="var(--ink)" strokeWidth={1.75} />
      <circle r={r} fill="url(#halftone-dense)" />
      {/* a printed register mark, so rotation is visible */}
      <path
        d={`M 0 ${-r + 3} L 0 ${-r + 8} M ${-r + 3} 0 L ${-r + 8} 0`}
        stroke="var(--paper)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * Hatched ground under a curve. Printed hillsides get hatching rather than a
 * fill — it keeps the curve itself the darkest line on the plate.
 */
export function HatchedGround({
  path,
  width,
  height,
}: {
  path: string;
  width: number;
  height: number;
}) {
  return (
    <g aria-hidden="true">
      <defs>
        <pattern
          id="hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="7"
            stroke="var(--ink)"
            strokeWidth="1"
            strokeOpacity="0.28"
          />
        </pattern>
        <clipPath id="ground-clip">
          <path d={`${path} L ${width} ${height} L 0 ${height} Z`} />
        </clipPath>
      </defs>
      <rect
        width={width}
        height={height}
        fill="url(#hatch)"
        clipPath="url(#ground-clip)"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </g>
  );
}

/** A score that pops off the point it was earned at. */
export function ScorePop({
  x,
  y,
  text,
  life,
  ink = "var(--teal)",
}: {
  x: number;
  y: number;
  text: string;
  life: number;
  ink?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={15}
      fontWeight={700}
      className="data"
      fill={ink}
      opacity={Math.min(1, life * 1.6)}
      aria-hidden="true"
    >
      {text}
    </text>
  );
}
