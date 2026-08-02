/**
 * Videos offered alongside the lessons.
 *
 * Every entry here was checked against YouTube's oEmbed endpoint, so the id
 * resolves, the channel is who it claims to be, and embedding is permitted.
 * Nothing is listed from memory — a wrong id is a broken lesson, and a
 * misattributed one is worse.
 *
 * Runtimes are deliberately absent. They are not returned by oEmbed, and
 * printing a length nobody measured would be exactly the kind of invented
 * detail the rest of this project refuses.
 */

export type Video = {
  youtubeId: string;
  title: string;
  channel: string;
  /** Why a learner on this particular lesson would want it. */
  why: string;
};

export const VIDEOS: Record<string, Video> = {
  "what-is-ai": {
    youtubeId: "aircAruvnKk",
    title: "But what is a neural network?",
    channel: "3Blue1Brown",
    why: "Watch what a network learning from examples actually looks like inside.",
  },
  "how-models-learn": {
    youtubeId: "IHZwWFHWa-w",
    title: "Gradient descent, how neural networks learn",
    channel: "3Blue1Brown",
    why: "The same downhill step you just steered, drawn in more dimensions.",
  },
  tokens: {
    youtubeId: "LPZh9BOjkQs",
    title: "Large Language Models explained briefly",
    channel: "3Blue1Brown",
    why: "Where tokens sit in the whole pipeline, in a few minutes.",
  },
  embeddings: {
    youtubeId: "wjZofJX0v4M",
    title: "Transformers, the tech behind LLMs",
    channel: "3Blue1Brown",
    why: "Opens with embeddings — words as directions in space — before going deeper.",
  },
  attention: {
    youtubeId: "eMlx5fFNoYc",
    title: "Attention in transformers, step-by-step",
    channel: "3Blue1Brown",
    why: "The clearest account of the mechanism you just wired by hand.",
  },
  "how-llms-answer": {
    youtubeId: "LPZh9BOjkQs",
    title: "Large Language Models explained briefly",
    channel: "3Blue1Brown",
    why: "Next-token prediction, end to end, without the maths.",
  },
  "why-ai-gets-things-wrong": {
    youtubeId: "zjkBMFhNj_g",
    title: "Intro to Large Language Models",
    channel: "Andrej Karpathy",
    why: "A long talk, but the section on how these models fail is worth it.",
  },
};

export function videoFor(slug: string): Video | undefined {
  return VIDEOS[slug];
}
