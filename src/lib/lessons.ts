import type { Ink } from "./ink";

/**
 * The syllabus: six chapters, three closers, and the rabbit hole.
 *
 * **The six chapters** are the spine and are meant to be played in order. Each
 * one is a single idea with a single game, and each game is a real measurement
 * you can be wrong about before you see it. One sitting, start to finish.
 *
 * **Before you go** is the part you take to work: a daily puzzle, your own week
 * sorted, and what you are willing to paste in.
 *
 * **Down the rabbit hole** is optional depth. Every one of these is linked from the
 * moment inside a chapter where you would actually want it, so nobody should ever
 * need to come here first.
 *
 * This registry is the single source of truth for navigation and progress.
 */

export type LessonStatus = "ready" | "building";
export type Track = "chapter" | "close" | "how" | "ml";

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
      "The whole thing, in order, in about an hour. Each chapter is one idea and one game, and every game makes you commit to a guess before it shows you what a real model actually did.",
  },
  close: {
    title: "Before you go",
    blurb:
      "The part you take to work. A puzzle that changes every day, your own week sorted into what you would hand over, and a hard look at what you are willing to paste in.",
  },
  ml: {
    title: "Machine learning from scratch",
    blurb:
      "The craft underneath all of it, from the first idea to the mistakes that cost people money. Every module is one real dataset, one thing you predict before you are shown, and one number that settles it. No maths beyond arithmetic is assumed.",
  },
  how: {
    title: "Down the rabbit hole",
    blurb:
      "Optional depth, as far down as you care to go. Every one of these is linked from the moment inside a chapter where you would actually want it, so you should never need to start here. Real tokenizers, real word vectors, real probabilities.",
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
      "It only knows what is in front of it right now: your prompt, this chat, your attachments. Nothing else.",
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
      "Treat it like a sharp new intern. Give it a role, a goal, constraints, a format, and an example of what good looks like.",
    nugget: "Delegate, do not converse.",
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
    nugget: "It helps most where you are weakest.",
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
      "Pasting is disclosing. And there is a line between using a tool and outsourcing your thinking.",
    nugget: "Anything you paste, you have already shared.",
    machine: "The Paste Test",
    minutes: 8,
    ink: "pink",
    status: "ready",
    feynman: "If this tool vanished tomorrow, could I still do my job?",
  },

  // ------------------------------------------- machine learning from scratch --
  {
    slug: "features-and-labels",
    track: "ml",
    number: 1,
    title: "Features and labels",
    standfirst:
      "Before anything can be learned, the thing in front of you has to become numbers. What survives that translation is all a model will ever know.",
    nugget: "A model sees your features, never your data.",
    machine: "The Feature Bench",
    minutes: 8,
    ink: "blue",
    status: "ready",
    feynman: "What did my data turn into, and what got thrown away?",
  },

  {
    slug: "train-and-test",
    track: "ml",
    number: 2,
    title: "Train and test",
    standfirst:
      "A model scored on the data it studied is a student marking their own homework. Lock some of it away before you start, or you will never know what you have.",
    nugget: "A perfect training score is the signature of memorising.",
    machine: "The Holdout",
    minutes: 8,
    ink: "teal",
    status: "ready",
    feynman: "Which data was that accuracy measured on?",
  },

  {
    slug: "accuracy-is-a-liar",
    track: "ml",
    number: 3,
    title: "Accuracy is a liar",
    standfirst:
      "A model does not decide. It scores, and somebody draws a line. Move the line and every number you report moves with it, in opposite directions.",
    nugget: "Which mistake would you rather make?",
    machine: "Where's the Line",
    minutes: 9,
    ink: "pink",
    status: "ready",
    feynman: "Precision or recall, and which one does this job need?",
  },

  {
    slug: "overfitting",
    track: "ml",
    number: 4,
    title: "Overfitting",
    standfirst:
      "Give a model enough freedom and it will explain your examples perfectly, including the parts of them that were accidents.",
    nugget: "How much model you can afford depends on how much data you have.",
    machine: "Pick the Model",
    minutes: 9,
    ink: "yellow",
    status: "ready",
    feynman: "Did it find a pattern, or memorise these particular examples?",
  },

  {
    slug: "cross-validation",
    track: "ml",
    number: 5,
    title: "How sure is that number?",
    standfirst:
      "One split gives one accuracy, and it is a sample of size one. Hold out a different slice and the number moves, sometimes far enough to change your mind.",
    nugget: "A single score has a wobble, and nobody prints it.",
    machine: "One Fold or Ten",
    minutes: 8,
    ink: "teal",
    status: "ready",
    feynman: "How much would that number move if I had split the data differently?",
  },

  {
    slug: "logistic-regression",
    track: "ml",
    number: 6,
    title: "From a line to a probability",
    standfirst:
      "Two numbers per message, one straight line between them, and a curve that turns distance from that line into how sure the model is.",
    nugget: "A classifier draws a line, then measures how far you are from it.",
    machine: "Read the Score",
    minutes: 9,
    ink: "blue",
    status: "ready",
    feynman: "What is the model actually drawing, and what does its number mean?",
  },

  {
    slug: "decision-trees",
    track: "ml",
    number: 7,
    title: "Twenty questions",
    standfirst:
      "Ask the question that removes most uncertainty, then ask again on each pile you are left with. That is a decision tree, and you can read one out loud.",
    nugget: "The same measure, applied over and over.",
    machine: "Grow the Tree",
    minutes: 8,
    ink: "yellow",
    status: "ready",
    feynman: "Could I explain this model's decision to the person it affects?",
  },

  {
    slug: "ensembles",
    track: "ml",
    number: 8,
    title: "Many weak opinions",
    standfirst:
      "Sixty poor models voting beat one good one, but only if they disagree with each other. A crowd of identical models is one model.",
    nugget: "A vote spends disagreement.",
    machine: "Worth the Crowd",
    minutes: 8,
    ink: "teal",
    status: "ready",
    feynman: "Do these models make the same mistakes, or different ones?",
  },

  {
    slug: "clustering",
    track: "ml",
    number: 9,
    title: "Learning with no labels",
    standfirst:
      "Nobody says what anything means. The algorithm is given vectors and a number, and it returns that many groups whether or not there are that many things to find.",
    nugget: "With no labels, there is nothing to be right about.",
    machine: "Odd One In",
    minutes: 8,
    ink: "pink",
    status: "ready",
    feynman: "Does this group mean anything, or did I ask for it?",
  },

  {
    slug: "more-data-or-better-model",
    track: "ml",
    number: 10,
    title: "More data, or a better model?",
    standfirst:
      "The argument every team has, settled by measurement. Both answers are right, at different points on the same curve.",
    nugget: "Where you are on the curve decides it.",
    machine: "Buy the Upgrade",
    minutes: 8,
    ink: "blue",
    status: "ready",
    feynman: "How much data do I have, and what is the next one worth?",
  },

  // --------------------------------------------------------- down the rabbit hole --
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
      "The mechanics behind forgetting, making things up, and inherited bias, and each one is measured.",
    machine: "Failure Bench",
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

/**
 * The order somebody reading straight through would meet them in.
 *
 * Machine learning sits after the rabbit hole rather than before it. The
 * rabbit hole explains the machine you have been using all afternoon; this is
 * a different and longer undertaking, and nobody arrives at it by accident.
 */
export const TRACK_ORDER: Track[] = ["chapter", "close", "how", "ml"];

/** Every lesson, end to end, across the four tracks. */
export const READING_ORDER: Lesson[] = TRACK_ORDER.flatMap(lessonsIn);

/**
 * Previous and next, read across the whole syllabus rather than within a track.
 *
 * It used to stop at the end of each track, which left two dead ends: the last
 * chapter did not offer the closers, and the last closer did not offer the
 * rabbit hole. Somebody who finished everything they were shown was told "that
 * is the set" while a third of the site sat unlinked.
 *
 * Crossing a boundary is a real change of register, so the caller is told which
 * track the next one belongs to and can say so.
 */
export function neighbours(slug: string): {
  previous?: Lesson;
  next?: Lesson;
} {
  const i = READING_ORDER.findIndex((l) => l.slug === slug);
  if (i < 0) return {};
  return {
    previous: i > 0 ? READING_ORDER[i - 1] : undefined,
    next: i < READING_ORDER.length - 1 ? READING_ORDER[i + 1] : undefined,
  };
}

export const TOTAL_MINUTES = LESSONS.reduce((sum, l) => sum + l.minutes, 0);
