/**
 * Hallucination Hunt — real paragraphs with known things wrong in them.
 *
 * The skill this drills is the one that actually protects you: reading fluent,
 * confident prose and noticing the bit that is not true. That is hard to
 * practise honestly, because you need text where the truth is settled and the
 * errors are known exactly.
 *
 * So the paragraphs are real. Each one is the opening of a Wikipedia article,
 * fetched here with its revision id, and each alteration is written by hand as
 * a pair: the exact original wording, and what it was changed to.
 *
 * The verification is the whole point of doing it this way. Before anything is
 * written out, every `original` string is checked to appear **exactly once** in
 * the freshly fetched text. If Wikipedia has been edited since these were
 * written, the check fails and that puzzle is dropped rather than shipped with
 * an answer key that no longer matches its source. Anyone can pull the cited
 * revision and diff it themselves.
 *
 * Nothing here is generated. An automatically corrupted number is as likely to
 * land on something still true as not, and "spot the error" with an unreliable
 * answer key is worse than no game.
 *
 * Run with:  node data/scripts/build-hunt.mjs
 * Output:    public/data/hunt.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../../public/data/hunt.json");

const AGENT = "AIinFive/1.0 (educational)";
/** How much of the article opening to use. Enough to hide three things in. */
const CHARS = 700;
/** How much further than CHARS the cut may run to reach the end of a sentence. */
const OVERRUN = 220;

/**
 * The article's opening, cut where a sentence ends.
 */
function endOfSentence(text, chars) {
  const stop = text.slice(chars).search(/[.!?](?=\s|$)/);
  if (stop >= 0 && stop <= OVERRUN) return text.slice(0, chars + stop + 1);
  const back = text.lastIndexOf(" ", chars);
  return text.slice(0, back > 0 ? back : chars).trimEnd();
}

/**
 * `difficulty` is our own labelling of how hard each one is to catch, and it is
 * the one editorial judgement in this file. Everything else — the text, and
 * whether the alteration is really an alteration — is checked against the source.
 */
const PUZZLES = [
  {
    id: "venus",
    article: "Venus",
    edits: [
      {
        original: "Venus is the second planet from the Sun.",
        altered: "Venus is the third planet from the Sun.",
        difficulty: "obvious",
        why: "Venus is the second planet from the Sun. Earth is the third.",
      },
      {
        original: "a pressure 92 times greater than Earth's",
        altered: "a pressure 12 times greater than Earth's",
        difficulty: "hard",
        why: "The real figure is 92 times Earth's surface pressure. A wrong number in the same shape as a right one is the hardest kind to catch.",
      },
      {
        original: "a thick cloud layer of sulfuric acid",
        altered: "a thick cloud layer of hydrochloric acid",
        difficulty: "medium",
        why: "The clouds are sulfuric acid. Swapping one plausible chemical for another reads perfectly smoothly.",
      },
    ],
  },
  {
    id: "everest",
    article: "Mount Everest",
    edits: [
      {
        original: "marks part of the China–Nepal border",
        altered: "marks part of the India–Nepal border",
        difficulty: "medium",
        why: "The summit is on the China–Nepal border. India is nowhere near it.",
      },
      {
        original: "Its height was most recently measured in 2020",
        altered: "Its height was most recently measured in 2010",
        difficulty: "hard",
        why: "The joint Nepalese and Chinese survey was in 2020. A date ten years out is invisible unless you happen to know it.",
      },
      {
        original: "is the highest mountain on Earth above sea level",
        altered: "is the second-highest mountain on Earth above sea level",
        difficulty: "obvious",
        why: "Everest is the highest. This is the one everybody catches, and it is here so that catching it does not feel like the whole game.",
      },
    ],
  },
  {
    id: "amazon",
    article: "Amazon rainforest",
    edits: [
      {
        original: "The majority of the forest, 60%, is in Brazil",
        altered: "The majority of the forest, 85%, is in Brazil",
        difficulty: "hard",
        why: "It is 60% in Brazil. 85% is still a plausible-sounding majority, which is exactly why it slips past.",
      },
      {
        original: "followed by Peru with 13%",
        altered: "followed by Bolivia with 13%",
        difficulty: "medium",
        why: "Peru holds the second-largest share. Swapping in a neighbouring country keeps the sentence reading naturally.",
      },
      {
        original: "territory belonging to nine nations",
        altered: "territory belonging to four nations",
        difficulty: "medium",
        why: "Nine nations. A smaller number sounds tidier, which is often how invented figures go.",
      },
    ],
  },
  {
    id: "bluewhale",
    article: "Blue whale",
    edits: [
      {
        original: "it is the largest animal known to have ever existed",
        altered: "it is the largest animal alive today, though not the largest ever",
        difficulty: "obvious",
        why: "The blue whale is the largest animal known to have existed at all, including every extinct one.",
      },
      {
        original: "Four subspecies are recognized",
        altered: "Eleven subspecies are recognized",
        difficulty: "medium",
        why: "Four. An inflated count in a technical sentence is the sort of thing readers skim straight past.",
      },
      {
        original: "a species of baleen whale",
        altered: "a species of toothed whale",
        difficulty: "hard",
        why: "Baleen, not toothed. Those two are the major division of whales, and getting it backwards is a real error that reads fluently.",
      },
    ],
  },
  {
    id: "greatwall",
    article: "Great Wall of China",
    edits: [
      {
        original: "The first walls date to the 7th century BC",
        altered: "The first walls date to the 2nd century AD",
        difficulty: "medium",
        why: "7th century BC, roughly nine hundred years earlier than the altered date, and on the other side of the era boundary.",
      },
      {
        original: "the best-known sections were built by the Ming dynasty (1368–1644)",
        altered: "the best-known sections were built by the Ming dynasty (1368–1912)",
        difficulty: "hard",
        why: "The Ming dynasty ended in 1644. 1912 is the end of imperial China altogether, so the number looks familiar and is attached to the wrong thing.",
      },
      {
        original: "various nomadic groups from the Eurasian Steppe",
        altered: "various nomadic groups from the Arabian Peninsula",
        difficulty: "obvious",
        why: "The Eurasian Steppe, to the north. The Arabian Peninsula is thousands of kilometres in the wrong direction.",
      },
    ],
  },
  {
    id: "chess",
    article: "Chess",
    edits: [
      { original: "played on a square board consisting of 64 squares arranged in an 8×8 grid",
        altered: "played on a square board consisting of 81 squares arranged in a 9×9 grid",
        difficulty: "obvious",
        why: "A chessboard is 8×8, sixty-four squares. 9×9 is a different game entirely." },
      { original: "each control sixteen pieces: one king, one queen, two rooks, two bishops, two knights, and eight pawns",
        altered: "each control sixteen pieces: one king, one queen, two rooks, two bishops, three knights, and seven pawns",
        difficulty: "hard",
        why: "Two knights and eight pawns. The total still adds to sixteen, which is exactly what makes a doctored list hard to catch." },
      { original: 'The players, referred to as "White" and "Black"',
        altered: 'The players, referred to as "White" and "Red"',
        difficulty: "medium",
        why: "White and Black. A colour swap reads perfectly naturally if you are skimming." },
    ],
  },
  {
    id: "penguin",
    article: "Penguin",
    edits: [
      { original: "which live almost exclusively in the Southern Hemisphere",
        altered: "which live almost exclusively in the Northern Hemisphere",
        difficulty: "obvious",
        why: "Southern Hemisphere. Penguins and polar bears famously never meet." },
      { original: "Only one species, the Galapagos penguin",
        altered: "Only one species, the Patagonian penguin",
        difficulty: "hard",
        why: "The Galapagos penguin is the one that reaches the equator. An invented species name in the same shape is very hard to catch." },
      { original: "Most penguins feed on krill, fish, squid",
        altered: "Most penguins feed on seaweed, fish, squid",
        difficulty: "medium",
        why: "Krill, not seaweed. Penguins are carnivorous." },
    ],
  },
  {
    id: "sahara",
    article: "Sahara",
    edits: [
      { original: "it is the largest hot desert in the world",
        altered: "it is the largest desert in the world",
        difficulty: "hard",
        why: "Largest *hot* desert. Antarctica is a larger desert overall, and the sentence right after this one says so. Dropping one word makes the passage contradict itself." },
      { original: "With an area of 9,200,000 square kilometres",
        altered: "With an area of 2,900,000 square kilometres",
        difficulty: "medium",
        why: "9.2 million square kilometres. The digits have been shuffled, which is the kind of error that survives a proofread." },
      { original: "a desert spanning North Africa",
        altered: "a desert spanning South Africa",
        difficulty: "obvious",
        why: "North Africa. South Africa is a country at the other end of the continent." },
    ],
  },
  {
    id: "bicycle",
    article: "Bicycle",
    edits: [
      { original: "The bicycle was invented in Europe in the 19th century",
        altered: "The bicycle was invented in Europe in the 17th century",
        difficulty: "medium",
        why: "19th century. Two hundred years early, and stated just as plainly." },
      { original: "there were more than 1 billion bicycles",
        altered: "there were more than 100 million bicycles",
        difficulty: "hard",
        why: "More than a billion. Both numbers sound like the sort of thing an encyclopedia says." },
      { original: "with two wheels attached to a frame, one behind the other",
        altered: "with three wheels attached to a frame, one behind the other",
        difficulty: "obvious",
        why: "Two wheels. It is in the word. Three would be a tricycle." },
    ],
  },
  {
    id: "antarctica",
    article: "Antarctica",
    edits: [
      { original: "Earth's southernmost and least-populated continent",
        altered: "Earth's southernmost and most sparsely forested continent",
        difficulty: "medium",
        why: "Least-populated. Antarctica has no forest at all, so the replacement is not merely wrong but meaningless." },
      { original: "Antarctica is the fifth-largest continent",
        altered: "Antarctica is the second-largest continent",
        difficulty: "hard",
        why: "Fifth-largest. Second would put it above North America, which the area given right after does not support." },
      { original: "it contains the geographic South Pole",
        altered: "it contains the geographic North Pole",
        difficulty: "obvious",
        why: "South Pole. The North Pole is in the Arctic Ocean, at the opposite end of the planet." },
    ],
  },
];

async function extractFor(article) {
  const base = "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&titles=";
  const fetchOnce = async (props) => {
    let response;
    for (let attempt = 0; attempt < 6; attempt++) {
      response = await fetch(`${base}${encodeURIComponent(article)}&${props}`, {
        headers: { "User-Agent": AGENT },
      });
      if (response.status !== 429) break;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
    if (!response?.ok) throw new Error(`${article}: HTTP ${response?.status}`);
    const page = (await response.json())?.query?.pages?.[0];
    if (!page || page.missing) throw new Error(`${article}: no such article`);
    return page;
  };

  const content = await fetchOnce("prop=extracts&explaintext=1&exintro=1");
  await new Promise((r) => setTimeout(r, 900));
  const meta = await fetchOnce("prop=revisions&rvprop=ids");
  await new Promise((r) => setTimeout(r, 900));

  return {
    title: content.title,
    revision: meta.revisions?.[0]?.revid ?? null,
    text: String(content.extract ?? "")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

/** Word-index range covering characters [from, to) of `text`. */
function wordRange(text, from, to) {
  const words = text.split(" ");
  let at = 0;
  let first = -1;
  let last = -1;
  for (let i = 0; i < words.length; i++) {
    const start = at;
    const end = at + words[i].length;
    if (end > from && start < to) {
      if (first === -1) first = i;
      last = i;
    }
    at = end + 1; // the space
  }
  return { first, last };
}

const main = async () => {
  const puzzles = [];

  for (const puzzle of PUZZLES) {
    process.stdout.write(`${puzzle.article} … `);

    let source;
    try {
      source = await extractFor(puzzle.article);
    } catch (error) {
      console.log(`FETCH FAILED (${error.message}) — dropped.`);
      continue;
    }

    /* A paragraph that stops mid-word ("brighter than any other na") reads as
       a broken file, and the reader is being asked to judge this text closely.
       So the cut runs on to the end of the sentence it lands in rather than
       stopping on the character count, and only falls back to a word boundary
       if the sentence runs away. Still a verbatim prefix of the cited
       revision, which is the thing that matters. */
    const original = endOfSentence(source.text, CHARS);

    // Every original must appear exactly once, inside the slice we are using.
    let usable = true;
    for (const edit of puzzle.edits) {
      const count = original.split(edit.original).length - 1;
      if (count !== 1) {
        console.log(
          `\n  "${edit.original.slice(0, 40)}…" appears ${count} times — dropped.`,
        );
        usable = false;
        break;
      }
    }
    if (!usable) continue;

    // Apply the alterations, then locate each one in the finished text.
    let text = original;
    for (const edit of puzzle.edits) {
      text = text.replace(edit.original, edit.altered);
    }

    const spans = [];
    for (const edit of puzzle.edits) {
      const from = text.indexOf(edit.altered);
      if (from < 0) {
        console.log(`\n  could not locate an altered span — dropped.`);
        usable = false;
        break;
      }
      const { first, last } = wordRange(text, from, from + edit.altered.length);
      spans.push({
        first,
        last,
        altered: edit.altered,
        original: edit.original,
        difficulty: edit.difficulty,
        why: edit.why,
      });
    }
    if (!usable) continue;

    // Spans must not overlap, or a single click would be ambiguous.
    const sorted = [...spans].sort((a, b) => a.first - b.first);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].first <= sorted[i - 1].last) {
        console.log(`\n  two alterations overlap — dropped.`);
        usable = false;
        break;
      }
    }
    if (!usable) continue;

    puzzles.push({
      id: puzzle.id,
      title: source.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(source.title)}`,
      revision: source.revision,
      text,
      words: text.split(" ").length,
      spans: sorted,
    });

    console.log(
      `ok — ${text.split(" ").length} words, ${sorted.length} alterations, rev ${source.revision}`,
    );
  }

  if (puzzles.length === 0) {
    throw new Error("No puzzle survived verification.");
  }

  const payload = {
    generatedBy: "data/scripts/build-hunt.mjs",
    builtOn: new Date().toISOString().slice(0, 10),
    source: {
      name: "Wikipedia",
      licence: "CC BY-SA 4.0",
      url: "https://en.wikipedia.org/wiki/Wikipedia:Copyrights",
      note: `The opening ${CHARS} characters of each article, fetched with its revision id. Every alteration was checked to match the source exactly before this file was written, so the answer key and the cited revision cannot drift apart.`,
    },
    charactersUsed: CHARS,
    puzzles,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${OUT}: ${puzzles.length} puzzles.`);
};

main().catch((error) => {
  console.error("\nBuild failed. Nothing was written.\n");
  console.error(error.message ?? error);
  process.exit(1);
});
