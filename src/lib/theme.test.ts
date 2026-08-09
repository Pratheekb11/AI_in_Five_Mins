import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Dark is reached two ways and has to arrive the same both times.
 */

const CSS = readFileSync("src/app/globals.css", "utf8");

function block(selector: string): Record<string, string> {
  const start = CSS.indexOf(selector);
  expect(start, `${selector} not found`).toBeGreaterThan(-1);
  const open = CSS.indexOf("{", start);
  const end = CSS.indexOf("}", open);
  const body = CSS.slice(open + 1, end);

  const tokens: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const match = line.match(/^\s*(--[a-z-]+):\s*([^;]+);/);
    if (match) tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const light = block(":root {");
const toggled = block(':root[data-theme="dark"]');
const system = block(':root:not([data-theme="light"])');

describe("the two dark themes", () => {
  it("declare the same tokens", () => {
    expect(Object.keys(system).sort()).toEqual(Object.keys(toggled).sort());
  });

  it("declare the same values", () => {
    expect(system).toEqual(toggled);
  });

  it("redeclare every ink the light theme sets", () => {
    /* A token the light `:root` sets and dark forgets is inherited from light,
       which is how the button text went wrong. `--radius`, `--measure` and the
       rest of the non-colour tokens are deliberately shared. */
    const colour = Object.keys(light).filter(
      (key) =>
        light[key].startsWith("#") &&
        !key.includes("radius") &&
        !key.includes("measure"),
    );
    for (const key of colour) {
      expect(toggled, `dark never redeclares ${key}`).toHaveProperty(key);
    }
  });
});

/* ----------------------------------------------------------- contrast --- */

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("text on solid ink", () => {
  /* `.btn-primary` is the one place on the site type sits on a spot ink. */
  for (const [name, tokens] of [
    ["light", light],
    ["dark, toggled", toggled],
    ["dark, from the system", system],
  ] as const) {
    it(`clears 4.5:1 in ${name}`, () => {
      expect(contrast(tokens["--on-blue"], tokens["--blue"])).toBeGreaterThan(
        4.5,
      );
    });

    it(`keeps body text legible in ${name}`, () => {
      for (const key of ["--ink", "--ink-soft", "--ink-faint"]) {
        expect(
          contrast(tokens[key], tokens["--paper"]),
          `${key} on paper in ${name}`,
        ).toBeGreaterThan(4.5);
        expect(
          contrast(tokens[key], tokens["--paper-raised"]),
          `${key} on a raised plate in ${name}`,
        ).toBeGreaterThan(4.5);
      }
    });
  }
});
