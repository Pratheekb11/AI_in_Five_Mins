/**
 * What a tokenizer costs, by script.
 *
 * The claim this measures is one that matters a great deal outside the English
 * internet and is almost never shown: the same idea, written in a different
 * script, is charged a different number of tokens. Not slightly — several times
 * over. Anyone paying per token for Hindi or Kannada is paying a tax that
 * nobody advertises.
 *
 * The measurement is straightforward and honest. For each language, take the
 * opening of the same Wikipedia article, tokenize it with the real `o200k_base`
 * merge table that GPT-4o and GPT-5 use, and record characters, tokens and the
 * ratio between them. Both the article URL and the exact revision id are kept,
 * so anyone can pull the same text and get the same numbers.
 *
 * Nothing is translated by us and nothing is trimmed to make a point. Articles
 * in different languages are written independently, which is stated on the page
 * — what is being compared is real text in each script, not a translation pair.
 *
 * Run with:  node data/scripts/build-scripts.mjs
 * Output:    public/data/scripts.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { encode } from "gpt-tokenizer/encoding/o200k_base";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../public/data/scripts.json");

const AGENT = "LearnLoopAI/1.0 (educational; contact via site)";

/**
 * One subject, written up independently in each language.
 *
 * Chosen because every one of these Wikipedias has a substantial article on it,
 * so no language is represented by a stub.
 */
const SUBJECT = { en: "Water", hi: "जल", kn: "ನೀರು", ta: "நீர்", bn: "পানি", te: "నీరు", mr: "पाणी", ja: "水", ar: "ماء" };

const LANGUAGES = [
  { code: "en", name: "English", script: "Latin" },
  { code: "hi", name: "Hindi", script: "Devanagari" },
  { code: "mr", name: "Marathi", script: "Devanagari" },
  { code: "bn", name: "Bengali", script: "Bengali" },
  { code: "ta", name: "Tamil", script: "Tamil" },
  { code: "te", name: "Telugu", script: "Telugu" },
  { code: "kn", name: "Kannada", script: "Kannada" },
  { code: "ja", name: "Japanese", script: "Kanji and kana" },
  { code: "ar", name: "Arabic", script: "Arabic" },
];

/** Characters of article text to measure. The same budget for every language. */
const CHARS = 900;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One API call, returning the single page object.
 *
 * Paced and retried on 429. Wikipedia is doing us a favour; hammering it to
 * build a teaching page would be a poor way to say thank you.
 */
async function pageFor(code, title, props, attempt = 0) {
  const url =
    `https://${code}.wikipedia.org/w/api.php?action=query&format=json` +
    `&formatversion=2&titles=${encodeURIComponent(title)}&${props}`;

  const response = await fetch(url, { headers: { "User-Agent": AGENT } });

  if (response.status === 429 && attempt < 5) {
    const back = 2000 * 2 ** attempt;
    console.log(`    rate limited, waiting ${back / 1000}s …`);
    await wait(back);
    return pageFor(code, title, props, attempt + 1);
  }

  if (!response.ok) throw new Error(`${code}: HTTP ${response.status}`);
  const page = (await response.json())?.query?.pages?.[0];
  if (!page || page.missing) throw new Error(`${code}: no article "${title}"`);
  await wait(700);
  return page;
}

async function extractFor(code, title) {
  // Two calls rather than one. Asking for extracts and revisions together
  // makes the API return a truncated extract for some wikis — Japanese came
  // back as 205 characters that way and 13,000 on its own.
  const page = await pageFor(code, title, "prop=extracts&explaintext=1");
  const meta = await pageFor(code, title, "prop=revisions&rvprop=ids");
  page.revisions = meta.revisions;

  const text = String(page.extract ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < CHARS) {
    throw new Error(`${code}: only ${text.length} characters, need ${CHARS}`);
  }

  return {
    title: page.title,
    revision: page.revisions?.[0]?.revid ?? null,
    text: text.slice(0, CHARS),
  };
}

const main = async () => {
  const measured = [];

  for (const language of LANGUAGES) {
    const title = SUBJECT[language.code];
    process.stdout.write(`${language.name} (${language.code}) … `);

    const article = await extractFor(language.code, title);
    const tokens = encode(article.text);

    measured.push({
      ...language,
      article: {
        title: article.title,
        url: `https://${language.code}.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
        revision: article.revision,
      },
      sample: article.text.slice(0, 160),
      characters: article.text.length,
      tokens: tokens.length,
      charactersPerToken: Number(
        (article.text.length / tokens.length).toFixed(3),
      ),
    });

    console.log(
      `${tokens.length} tokens for ${article.text.length} chars ` +
        `(${(article.text.length / tokens.length).toFixed(2)} chars/token)`,
    );
  }

  const english = measured.find((m) => m.code === "en");
  if (!english) throw new Error("English is the baseline and it is missing.");

  for (const m of measured) {
    // How many times more tokens this script needs for the same amount of text.
    m.timesEnglish = Number((english.charactersPerToken / m.charactersPerToken).toFixed(2));
  }

  measured.sort((a, b) => a.timesEnglish - b.timesEnglish);

  const payload = {
    generatedBy: "data/scripts/build-scripts.mjs",
    measuredOn: new Date().toISOString().slice(0, 10),
    encoding: {
      name: "o200k_base",
      note: "The byte-pair merge table used by OpenAI's GPT-4o and GPT-5 family. Tokenization was run with the gpt-tokenizer package, the same one the site uses in the browser.",
      url: "https://github.com/niieani/gpt-tokenizer",
    },
    corpus: {
      name: "Wikipedia",
      note: `The first ${CHARS} characters of the article on the same subject in each language. Articles are written independently in each Wikipedia, so these are comparable texts on one subject rather than translations of one another.`,
      licence: "CC BY-SA 4.0",
      url: "https://en.wikipedia.org/wiki/Wikipedia:Copyrights",
    },
    charactersMeasured: CHARS,
    languages: measured,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${OUT}`);
};

main().catch((error) => {
  console.error("\nMeasurement failed. Nothing was written.\n");
  console.error(error.message ?? error);
  process.exit(1);
});
