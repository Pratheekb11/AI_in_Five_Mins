"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

/**
 * The fork in the road, said once, near the top.
 */

export type PathSummary = {
  id: string;
  /** Anchor on this page, for "see all N". */
  anchor: string;
  eyebrow: string;
  title: string;
  promise: string;
  /** What you will be able to say afterwards. Nuggets, straight from the syllabus. */
  takeaways: string[];
  moduleCount: number;
  minutes: number;
  /** Where the button goes, and what the first game is called. */
  href: string;
  firstGame: string;
  certificate: string;
  ink: "blue" | "teal";
};

/**
 * The third thing, which is not a path.
 */
export type PathAside = {
  title: string;
  blurb: string;
  moduleCount: number;
  anchor: string;
};

const INK = {
  blue: {
    stroke: "var(--blue)",
    text: "text-blue-text",
    chip: "border-blue-text/40 bg-blue-wash text-blue-text",
  },
  teal: {
    stroke: "var(--teal)",
    text: "text-teal-text",
    chip: "border-teal-text/40 bg-teal-wash text-teal-text",
  },
} as const;

/*
  The drawing, twice.
*/
type Layout = {
  width: number;
  height: number;
  startX: number;
  splitX: number;
  firstTick: number;
  pitch: number;
  topY: number;
  bottomY: number;
  tickHeight: number;
  fontSize: number;
};

const WIDE: Layout = {
  width: 800,
  height: 150,
  startX: 54,
  splitX: 180,
  firstTick: 330,
  pitch: 46,
  topY: 34,
  bottomY: 116,
  tickHeight: 22,
  fontSize: 12,
};

const NARROW: Layout = {
  width: 400,
  height: 250,
  startX: 24,
  splitX: 74,
  firstTick: 150,
  pitch: 25,
  topY: 58,
  bottomY: 192,
  tickHeight: 20,
  fontSize: 13,
};

const tickX = (layout: Layout, index: number) =>
  layout.firstTick + index * layout.pitch;

/* One tick per module, at a FIXED pitch, so the longer path is drawn longer.
   Spreading each path's ticks across the same width instead would have drawn
   ten modules and six modules as two roads of equal length, which is the one
   thing this picture is for. */
const endX = (layout: Layout, count: number) =>
  tickX(layout, count - 1) + layout.pitch / 2;

function road(layout: Layout, count: number, endY: number): string {
  const midY = layout.height / 2;
  const bend = layout.firstTick - 8;
  return `M ${layout.startX} ${midY} H ${layout.splitX} C ${layout.splitX + (bend - layout.splitX) * 0.6} ${midY}, ${layout.splitX + (bend - layout.splitX) * 0.35} ${endY}, ${bend} ${endY} H ${endX(layout, count)}`;
}

function Roads({
  paths,
  aside,
  lit,
  still,
  layout,
  className,
}: {
  paths: PathSummary[];
  aside?: PathAside;
  lit: string | null;
  still: boolean;
  layout: Layout;
  className?: string;
}) {
  const ends = [layout.topY, layout.bottomY];
  const midY = layout.height / 2;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={`block h-auto w-full ${className ?? ""}`}
      role="img"
      aria-label={paths
        .map((path) => `${path.title}: ${path.moduleCount} modules`)
        .join(". ")}
    >
      {/* Where you are standing. Both roads leave from this one mark. */}
      <circle cx={layout.startX} cy={midY} r={7} fill="var(--ink)" />
      <text
        x={layout.startX}
        y={midY + 26}
        textAnchor="middle"
        className="data"
        fontSize={layout.fontSize}
        fill="var(--ink-faint)"
      >
        here
      </text>

      {/* The rung: a dashed connector between the two roads, because the
          rabbit hole is reachable from either and is not a third road. Placed
          two ticks in, where both roads are straight and neither has ended. */}
      {aside ? (
        <motion.g
          initial={still ? undefined : { opacity: 0 }}
          whileInView={still ? undefined : { opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 1.1 }}
        >
          <line
            x1={tickX(layout, 2)}
            y1={layout.topY + layout.tickHeight / 2}
            x2={tickX(layout, 2)}
            y2={layout.bottomY - layout.tickHeight / 2}
            stroke="var(--ink)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.45}
          />
          <rect
            x={tickX(layout, 2) - 4}
            y={midY - 4}
            width={8}
            height={8}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={1.5}
            opacity={0.75}
          />
          <text
            x={tickX(layout, 2) + 10}
            y={midY + 4}
            className="data"
            fontSize={layout.fontSize}
            fill="var(--ink-faint)"
          >
            {aside.moduleCount} optional
          </text>
        </motion.g>
      ) : null}

      {paths.map((path, i) => {
        const dim = lit !== null && lit !== path.id;
        const ink = INK[path.ink];
        const endY = ends[i] ?? midY;
        const stop = endX(layout, path.moduleCount);

        return (
          <motion.g
            key={path.id}
            animate={{ opacity: dim ? 0.3 : 1 }}
            transition={{ duration: still ? 0 : 0.25 }}
          >
            <motion.path
              d={road(layout, path.moduleCount, endY)}
              fill="none"
              stroke={ink.stroke}
              strokeWidth={lit === path.id ? 5 : 3}
              strokeLinecap="square"
              initial={still ? undefined : { pathLength: 0 }}
              whileInView={still ? undefined : { pathLength: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: "easeOut" }}
            />

            {/* One mark per module. Opacity only: a scaled rect inside an SVG
                needs a transform origin in user units and lands in the wrong
                place the moment the viewBox scales. */}
            {Array.from({ length: path.moduleCount }, (_, tick) => (
              <motion.rect
                key={tick}
                x={tickX(layout, tick) - 2}
                y={endY - layout.tickHeight / 2}
                width={4}
                height={layout.tickHeight}
                fill={ink.stroke}
                initial={still ? undefined : { opacity: 0 }}
                whileInView={still ? undefined : { opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.25,
                  delay: 0.55 + i * 0.12 + tick * 0.05,
                }}
              />
            ))}

            <text
              x={stop}
              y={endY - layout.tickHeight / 2 - 8}
              textAnchor="end"
              className="data"
              fontSize={layout.fontSize}
              fontWeight="700"
              fill={ink.stroke}
            >
              {path.moduleCount} modules
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

export function PathChooser({
  paths,
  aside,
}: {
  paths: PathSummary[];
  aside?: PathAside;
}) {
  const still = useReducedMotion() ?? false;
  const [lit, setLit] = useState<string | null>(null);

  return (
    <div>
      <Roads
        paths={paths}
        aside={aside}
        lit={lit}
        still={still}
        layout={NARROW}
        className="mb-6 sm:hidden"
      />
      <Roads
        paths={paths}
        aside={aside}
        lit={lit}
        still={still}
        layout={WIDE}
        className="mb-6 hidden sm:block"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {paths.map((path) => {
          const ink = INK[path.ink];

          return (
            <div
              key={path.id}
              className="plate misreg flex flex-col p-5 md:p-6"
              onMouseEnter={() => setLit(path.id)}
              onMouseLeave={() => setLit(null)}
              onFocus={() => setLit(path.id)}
              onBlur={() => setLit(null)}
            >
              <p className="label text-ink-faint mb-2">{path.eyebrow}</p>
              <h3 className={`display-md mb-3 ${ink.text}`}>{path.title}</h3>
              <p className="text-ink-soft mb-5">{path.promise}</p>

              <p className="label text-ink-faint mb-2">
                What you will be able to say
              </p>
              <ul className="mb-5 space-y-2">
                {path.takeaways.map((line) => (
                  <li
                    key={line}
                    className={`${ink.chip} rounded-[2px] border px-2 py-1 text-sm font-semibold`}
                  >
                    {line}
                  </li>
                ))}
              </ul>

              {/* Pushes the buttons to the bottom so two cards of unequal
                  length still line up along their action. */}
              <div className="grow" />

              <div className="border-ink/20 mb-4 border-t pt-3">
                <p className="label text-ink-faint">
                  {path.moduleCount} modules · about {path.minutes} minutes
                </p>
                <p className="label text-ink-faint mt-1">
                  Certificate: {path.certificate}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={path.href}
                  className="plate misreg btn-primary font-display inline-block px-4 py-2.5 font-bold"
                >
                  Play {path.firstGame}
                </Link>
                <Link
                  href={path.anchor}
                  className="plate misreg font-display inline-block px-4 py-2.5 font-bold"
                >
                  See all {path.moduleCount}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quieter than the two plates on purpose: this is not a third thing to
          choose, it is what is underneath both of them. */}
      {aside ? (
        <div className="border-ink/25 mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-[2px] border border-dashed p-4">
          <div className="prose-measure">
            <p className="label text-ink-faint mb-1">
              Under either path · optional
            </p>
            <p className="font-display mb-1 font-bold">
              {aside.title} · {aside.moduleCount} modules
            </p>
            <p className="text-ink-soft text-sm">{aside.blurb}</p>
          </div>
          <Link
            href={aside.anchor}
            className="font-display border-ink/40 hover:border-ink shrink-0 rounded-[2px] border px-4 py-2.5 font-bold"
          >
            See the {aside.moduleCount}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
