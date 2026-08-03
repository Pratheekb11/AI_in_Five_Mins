import type { Ink } from "./ink";

/**
 * The syllabus: six chapters, three closers, and the machine room.
 *
 * **The six chapters** are the spine and are meant to be played in order. Each
 * one is a single idea with a single game, and each game is a real measurement
 * you can be wrong about before you see it. One sitting, start to finish.
 *
 * **Before you go** is the part you take to work: a daily puzzle, your own week
 * sorted, and what you are willing to paste in.
 *
 * **Open the machine** is optional depth. Every one of these is linked from the
 * moment inside a chapter where you would actually want it, so nobody should ever
 * need to come here first.
 *
 * This registry is the single source of truth for navigation and progress.
 */

export type LessonStatus = "ready" | "building";
export type Track = "chapter" | "close" | "how";

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
  /** The one thing you should still know a month later. Chapters and closers. */
  nugget?: string;
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
  chapter: {
    title: "The six chapters",
    blurb:
      "The whole thing, in order, in about an hour. Every chapter is one idea and one game, and every game is a real measurement you get to be wrong about before you see it.",
  },
  close: {
    title: "Before you go",
    blurb:
      "The part you take to work. A puzzle that changes daily, your own week sorted into what you would hand over, and a hard look at what you are willing to paste in.",
  },
  how: {
    title: "Open the machine",
    blurb:
      "Optional depth. Each of these is linked from the moment inside a chapter where you would actually want it — you should never need to come here first. Real tokenizers, real word vectors, real probabilities.",
  },
};

export const LESSONS: Lesson[] = [
  // ----------------------------------------------------------- the chapters --
  {
    slug: "what-an-llm-is",
    track: "chapter",
    number: 1,
    title: "What an LLM actually is",
    standfirst:
      "A very good next-word guesser, trained on an enormous amount of text. That is the whole trick.",
    nugget: "It predicts what sounds right, not what is right.",
    machine: "Beat the Predictor",
    minutes: 7,
    ink: "blue",
    status: "ready",
    feynman: "Why does ChatGPT sometimes confidently make things up?",
  },
  {
    slug: "tokens",
    track: "chapter",
    number: 2,
    title: "Tokens",
    standfirst:
      "Before a model reads anything, it cuts your text into pieces. Cut them yourself.",
    nugget: "It sees chunks, not letters.",
    machine: "Token Chopper",
    minutes: 7,
    ink: "pink",
    status: "ready",
  },
  {
    slug: "context-is-everything",
    track: "chapter",
    number: 3,
    title: "Context is everything",
    standfirst:
      "It knows what is in front of it right now. Your prompt, this chat, your attachments. Nothing else.",
    nugget: "No context, no chance.",
    machine: "Context Budget",
    minutes: 7,
    ink: "teal",
    status: "ready",
    feynman: "Why does it forget what I said forty messages ago?",
  },
  {
    slug: "prompting-as-delegation",
    track: "chapter",
    number: 4,
    title: "Prompting as delegation",
    standfirst:
      "Treat it like a sharp new intern. Role, goal, constraints, format, and an example of good.",
    nugget: "Delegate, don't converse.",
    machine: "Show, Don't Ask",
    minutes: 8,
    ink: "yellow",
    status: "ready",
    feynman:
      "If I gave this instruction to a stranger, would they produce what I want?",
  },
  {
    slug: "where-it-breaks",
    track: "chapter",
    number: 5,
    title: "Where it breaks",
    standfirst:
      "Made-up facts, stale knowledge, caving the moment you push back, and arithmetic it cannot do.",
    nugget: "Agreeable is not the same as correct.",
    machine: "Pushback",
    minutes: 8,
    ink: "pink",
    status: "ready",
    feynman: "How would I catch this if it were wrong?",
  },
  {
    slug: "tools-change-the-game",
    track: "chapter",
    number: 6,
    title: "Tools change the game",
    standfirst:
      "Search, code and file access turn a guesser into a doer. Knowing which mode you are in tells you how far to trust it.",
    nugget: "Guessed, looked up, or calculated?",
    machine: "Provenance Detective",
    minutes: 7,
    ink: "blue",
    status: "ready",
    feynman: "Did it look this up, calculate it, or guess it?",
  },

  // ------------------------------------------------------------ before you go --
  {
    slug: "verification-habits",
    track: "close",
    number: 1,
    title: "Verification habits",
    standfirst:
      "Match how hard you check to what being wrong would cost. A typo is cheap. A wrong figure in a client deck is not.",
    nugget: "A wrong answer reads exactly like a right one.",
    machine: "Hallucination Hunt",
    minutes: 7,
    ink: "yellow",
    status: "ready",
    feynman: "What is the worst thing that happens if this output is wrong?",
  },
  {
    slug: "task-audit",
    track: "close",
    number: 2,
    title: "The task audit",
    standfirst:
      "Sort your own week into four buckets. That list is your personal map of what to hand over.",
    nugget: "Your own week, sorted — and no score for it.",
    machine: "The Bucket Sort",
    minutes: 8,
    ink: "teal",
    status: "ready",
    feynman: "Which of my tasks would I be embarrassed to have handed over?",
  },
  {
    slug: "judgment-and-limits",
    track: "close",
    number: 3,
    title: "Judgment and limits",
    standfirst:
      "What you paste is data you have shared. And there is a line between using a tool and outsourcing your thinking.",
    nugget: "What you paste is data you have shared.",
    machine: "Would you paste it?",
    minutes: 8,
    ink: "pink",
    status: "ready",
    feynman: "If this tool vanished tomorrow, could I still do my job?",
  },

  // ----------------------------------------------------------- open the machine --
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
    slug: "embeddings",
    track: "how",
    number: 3,
    title: "Embeddings",
    standfirst:
      "Every word gets coordinates. Words that mean similar things end up as neighbours.",
    machine: "Magnet",
    minutes: 9,
    ink: "blue",
    status: "ready",
  },
  {
    slug: "attention",
    track: "how",
    number: 4,
    title: "Attention",
    standfirst:
      "The trick that made modern AI work: every word gets to look at every other word.",
    machine: "Beam",
    minutes: 9,
    ink: "pink",
    status: "ready",
  },
  {
    slug: "how-llms-answer",
    track: "how",
    number: 5,
    title: "How an LLM answers",
    standfirst:
      "It picks one token, then does it again. Watch the dice, and the dial that loads them.",
    machine: "Plinko",
    minutes: 8,
    ink: "yellow",
    status: "ready",
  },
  {
    slug: "why-ai-gets-things-wrong",
    track: "how",
    number: 6,
    title: "Why the failures happen",
    standfirst:
      "The mechanics behind forgetting, making things up, and inherited bias — each one measured.",
    machine: "Failure bench",
    minutes: 10,
    ink: "teal",
    status: "ready",
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
