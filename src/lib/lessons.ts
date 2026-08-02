import type { Ink } from "./ink";

/**
 * The syllabus, in two tracks.
 *
 * **Use it well** comes first and is the one most people need. It is built on
 * the Feynman rule: after each module you have to explain the idea out loud to
 * an imaginary twelve-year-old, and if you reach for jargon you do not
 * understand it yet. Every module carries that test and a real task to try.
 *
 * **How it works** is the machinery underneath, for anyone who wants to open
 * the box. Nothing in the first track depends on it.
 *
 * This registry is the single source of truth for navigation and progress.
 */

export type LessonStatus = "ready" | "building";
export type Track = "use" | "how";

export type Lesson = {
  slug: string;
  track: Track;
  /** Position within its own track, 1-indexed. */
  number: number;
  title: string;
  /** One line, on the home page and at the top of the module. */
  standfirst: string;
  /** What the learner plays. Written as a noun, because it is a thing. */
  machine: string;
  minutes: number;
  ink: Ink;
  status: LessonStatus;
  /**
   * The question you must be able to answer in plain words to have understood
   * this module. Present on every module in the practical track.
   */
  feynman?: string;
};

export const TRACKS: Record<Track, { title: string; blurb: string }> = {
  use: {
    title: "Use it well",
    blurb:
      "Eight modules on getting real work out of AI without getting caught out. No maths, no jargon. Start here.",
  },
  how: {
    title: "Open the machine",
    blurb:
      "Optional. Each of these is linked from the moment in a module where you would actually want it — you should never need to come here first. Real tokenizers, real word vectors, real probabilities.",
  },
};

export const LESSONS: Lesson[] = [
  // ------------------------------------------------------------ use it well --
  {
    slug: "what-an-llm-is",
    track: "use",
    number: 1,
    title: "What an LLM actually is",
    standfirst:
      "A very good next-word guesser, trained on an enormous amount of text. That is the whole trick.",
    machine: "Guess the next word",
    minutes: 7,
    ink: "blue",
    status: "ready",
    feynman: "Why does ChatGPT sometimes confidently make things up?",
  },
  {
    slug: "context-is-everything",
    track: "use",
    number: 2,
    title: "Context is everything",
    standfirst:
      "It knows what is in front of it right now. Your prompt, this chat, your attachments. Nothing else.",
    machine: "The conveyor",
    minutes: 7,
    ink: "teal",
    status: "ready",
    feynman: "Why does it forget what I said forty messages ago?",
  },
  {
    slug: "prompting-as-delegation",
    track: "use",
    number: 3,
    title: "Prompting as delegation",
    standfirst:
      "Treat it like a sharp new intern. Role, goal, constraints, format, and an example of good.",
    machine: "Assembly line",
    minutes: 8,
    ink: "yellow",
    status: "ready",
    feynman:
      "If I gave this instruction to a stranger, would they produce what I want?",
  },
  {
    slug: "where-it-breaks",
    track: "use",
    number: 4,
    title: "Where it breaks",
    standfirst:
      "Made-up facts, stale knowledge, caving the moment you push back, and arithmetic it cannot do.",
    machine: "Pressure test",
    minutes: 8,
    ink: "pink",
    status: "ready",
    feynman: "How would I catch this if it were wrong?",
  },
  {
    slug: "tools-change-the-game",
    track: "use",
    number: 5,
    title: "Tools change the game",
    standfirst:
      "Search, code and file access turn a guesser into a doer. Knowing which mode you are in tells you how far to trust it.",
    machine: "Which mode?",
    minutes: 7,
    ink: "blue",
    status: "ready",
    feynman: "Did it look this up, calculate it, or guess it?",
  },
  {
    slug: "task-audit",
    track: "use",
    number: 6,
    title: "The task audit",
    standfirst:
      "Sort your own week into four buckets. That list is your personal map of what to hand over.",
    machine: "Four buckets",
    minutes: 8,
    ink: "teal",
    status: "ready",
    feynman: "Which of my tasks would I be embarrassed to have handed over?",
  },
  {
    slug: "verification-habits",
    track: "use",
    number: 7,
    title: "Verification habits",
    standfirst:
      "Match how hard you check to what being wrong would cost. A typo is cheap. A wrong figure in a client deck is not.",
    machine: "Cost of wrong",
    minutes: 7,
    ink: "yellow",
    status: "ready",
    feynman: "What is the worst thing that happens if this output is wrong?",
  },
  {
    slug: "judgment-and-limits",
    track: "use",
    number: 8,
    title: "Judgment and limits",
    standfirst:
      "What you paste is data you have shared. And there is a line between using a tool and outsourcing your thinking.",
    machine: "Would you paste it?",
    minutes: 8,
    ink: "pink",
    status: "ready",
    feynman: "If this tool vanished tomorrow, could I still do my job?",
  },

  // ----------------------------------------------------------- how it works --
  {
    slug: "what-is-ai",
    track: "how",
    number: 1,
    title: "What AI actually is",
    standfirst:
      "Write rules to catch spam, watch them break, then let a machine find the rule for you.",
    machine: "Sorter",
    minutes: 8,
    ink: "blue",
    status: "ready",
    feynman: "What is the difference between AI and ordinary software?",
  },
  {
    slug: "how-models-learn",
    track: "how",
    number: 2,
    title: "How a model learns",
    standfirst:
      "Learning is rolling downhill in the dark. Take the wheel, then hand it over.",
    machine: "Descent",
    minutes: 8,
    ink: "teal",
    status: "ready",
    feynman: "What does it mean to say a model 'learned' something?",
  },
  {
    slug: "tokens",
    track: "how",
    number: 3,
    title: "Tokens",
    standfirst:
      "Before a model reads anything, it cuts your text into pieces. Cut them yourself.",
    machine: "Chop",
    minutes: 7,
    ink: "pink",
    status: "ready",
  },
  {
    slug: "embeddings",
    track: "how",
    number: 4,
    title: "Embeddings",
    standfirst:
      "Every word gets coordinates. Words that mean similar things end up as neighbours.",
    machine: "Magnet",
    minutes: 9,
    ink: "blue",
    status: "building",
  },
  {
    slug: "attention",
    track: "how",
    number: 5,
    title: "Attention",
    standfirst:
      "The trick that made modern AI work: every word gets to look at every other word.",
    machine: "Beam",
    minutes: 9,
    ink: "pink",
    status: "building",
  },
  {
    slug: "how-llms-answer",
    track: "how",
    number: 6,
    title: "How an LLM answers",
    standfirst:
      "It picks one token, then does it again. Watch the dice, and the dial that loads them.",
    machine: "Plinko",
    minutes: 8,
    ink: "yellow",
    status: "building",
  },
  {
    slug: "why-ai-gets-things-wrong",
    track: "how",
    number: 7,
    title: "Why the failures happen",
    standfirst:
      "The mechanics behind forgetting, making things up, and inherited bias — each one measured.",
    machine: "Failure bench",
    minutes: 10,
    ink: "teal",
    status: "building",
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}

export function lessonsIn(track: Track): Lesson[] {
  return LESSONS.filter((l) => l.track === track);
}

/** Previous and next within the same track — tracks are read end to end. */
export function neighbours(slug: string): {
  previous?: Lesson;
  next?: Lesson;
} {
  const lesson = getLesson(slug);
  if (!lesson) return {};
  const siblings = lessonsIn(lesson.track);
  const i = siblings.findIndex((l) => l.slug === slug);
  return {
    previous: i > 0 ? siblings[i - 1] : undefined,
    next: i < siblings.length - 1 ? siblings[i + 1] : undefined,
  };
}

export const TOTAL_MINUTES = LESSONS.reduce((sum, l) => sum + l.minutes, 0);
