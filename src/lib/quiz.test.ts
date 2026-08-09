import { readdirSync, readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards against a quiz you can pass without reading it, and against the quiz
 * growing back.
 */

const LESSONS = "src/app/lessons";

type Parsed = { lesson: string; options: string[]; answer: number };

/** Pull every `options: [...] ... answer: n` pair out of a page module. */
function parse(source: string, lesson: string): Parsed[] {
  const found: Parsed[] = [];
  const re = /options:\s*\[/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(source))) {
    let i = match.index + match[0].length;
    const start = i;
    let depth = 1;
    while (depth > 0 && i < source.length) {
      const c = source[i];
      if (c === "[") depth++;
      else if (c === "]") depth--;
      i++;
    }

    const body = source.slice(start, i - 1);
    const parts: string[] = [];
    let current = "";
    let nesting = 0;
    let quote: string | null = null;

    for (let j = 0; j < body.length; j++) {
      const c = body[j];
      if (quote) {
        if (c === quote && body[j - 1] !== "\\") quote = null;
        current += c;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        quote = c;
        current += c;
        continue;
      }
      if ("[{(".includes(c)) nesting++;
      if ("]})".includes(c)) nesting--;
      if (c === "," && nesting === 0) {
        parts.push(current);
        current = "";
        continue;
      }
      current += c;
    }
    if (current.trim()) parts.push(current);

    const options = parts
      .map((p) => p.trim().replace(/^[`"']|[`"']$/g, ""))
      .filter(Boolean);
    const answerMatch = /answer:\s*(\d+)/.exec(source.slice(i, i + 400));
    if (!answerMatch || options.length < 2) continue;

    found.push({ lesson, options, answer: Number(answerMatch[1]) });
  }

  return found;
}

const questions: Parsed[] = readdirSync(LESSONS)
  .map((dir) => ({ dir, file: `${LESSONS}/${dir}/page.tsx` }))
  .filter(({ file }) => existsSync(file))
  .flatMap(({ dir, file }) => parse(readFileSync(file, "utf8"), dir));

describe("quiz questions", () => {
  it("finds the questions to check", () => {
    /* One per lesson, give or take. Three per lesson was the old shape and a
       learner told us it was exhausting; the rest of each check is now sorting,
       matching, flagging and filling, which this parser does not see. */
    expect(questions.length).toBeGreaterThan(12);
  });

  it("never asks more than one multiple-choice question per lesson", () => {
    const counts = new Map<string, number>();
    for (const q of questions) {
      counts.set(q.lesson, (counts.get(q.lesson) ?? 0) + 1);
    }

    const offenders = [...counts]
      .filter(([, n]) => n > 1)
      .map(([lesson, n]) => `${lesson}: ${n}`);

    expect(offenders).toEqual([]);
  });

  it("never makes the correct answer the conspicuously longest option", () => {
    /* Some slack, because near-equal lengths are not a tell, a reader cannot
       eyeball a 10% difference. What gives the game away is the one option
       that is visibly a paragraph while the rest are phrases. */
    const offenders = questions
      /* An option that interpolates generated data is longer in the source
         than on the page, `${million.pieces.join("|")}` is 30 characters here
         and renders as "100|000|0". Measuring those would fail on questions
         that are fine in the browser, so they are checked there instead. */
      .filter((q) => !q.options.some((o) => o.includes("${")))
      .filter((q) => {
        const lengths = q.options.map((o) => o.length);
        const others = lengths.filter((_, i) => i !== q.answer);
        return lengths[q.answer] > Math.max(...others) * 1.15;
      })
      .map((q) => `${q.lesson}: "${q.options[q.answer].slice(0, 60)}…"`);

    expect(offenders).toEqual([]);
  });

  it("has a real answer index for every question", () => {
    for (const q of questions) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }
  });
});
