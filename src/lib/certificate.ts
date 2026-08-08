"use client";

import { lessonsIn, type Track } from "./lessons";
import type { Progress } from "./progress";

/**
 * The thing you get for finishing a track, drawn on a canvas so it can leave
 * the site as a file.
 *
 * There is no server, no account and no signed record, so this is not a
 * credential and does not pretend to be one. It says what the learner did, it
 * carries their own name because they typed it, and it is dated. Anything
 * more official would be a lie told in a nice typeface.
 *
 * Drawn rather than screenshotted because a screenshot of a web page is at the
 * mercy of the reader's theme, fonts and window size, and this has to be the
 * same object for everybody who shares one.
 */

export type CertificateSpec = {
  id: Track;
  /** What it says in the big line. */
  title: string;
  /** What they actually did, in one sentence, printed under the name. */
  line: string;
  /** The short version, for the share text. */
  shareLine: string;
};

export const CERTIFICATES: CertificateSpec[] = [
  {
    id: "chapter",
    title: "The Basics of AI",
    line: "played all six chapters against a real language model",
    shareLine: "I finished the Basics of AI on AIinFive",
  },
  {
    id: "ml",
    title: "The Basics of Machine Learning",
    line: "built all ten machine learning modules on real data",
    shareLine: "I finished the Basics of Machine Learning on AIinFive",
  },
];

/** The lessons a certificate is actually counting. Unbuilt ones do not count. */
export function lessonsFor(spec: CertificateSpec) {
  return lessonsIn(spec.id).filter((lesson) => lesson.status === "ready");
}

export function isEarned(spec: CertificateSpec, progress: Progress): boolean {
  const lessons = lessonsFor(spec);
  return (
    lessons.length > 0 &&
    lessons.every((lesson) => progress.completed.includes(lesson.slug))
  );
}

export function earned(progress: Progress): CertificateSpec[] {
  return CERTIFICATES.filter((spec) => isEarned(spec, progress));
}

/** Mean check score across the track, as a percentage, or null if unscored. */
export function scoreFor(
  spec: CertificateSpec,
  progress: Progress,
): number | null {
  const lessons = lessonsFor(spec);
  const scores = lessons.map((lesson) => progress.scores[lesson.slug] ?? 0);
  if (scores.length === 0) return null;
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.round(mean * 100);
}

/* -------------------------------------------------------------- drawing -- */

/** The light palette, always. A certificate is a print, and a print does not
 *  have a dark mode. These are the same inks as `globals.css`. */
const INK = {
  paper: "#eae7de",
  paperRaised: "#f3f1ea",
  ink: "#17171f",
  inkSoft: "#4a4a58",
  pink: "#dd2a72",
  teal: "#009180",
  blue: "#2440d8",
  yellow: "#a87400",
  /* Nimo's own colours, which never follow a theme. */
  brown: "#7a6552",
  brownDark: "#57453a",
  face: "#efe6d2",
  white: "#fffdf6",
  nose: "#1c1712",
  book: "#d9552f",
  bookTeal: "#1f4d49",
} as const;

export type Shape = "post" | "square";

/** Pixel size of each shape. Both are what the networks want, at 2x. */
export const SIZES: Record<Shape, { width: number; height: number }> = {
  post: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
};

/**
 * The site's own fonts, by the family name Next generated for them.
 *
 * Read off the document rather than hard-coded, because the names are
 * build-time hashes. If the variable is missing for any reason the canvas
 * falls back to a generic, which is ugly but still a certificate.
 */
function families() {
  if (typeof document === "undefined") {
    return { display: "sans-serif", body: "serif", data: "monospace" };
  }
  const root = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;
  return {
    display: pick("--font-bricolage", "sans-serif"),
    body: pick("--font-literata", "serif"),
    data: pick("--font-martian", "monospace"),
  };
}

/** Halftone: a dot grid, the cheapest honest nod to the printing process. */
function halftone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  step: number,
) {
  ctx.save();
  ctx.fillStyle = INK.ink;
  ctx.globalAlpha = 0.06;
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Nimo, flat. The same otter as the 3D one: round head, glasses, books. */
function drawNimo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  const circle = (
    x: number,
    y: number,
    r: number,
    fill: string,
    squashY = 1,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squashY);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  };

  /* Books first, he sits on them. */
  const book = (y: number, w: number, h: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(cx - w / 2, cy + y, w, h);
  };
  book(0.94 * s, 1.2 * s, 0.12 * s, INK.book);
  book(0.81 * s, 1.1 * s, 0.12 * s, INK.bookTeal);
  book(0.68 * s, 1.0 * s, 0.12 * s, INK.book);

  /* Tail, out to his left so the silhouette says otter. */
  ctx.save();
  ctx.translate(cx - 0.52 * s, cy + 0.3 * s);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.34 * s, 0.13 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = INK.brownDark;
  ctx.fill();
  ctx.restore();

  /* Body, belly, feet. */
  circle(cx, cy + 0.24 * s, 0.52 * s, INK.brown, 1.05);
  circle(cx, cy + 0.3 * s, 0.34 * s, INK.face, 1.15);
  circle(cx - 0.34 * s, cy + 0.62 * s, 0.15 * s, INK.brownDark, 0.6);
  circle(cx + 0.34 * s, cy + 0.62 * s, 0.15 * s, INK.brownDark, 0.6);

  /* Head. */
  circle(cx - 0.4 * s, cy - 0.52 * s, 0.13 * s, INK.brownDark);
  circle(cx + 0.4 * s, cy - 0.52 * s, 0.13 * s, INK.brownDark);
  circle(cx, cy - 0.34 * s, 0.46 * s, INK.brown, 0.94);
  circle(cx, cy - 0.22 * s, 0.3 * s, INK.face, 0.72);

  /* Eyes behind the glasses. */
  circle(cx - 0.17 * s, cy - 0.38 * s, 0.12 * s, INK.white);
  circle(cx + 0.17 * s, cy - 0.38 * s, 0.12 * s, INK.white);
  circle(cx - 0.17 * s, cy - 0.38 * s, 0.075 * s, INK.ink);
  circle(cx + 0.17 * s, cy - 0.38 * s, 0.075 * s, INK.ink);
  circle(cx - 0.145 * s, cy - 0.41 * s, 0.025 * s, INK.white);
  circle(cx + 0.195 * s, cy - 0.41 * s, 0.025 * s, INK.white);

  /* Glasses: two rings and a bridge, the thing that makes him him. */
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 0.028 * s;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 0.17 * s, cy - 0.38 * s, 0.15 * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - 0.02 * s, cy - 0.38 * s);
  ctx.lineTo(cx + 0.02 * s, cy - 0.38 * s);
  ctx.stroke();

  /* Nose and whiskers. */
  circle(cx, cy - 0.2 * s, 0.045 * s, INK.nose, 0.75);
  ctx.strokeStyle = INK.face;
  ctx.lineWidth = 0.014 * s;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 0.06 * s, cy - 0.18 * s + i * 0.035 * s);
      ctx.lineTo(cx + side * 0.42 * s, cy - 0.26 * s + i * 0.07 * s);
      ctx.stroke();
    }
  }
}

/** Wraps text to a width and returns the lines, without drawing. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export type CertificateArt = {
  spec: CertificateSpec;
  name: string;
  /** Already formatted for print, e.g. "8 August 2026". */
  date: string;
  /** Mean check score across the track, if there is one. */
  score: number | null;
  lessonCount: number;
  shape: Shape;
};

/**
 * Paints the whole certificate into a canvas that is already the right size.
 *
 * Laid out from the height so the two shapes are the same design rather than
 * two designs: everything is a fraction of the plate, and the square simply
 * has more room under the name.
 */
/**
 * Paints the whole certificate into a canvas that is already the right size.
 *
 * The type is MEASURED BEFORE IT IS DRAWN and the whole stack is scaled to
 * fit. Sizes written as fractions of the width looked right in the square and
 * ran the closing line straight through the footer in the wide one, because a
 * wide plate is the one with less height, not more. Here the blocks are built
 * first, their total is compared with the space between the eyebrow and the
 * footer rule, and everything shrinks by whatever it takes. A name that is
 * three words long changes the layout rather than breaking it.
 */
export function drawCertificate(
  canvas: HTMLCanvasElement,
  art: CertificateArt,
) {
  const { width, height } = SIZES[art.shape];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const font = families();
  const pad = Math.round(width * 0.05);

  ctx.fillStyle = INK.paper;
  ctx.fillRect(0, 0, width, height);
  halftone(ctx, width, height, 14);

  /* The plate: a pink block offset behind a cream one. That misregistration
     is the site's whole visual language in one move. */
  const plate = { x: pad, y: pad, w: width - pad * 2, h: height - pad * 2 };
  const shift = Math.round(width * 0.009);
  ctx.fillStyle = INK.pink;
  ctx.fillRect(plate.x + shift, plate.y + shift, plate.w, plate.h);
  ctx.fillStyle = INK.paperRaised;
  ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
  ctx.strokeStyle = INK.ink;
  ctx.lineWidth = Math.max(2, width * 0.0025);
  ctx.strokeRect(plate.x, plate.y, plate.w, plate.h);

  const square = art.shape === "square";
  const left = plate.x + pad * 0.85;
  const right = plate.x + plate.w - pad * 0.85;
  /* The column stops short of the otter in the wide plate, where he stands
     beside the words rather than above them. */
  const column = square ? plate.w - pad * 1.7 : plate.w * 0.6;

  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  /* ---------------------------------------------------------- the otter -- */
  /* He stands clear of the footer rule: the books are the lowest thing on
     him and they were sitting on it. */
  const nimoSize = width * (square ? 0.21 : 0.145);
  /* Beside the words in the wide plate, and underneath them in the square
     one, where he is the thing filling the space rather than a stamp in the
     corner with the closing line running through him. */
  const nimoX = square ? plate.x + plate.w / 2 : right - nimoSize * 1.15;
  const nimoY = square ? plate.y + plate.h * 0.6 : plate.y + plate.h * 0.36;
  drawNimo(ctx, nimoX, nimoY, nimoSize);

  /* ----------------------------------------------------------- footer ---- */
  const footY = plate.y + plate.h - pad * 0.95;
  const facts = [`${art.lessonCount} MODULES`];
  if (art.score !== null) facts.push(`${art.score}% ON THE CHECKS`);
  facts.push(art.date.toUpperCase());
  const factLine = facts.join("   ·   ");

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK.inkSoft;
  const factSize = Math.round(width * 0.0155);
  ctx.font = `600 ${factSize}px ${font.data}`;
  ctx.fillText(factLine, left, footY);

  ctx.textAlign = "right";
  ctx.fillStyle = INK.ink;
  ctx.font = `800 ${Math.round(width * 0.022)}px ${font.display}`;
  ctx.fillText("aiinfive", right, footY);
  ctx.textAlign = "left";

  const ruleY = footY - factSize * 2.4;
  ctx.fillStyle = INK.blue;
  ctx.fillRect(left, ruleY, plate.w - pad * 1.7, Math.max(2, width * 0.0022));

  /* The site's four inks, in a row above the rule: a print shop's
     registration marks, in the one band of the plate nothing else uses. */
  let dotX = left;
  for (const colour of [INK.blue, INK.pink, INK.yellow, INK.teal]) {
    ctx.beginPath();
    ctx.arc(dotX, ruleY - width * 0.028, width * 0.0075, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
    dotX += width * 0.023;
  }

  /* ------------------------------------------------------- the stack ----- */
  ctx.textBaseline = "top";
  const top = plate.y + pad * 1.1;
  const room = ruleY - width * 0.03 - top;

  type Block = {
    text: string;
    weight: string;
    family: string;
    size: number;
    colour: string;
    lineHeight: number;
    /** Gap after the block, in the same units as the sizes. */
    after: number;
    /** A rule drawn under the block rather than text. */
    rule?: boolean;
  };

  const blocks: Block[] = [
    {
      text: "AIINFIVE · CERTIFICATE OF COMPLETION",
      weight: "600",
      family: font.data,
      size: width * 0.0165,
      colour: INK.inkSoft,
      lineHeight: 1.2,
      after: width * 0.035,
    },
    {
      text: art.spec.title,
      weight: "800",
      family: font.display,
      size: width * (square ? 0.06 : 0.05),
      colour: INK.ink,
      lineHeight: 1.06,
      after: width * 0.028,
    },
    {
      text: "awarded to",
      weight: "400",
      family: font.body,
      size: width * 0.019,
      colour: INK.inkSoft,
      lineHeight: 1.2,
      after: width * 0.014,
    },
    {
      text: art.name,
      weight: "800",
      family: font.display,
      size: width * (square ? 0.055 : 0.046),
      colour: INK.pink,
      lineHeight: 1.06,
      after: width * 0.016,
    },
    {
      text: "",
      weight: "400",
      family: font.body,
      size: width * 0.005,
      colour: INK.ink,
      lineHeight: 1,
      after: width * 0.026,
      rule: true,
    },
    {
      text: `who ${art.spec.line}.`,
      weight: "400",
      family: font.body,
      size: width * 0.0225,
      colour: INK.ink,
      lineHeight: 1.4,
      after: 0,
    },
  ];

  /** Lays the stack out at a given scale and reports what it costs. */
  const measure = (k: number) =>
    blocks.map((block) => {
      const size = block.size * k;
      ctx.font = `${block.weight} ${size}px ${block.family}`;
      const lines = block.rule ? [""] : wrap(ctx, block.text, column);
      const height = block.rule
        ? Math.max(3, size)
        : lines.length * size * block.lineHeight;
      return { block, size, lines, height: height + block.after * k };
    });

  const total = (k: number) =>
    measure(k).reduce((sum, laid) => sum + laid.height, 0);

  /* One measure at full size, then the scale that makes it fit, then one
     more measure at that scale: wrapping changes with the size, so the
     second pass is what is actually drawn. */
  const k = Math.min(1, room / Math.max(1, total(1)));
  let y = top;
  for (const laid of measure(k)) {
    if (laid.block.rule) {
      ctx.fillStyle = INK.ink;
      ctx.fillRect(
        left,
        y,
        Math.min(column, width * 0.3),
        Math.max(3, width * 0.004),
      );
      y += laid.height;
      continue;
    }
    ctx.fillStyle = laid.block.colour;
    ctx.font = `${laid.block.weight} ${laid.size}px ${laid.block.family}`;
    for (const line of laid.lines) {
      ctx.fillText(line, left, y);
      y += laid.size * laid.block.lineHeight;
    }
    y += laid.block.after * k;
  }
}

/** The file this ends up as on somebody's machine. */
export function fileNameFor(art: CertificateArt): string {
  const slug = art.spec.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `aiinfive-${slug}.png`;
}
