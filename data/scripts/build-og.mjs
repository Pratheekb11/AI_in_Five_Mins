/**
 * The picture that turns up when somebody shares the site.
 *
 * Generated once, into `public/og.png`, rather than rendered per request. A
 * card that renders at request time makes every crawler wait on a renderer,
 * ties the site to a host that can run one, and, measured here, takes the
 * dev server down when it is asked for. A file in `public` works on anything
 * that can serve a file.
 *
 * The type is set in whatever sans the renderer has. Satori, which draws this,
 * cannot read woff2, and the site's three faces ship as woff2 only, so the
 * alternative would be fetching an otf from Google at build time and making
 * the build need the network. The shapes and the inks are the site's; the
 * letterforms on this one image are not, and that is the whole compromise.
 *
 *   node data/scripts/build-og.mjs
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ImageResponse } = require("next/og");

const PAPER = "#eae7de";
const INK = "#17171f";
const SOFT = "#4a4a58";
const FAINT = "#5c5c64";
const PINK = "#dd2a72";
const BLUE = "#2440d8";

const SIZE = { width: 1200, height: 630 };

/** Satori takes React elements; this file is not compiled, so they are built
 *  by hand. Every node needs an explicit `display`. */
const h = (style, children) => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

const card = h(
  {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "space-between",
    background: PAPER,
    color: INK,
    padding: 72,
    fontFamily: "sans-serif",
  },
  [
    h({ alignItems: "center", gap: 18 }, [
      h({ fontSize: 34, fontWeight: 800, letterSpacing: -1 }, [
        /* The gap is a non-breaking space: satori trims a trailing one and
           the wordmark comes out as "AI inFive". */
        "AI in\u00a0",
        h({ color: PINK, fontWeight: 800 }, "Five"),
      ]),
      h(
        {
          fontSize: 19,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: FAINT,
        },
        "One game · about five minutes · nothing to sign up for",
      ),
    ]),

    h({ flexDirection: "column" }, [
      h({ fontSize: 88, fontWeight: 800, lineHeight: 1.04 }, "Stop guessing what"),
      h({ fontSize: 88, fontWeight: 800, lineHeight: 1.04 }, [
        "AI is\u00a0",
        h({ color: PINK, fontWeight: 800 }, "actually doing."),
      ]),
    ]),

    h({ alignItems: "flex-end", gap: 26 }, [
      // The offset plate, printed rather than shadowed.
      h({ position: "relative", width: 316, height: 74 }, [
        h({
          position: "absolute",
          left: 8,
          top: 8,
          width: 308,
          height: 66,
          background: INK,
        }),
        h(
          {
            position: "absolute",
            left: 0,
            top: 0,
            alignItems: "center",
            justifyContent: "center",
            width: 308,
            height: 66,
            background: BLUE,
            border: `3px solid ${INK}`,
            color: PAPER,
            fontSize: 26,
            fontWeight: 700,
          },
          "Play the first game",
        ),
      ]),
      h(
        { width: 480, fontSize: 23, lineHeight: 1.35, color: SOFT, paddingBottom: 8 },
        "Six chapters on how AI works, ten on machine learning. Every number on the site was measured, not written.",
      ),
    ]),
  ],
);

const png = Buffer.from(await new ImageResponse(card, SIZE).arrayBuffer());
writeFileSync("public/og.png", png);
console.log(`public/og.png  ${SIZE.width}x${SIZE.height}  ${png.length} bytes`);
