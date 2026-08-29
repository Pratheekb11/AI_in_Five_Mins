import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No em dashes. Anywhere.
 *
 * They are the house style of machine-written prose, and this site is not
 * that. A comma, a colon or a full stop says the same thing. The rule covers
 * comments as well as copy, so nobody reads one in the source and copies it
 * back into a sentence.
 *
 * The corpora are exempt and must stay exempt: Alice in Wonderland and the
 * Wikipedia openings are quoted verbatim, and editing punctuation inside a
 * cited source would be inventing data.
 */
const ROOTS = ["src", "data/scripts"];
/** Docs that ship with the repo. `data/raw` is corpora and is never walked. */
const DOCS = ["README.md", "data/PROVENANCE.md"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".mjs", ".md"]);

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...files(path));
    else if (EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) out.push(path);
  }
  return out;
}

describe("copy", () => {
  it("has no em dashes in the source", () => {
    const offenders: string[] = [];
    const paths = [
      ...ROOTS.flatMap((root) => files(resolve(process.cwd(), root))),
      ...DOCS.map((doc) => resolve(process.cwd(), doc)),
    ];
    for (const path of paths) {
      if (path.endsWith("copy.test.ts")) continue;
      const text = readFileSync(path, "utf8");
      text.split("\n").forEach((line, i) => {
        if (line.includes("—") || line.includes("&mdash;")) {
          offenders.push(`${path.replace(process.cwd() + "/", "")}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
