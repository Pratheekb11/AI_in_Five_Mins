import type { Ink } from "./ink";

/**
 * The eight lessons, in the order they build on each other.
 *
 * This registry is the single source of truth for navigation, progress, and the
 * lesson map on the home page. Lesson *content* lives beside each lesson; this
 * file only carries what every surface needs to know about it.
 */

export type LessonStatus = "ready" | "building";

export type Lesson = {
  slug: string;
  /** Position in the sequence, 1-indexed. */
  number: number;
  title: string;
  /** One line, on the home page and at the top of the lesson. */
  standfirst: string;
  /** What the learner operates. Written as a noun, because it is a thing. */
  machine: string;
  /** Minutes, honest rather than flattering. */
  minutes: number;
  ink: Ink;
  status: LessonStatus;
};

export const LESSONS: Lesson[] = [
  {
    slug: "what-is-ai",
    number: 1,
    title: "What AI actually is",
    standfirst:
      "Write rules to catch spam, watch them break, then let a machine find the rule for you.",
    machine: "Rule bench",
    minutes: 8,
    ink: "blue",
    status: "building",
  },
  {
    slug: "how-models-learn",
    number: 2,
    title: "How a model learns",
    standfirst:
      "Learning is rolling downhill in the dark. Take the wheel, then hand it over.",
    machine: "Gradient hill",
    minutes: 8,
    ink: "teal",
    status: "building",
  },
  {
    slug: "tokens",
    number: 3,
    title: "Tokens",
    standfirst:
      "Before a model reads anything, it cuts your text into pieces. Here are the real pieces.",
    machine: "Live tokenizer",
    minutes: 7,
    ink: "pink",
    status: "building",
  },
  {
    slug: "embeddings",
    number: 4,
    title: "Embeddings",
    standfirst:
      "Every word gets coordinates. Words that mean similar things end up as neighbours.",
    machine: "Word chart",
    minutes: 10,
    ink: "blue",
    status: "building",
  },
  {
    slug: "attention",
    number: 5,
    title: "Attention",
    standfirst:
      "The trick that made modern AI work: every word gets to look at every other word.",
    machine: "Attention wiring",
    minutes: 10,
    ink: "pink",
    status: "building",
  },
  {
    slug: "how-llms-answer",
    number: 6,
    title: "How an LLM answers",
    standfirst:
      "It picks one token. Then does it again. Watch the dice, and the dial that loads them.",
    machine: "Next-token roulette",
    minutes: 9,
    ink: "yellow",
    status: "building",
  },
  {
    slug: "prompting",
    number: 7,
    title: "Writing better prompts",
    standfirst:
      "Four changes that reliably improve an answer, and why each one works.",
    machine: "Prompt bench",
    minutes: 8,
    ink: "yellow",
    status: "building",
  },
  {
    slug: "why-ai-gets-things-wrong",
    number: 8,
    title: "Why AI gets things wrong",
    standfirst:
      "Forgetting, making things up, and quietly inheriting our biases — each one demonstrated.",
    machine: "Failure bench",
    minutes: 11,
    ink: "teal",
    status: "building",
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}

export function neighbours(slug: string): {
  previous?: Lesson;
  next?: Lesson;
} {
  const i = LESSONS.findIndex((l) => l.slug === slug);
  if (i === -1) return {};
  return {
    previous: i > 0 ? LESSONS[i - 1] : undefined,
    next: i < LESSONS.length - 1 ? LESSONS[i + 1] : undefined,
  };
}

export const TOTAL_MINUTES = LESSONS.reduce((sum, l) => sum + l.minutes, 0);
