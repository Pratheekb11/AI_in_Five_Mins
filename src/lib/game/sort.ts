/**
 * The Bucket Sort — the endgame, and deliberately not a game.
 *
 * Everything else on the site measures something and then scores you against
 * it. This one cannot and does not. Which of your own tasks you are willing to
 * hand over depends on your job, your risk, and what happens to you when it is
 * wrong, and nobody building a website knows any of that. So there is no timer,
 * no throughput, no right answer and no score.
 *
 * What it does instead is connect each choice to something the site actually
 * measured. Put "answer a legal question about your contract" in the hand-over
 * tray and you are told, with the number, that the same model ranked the true
 * answer 811th until the source was in front of it. The judgement stays yours;
 * the evidence stops being vague.
 *
 * The mapping from a task to the evidence that bears on it is our editorial
 * call and is labelled as such wherever it appears. The measurements it points
 * at are not.
 *
 * The output is a written map you can copy out and keep, because a sorting
 * exercise you cannot take away with you was a waste of your afternoon.
 */

/* ---------------------------------------------------------------- buckets -- */

export type BucketId = "hand" | "draft" | "think" | "keep";

export type Bucket = {
  id: BucketId;
  key: string;
  label: string;
  /** What choosing this actually commits you to. */
  means: string;
};

export const BUCKETS: readonly Bucket[] = [
  {
    id: "hand",
    key: "1",
    label: "Hand over",
    means: "It does the work and you skim the result.",
  },
  {
    id: "draft",
    key: "2",
    label: "Draft with",
    means: "It writes the first version and you finish it.",
  },
  {
    id: "think",
    key: "3",
    label: "Think with",
    means: "You do the work and it argues with you while you do.",
  },
  {
    id: "keep",
    key: "4",
    label: "Keep",
    means: "You do this yourself, start to finish.",
  },
];

export function bucketOf(id: BucketId): Bucket {
  return BUCKETS.find((b) => b.id === id)!;
}

/* --------------------------------------------------------------- evidence -- */

/**
 * The findings from the six chapters, each with the number that makes it real.
 *
 * Every one of these is measured elsewhere on this site and the wording here
 * points at that measurement rather than restating it loosely.
 */
export type EvidenceId =
  | "guesses"
  | "needs-source"
  | "needs-tool"
  | "copies-you"
  | "context"
  | "reads-fluent";

export const EVIDENCE: Record<
  EvidenceId,
  { finding: string; where: string; slug: string }
> = {
  guesses: {
    finding:
      "It produces what usually follows, not what is true. Asked where Paris is the capital of, it put 30% on the word “the” and under 2% on France.",
    where: "Beat the Predictor",
    slug: "what-an-llm-is",
  },
  "needs-source": {
    finding:
      "Cold, it ranked the right answer 811th out of 50,257. With the source in front of it, 98.6%. Nothing about the model changed — only what it could see.",
    where: "Provenance Detective",
    slug: "tools-change-the-game",
  },
  "needs-tool": {
    finding:
      "It got 0 of 200 two-digit sums right. Asked “41 + 45 =” it answers “ 0.5%”. No document fixes this, because the work is not recall.",
    where: "Provenance Detective",
    slug: "tools-change-the-game",
  },
  "copies-you": {
    finding:
      "Assert the wrong answer first and it comes out 89.7% wrong. Assert the right one and 96.4% right. It is not agreeing with you, it is copying you.",
    where: "Pushback",
    slug: "where-it-breaks",
  },
  context: {
    finding:
      "What you put in front of it is most of the answer — and the most helpful-looking card in the pile, a worked example, dropped the right answer from 89.9% to 3.8%.",
    where: "Context Budget",
    slug: "context-is-everything",
  },
  "reads-fluent": {
    finding:
      "A wrong answer reads exactly as smoothly as a right one. There is no tell in the prose, because the prose was never the thing that made it true.",
    where: "Hallucination Hunt",
    slug: "verification-habits",
  },
};

/* ------------------------------------------------------------------ tasks -- */

/** Whether a mistake stays in the building or does not. */
export type Exposure = "inside" | "outside";

export type SortTask = {
  text: string;
  exposure: Exposure;
  /** Which findings bear on this one. Our editorial call, labelled as such. */
  evidence: EvidenceId[];
  /** Marks a task the reader typed in themselves. */
  mine?: boolean;
};

export const TASKS: readonly SortTask[] = [
  { text: "Write the weekly team update", exposure: "inside", evidence: ["context"] },
  { text: "Reply to a customer complaint", exposure: "outside", evidence: ["reads-fluent", "context"] },
  { text: "Summarise a 40-page report you must act on", exposure: "inside", evidence: ["context", "reads-fluent"] },
  { text: "Draft a job advert for your own team", exposure: "outside", evidence: ["context"] },
  { text: "Decide who to promote", exposure: "inside", evidence: ["copies-you"] },
  { text: "Turn messy notes into clean meeting minutes", exposure: "inside", evidence: ["context"] },
  { text: "Name a new internal project", exposure: "inside", evidence: ["guesses"] },
  { text: "Write the numbers section of a board pack", exposure: "outside", evidence: ["needs-tool", "reads-fluent"] },
  { text: "Rewrite a paragraph that reads badly", exposure: "inside", evidence: ["context"] },
  { text: "Answer a legal question about your contract", exposure: "outside", evidence: ["needs-source", "reads-fluent"] },
  { text: "Brainstorm ten angles for a talk", exposure: "inside", evidence: ["guesses"] },
  { text: "Tell a colleague their work is not good enough", exposure: "inside", evidence: ["copies-you"] },
  { text: "Translate a message into a language you cannot read", exposure: "outside", evidence: ["reads-fluent"] },
  { text: "Write test cases for code you wrote", exposure: "inside", evidence: ["context"] },
  { text: "Set this quarter's priorities", exposure: "inside", evidence: ["copies-you"] },
  { text: "Draft a condolence note to a colleague", exposure: "inside", evidence: ["copies-you"] },
  { text: "Convert a spreadsheet into a chart", exposure: "inside", evidence: ["needs-tool"] },
  { text: "Decide whether to fire a supplier", exposure: "outside", evidence: ["copies-you"] },
  { text: "Write a first draft of a press release", exposure: "outside", evidence: ["context", "reads-fluent"] },
  { text: "Explain a concept you half understand to your boss", exposure: "inside", evidence: ["guesses", "reads-fluent"] },
  { text: "Catch the errors in your own argument", exposure: "inside", evidence: ["copies-you"] },
  { text: "Fill in a routine compliance form", exposure: "outside", evidence: ["needs-source"] },
  { text: "Write the quote that goes to a client", exposure: "outside", evidence: ["needs-tool", "reads-fluent"] },
  { text: "Plan the running order of a workshop", exposure: "inside", evidence: ["context"] },
  { text: "Reply to a recruiter you are not interested in", exposure: "outside", evidence: ["context"] },
  { text: "Decide what to cut when the deadline moves", exposure: "inside", evidence: ["copies-you"] },
  { text: "Tidy the formatting of a long document", exposure: "inside", evidence: ["context"] },
  { text: "Write the apology after your team got it wrong", exposure: "outside", evidence: ["copies-you", "reads-fluent"] },
];

/* ------------------------------------------------------------------ scene -- */

export type SortScene = {
  deck: SortTask[];
  at: number;
  /** Task text to the bucket it was put in. */
  placed: Record<string, BucketId>;
  done: boolean;
};

export function newScene(): SortScene {
  return { deck: [], at: 0, placed: {}, done: false };
}

export function shuffledBy<T>(items: readonly T[], rolls: number[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor((rolls[i] ?? 0) * (i + 1)));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/** Your own tasks first — the generic ones are only there to prime the pump. */
export function start(
  mine: readonly SortTask[],
  rolls: number[],
  count = 14,
): SortScene {
  const theirs = shuffledBy(TASKS, rolls).slice(0, Math.max(0, count - mine.length));
  return { ...newScene(), deck: [...mine, ...theirs] };
}

export function current(scene: SortScene): SortTask | undefined {
  return scene.deck[scene.at];
}

export function place(scene: SortScene, bucket: BucketId): SortScene {
  const task = current(scene);
  if (!task || scene.done) return scene;
  return { ...scene, placed: { ...scene.placed, [task.text]: bucket } };
}

export function advance(scene: SortScene): SortScene {
  const task = current(scene);
  if (!task || scene.placed[task.text] === undefined) return scene;
  const at = scene.at + 1;
  if (at >= scene.deck.length) return { ...scene, done: true };
  return { ...scene, at };
}

export function back(scene: SortScene): SortScene {
  return scene.at === 0 ? scene : { ...scene, at: scene.at - 1, done: false };
}

/** The finished map, grouped the way it will be read. */
export function mapOf(scene: SortScene): Record<BucketId, SortTask[]> {
  const out: Record<BucketId, SortTask[]> = {
    hand: [],
    draft: [],
    think: [],
    keep: [],
  };
  for (const task of scene.deck) {
    const bucket = scene.placed[task.text];
    if (bucket) out[bucket].push(task);
  }
  return out;
}

/** The map as plain text, for copying out. */
export function asText(scene: SortScene): string {
  const map = mapOf(scene);
  const lines: string[] = ["My AI task map", ""];
  for (const bucket of BUCKETS) {
    const tasks = map[bucket.id];
    if (tasks.length === 0) continue;
    lines.push(`${bucket.label} — ${bucket.means}`);
    for (const task of tasks) lines.push(`  - ${task.text}`);
    lines.push("");
  }
  lines.push(
    "Sorted at LearnLoopAI. The sorting is mine; the evidence behind it is measured.",
  );
  return lines.join("\n");
}
