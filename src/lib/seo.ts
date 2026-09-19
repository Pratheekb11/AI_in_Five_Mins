import { LESSONS, type Lesson } from "./lessons";

/**
 * What a searcher types, per page.
 *
 * On-page copy is the site's own voice and none of this touches it. A lesson
 * headed "Where it breaks" is the right words on the page and the wrong words
 * in a result list, because nobody searches for it. So the document title and
 * the description are written for the query, the `<h1>` is left alone, and the
 * two live in separate places on purpose.
 *
 * `keywords` is here because it is asked for. Google has ignored the tag since
 * 2009 and Bing treats it as a spam signal at volume, so these stay short,
 * true of the page, and are never the reason a page ranks. The work that does
 * pay is the title, the description, the headings already on the page, and the
 * structured data in `structured.ts`.
 */
export type LessonSeo = {
  /** Document title only. Under 48 characters, because the root template
      appends " · AIinFive" and Google truncates around 60. */
  title: string;
  /** 150 to 160 characters. Does not rank; decides whether anybody clicks. */
  description: string;
  keywords: string[];
};

/** Words that describe the whole site, on every page. */
export const SITE_KEYWORDS = [
  "AI for beginners",
  "learn AI",
  "how AI works",
  "interactive AI course",
  "free AI course",
  "AI literacy",
  "LLM explained",
  "machine learning for beginners",
];

const SEO: Record<string, LessonSeo> = {
  // ----------------------------------------------------------- the chapters --
  "what-an-llm-is": {
    title: "What is an LLM? Play a round against one",
    description:
      "What a large language model actually is: a next-word guesser. Beat a real model at its own game, then see the probabilities it answered with.",
    keywords: [
      "what is an LLM",
      "large language model explained",
      "how does ChatGPT work",
      "next word prediction",
      "why does AI make things up",
    ],
  },
  tokens: {
    title: "What are AI tokens? Live tokenizer",
    description:
      "Models do not read letters, they read tokens. Type anything and watch the real GPT-4o tokenizer cut it up, and see why strawberry has three of them.",
    keywords: [
      "what are tokens in AI",
      "tokenizer",
      "how many tokens",
      "token cost",
      "why can't ChatGPT count letters",
      "BPE tokenization",
    ],
  },
  "context-is-everything": {
    title: "What is a context window in AI?",
    description:
      "A model only knows what is in front of it. See measured answers collapse from 89.9% to 3.8% when the wrong things are in the context window.",
    keywords: [
      "what is a context window",
      "context window explained",
      "why does ChatGPT forget",
      "AI memory",
      "prompt context",
    ],
  },
  "prompting-as-delegation": {
    title: "How to write better AI prompts",
    description:
      "Prompt engineering without the folklore. Measured on a real model: polite instructions changed almost nothing, one worked example changed everything.",
    keywords: [
      "how to write AI prompts",
      "prompt engineering for beginners",
      "better ChatGPT prompts",
      "few shot prompting",
      "prompt examples",
    ],
  },
  "where-it-breaks": {
    title: "Why AI agrees with you when wrong",
    description:
      "Made-up facts, stale knowledge and caving the second you push back. Measured: assert a falsehood first and a real model repeats it 89.7% of the time.",
    keywords: [
      "why does AI make things up",
      "AI hallucination",
      "ChatGPT agrees with everything",
      "sycophancy in AI",
      "AI limitations",
    ],
  },
  "tools-change-the-game": {
    title: "Why AI cannot do maths on its own",
    description:
      "Guessed, looked up, or calculated? The same model knows New Delhi at 93% and scores 0 out of 200 on arithmetic. Why tools and search change the answer.",
    keywords: [
      "why can't ChatGPT do math",
      "AI tool use",
      "retrieval augmented generation",
      "does AI search the web",
      "AI calculator",
    ],
  },

  // ---------------------------------------------------------- before you go --
  "verification-habits": {
    title: "How to fact-check AI answers",
    description:
      "A wrong answer reads exactly like a right one. Find three planted errors in a real Wikipedia paragraph, then match how hard you check to what wrong costs.",
    keywords: [
      "how to fact check ChatGPT",
      "verify AI output",
      "spot AI errors",
      "AI fact checking",
      "lateral reading",
    ],
  },
  "task-audit": {
    title: "Which tasks should you hand to AI?",
    description:
      "Sort your own week into four buckets and get a personal map of what to delegate. Built on the published jagged-frontier and skill-gap findings.",
    keywords: [
      "what tasks can AI do",
      "AI at work",
      "automate my job with AI",
      "AI productivity",
      "jagged frontier",
    ],
  },
  "judgment-and-limits": {
    title: "Is it safe to paste work into ChatGPT?",
    description:
      "Pasting is disclosing. Walk a real request line by line, see what identifies somebody, and work out where your own line sits before you need it.",
    keywords: [
      "is ChatGPT safe for work",
      "can I paste confidential data into AI",
      "AI privacy at work",
      "AI data risk",
      "AI ethics for beginners",
    ],
  },

  // ------------------------------------------ machine learning from scratch --
  "features-and-labels": {
    title: "Features and labels in machine learning",
    description:
      "Data has to become numbers before anything can learn from it. On 5,574 real messages, message length beats the word free: 0.167 bits against 0.063.",
    keywords: [
      "features and labels",
      "what is a feature in machine learning",
      "feature engineering basics",
      "supervised learning",
      "training data",
    ],
  },
  "train-and-test": {
    title: "Train test split, by doing it",
    description:
      "A model scored on the data it studied is marking its own homework. A lookup table scores 100% on training and 89.2% on data it has never seen.",
    keywords: [
      "train test split",
      "training and test data",
      "holdout set",
      "why split data",
      "overfitting vs generalisation",
    ],
  },
  "accuracy-is-a-liar": {
    title: "Precision vs recall, and the threshold",
    description:
      "One model, one slider. Catch 155 of 156 spam with 798 false alarms, or zero false alarms and 48 missed. Accuracy hides both, and flagging nothing scores 86%.",
    keywords: [
      "precision vs recall",
      "accuracy is misleading",
      "classification threshold",
      "imbalanced data",
      "confusion matrix explained",
    ],
  },
  overfitting: {
    title: "What is overfitting? Watch it happen",
    description:
      "Give a model enough freedom and it memorises accidents. A degree-11 curve fits the training data twice as well and predicts 343 tokens for one sentence.",
    keywords: [
      "what is overfitting",
      "overfitting vs underfitting",
      "model complexity",
      "bias variance tradeoff",
      "regularisation",
    ],
  },
  "cross-validation": {
    title: "What is cross validation?",
    description:
      "One split gives one accuracy, and that is a sample of size one. Ten folds put the real figure at 98.87% plus or minus 0.46. A small model wobbles harder.",
    keywords: [
      "what is cross validation",
      "k-fold cross validation",
      "how reliable is model accuracy",
      "validation set",
      "model evaluation",
    ],
  },
  "logistic-regression": {
    title: "Logistic regression, explained simply",
    description:
      "A straight line, then a curve that turns distance from it into a probability. Two features, real gradient descent, 96.8% on messages it has never seen.",
    keywords: [
      "logistic regression explained",
      "sigmoid function",
      "how does a classifier work",
      "decision boundary",
      "binary classification",
    ],
  },
  "decision-trees": {
    title: "How decision trees work",
    description:
      "Ask the question that removes most uncertainty, then ask again on each pile. Grow a real tree and read its decisions out loud, one split at a time.",
    keywords: [
      "how decision trees work",
      "decision tree explained",
      "information gain",
      "entropy in machine learning",
      "interpretable models",
    ],
  },
  ensembles: {
    title: "Random forests: why weak models win",
    description:
      "Sixty poor models voting beat one good model, but only when they disagree. Measured: stumps go 93.27% to 95.87%, and identical trees gain exactly nothing.",
    keywords: [
      "random forest explained",
      "what is an ensemble model",
      "bagging and boosting",
      "why do ensembles work",
      "decision tree vs random forest",
    ],
  },
  clustering: {
    title: "K-means clustering, by doing it",
    description:
      "No labels, so nothing to be right about. Watch 1,851 real word vectors sort themselves over 35 passes, and see why nothing in the data picks the number of groups.",
    keywords: [
      "k-means clustering explained",
      "unsupervised learning",
      "how does clustering work",
      "how to choose k",
      "word vectors",
    ],
  },
  "more-data-or-better-model": {
    title: "More data, or a better model?",
    description:
      "The argument every team has, settled by measurement. Four learning curves cross: the same model is worse than a hand rule at 20 examples and 98.7% at 4,459.",
    keywords: [
      "more data or better model",
      "learning curve machine learning",
      "how much training data do I need",
      "data vs algorithm",
      "model selection",
    ],
  },

  // ----------------------------------------------------- down the rabbit hole --
  "what-is-ai": {
    title: "What is AI? Build a spam filter",
    description:
      "The difference between AI and ordinary software, in one experiment. Write rules to catch spam, watch them stall at 97.3%, then let a machine find the rule.",
    keywords: [
      "what is AI",
      "AI vs traditional software",
      "what is machine learning",
      "naive Bayes spam filter",
      "AI explained for beginners",
    ],
  },
  "how-models-learn": {
    title: "How do AI models learn?",
    description:
      "Training is rolling downhill in the dark. Take the wheel on real gradient descent over 140 sentences, then watch it find 4.083 characters per token by itself.",
    keywords: [
      "how do AI models learn",
      "gradient descent explained",
      "how neural networks train",
      "loss function",
      "model training basics",
    ],
  },
  embeddings: {
    title: "What are word embeddings?",
    description:
      "Every word gets coordinates, and words that mean similar things end up neighbours. Run king minus man plus woman on real GloVe vectors and see what lands.",
    keywords: [
      "what are embeddings",
      "word embeddings explained",
      "word2vec king man woman",
      "vector similarity",
      "cosine similarity",
    ],
  },
  attention: {
    title: "How attention works in transformers",
    description:
      "The trick that made modern AI work: every word gets to look at every other word. Real attention weights from a real model, drawn as beams you can follow.",
    keywords: [
      "how attention works",
      "self attention explained",
      "transformer architecture",
      "attention is all you need",
      "query key value",
    ],
  },
  "how-llms-answer": {
    title: "How does an LLM pick the next word?",
    description:
      "It picks one token, then does it again. Watch real probabilities load the dice, and turn the temperature dial to see the same prompt change its mind.",
    keywords: [
      "how does an LLM generate text",
      "temperature setting AI",
      "top-p sampling",
      "why is ChatGPT random",
      "next token prediction",
    ],
  },
  "why-ai-gets-things-wrong": {
    title: "Why do LLMs hallucinate?",
    description:
      "The mechanics behind forgetting, making things up and inherited bias, each one measured on a real model rather than described. Three faults, one instrument.",
    keywords: [
      "why do LLMs hallucinate",
      "AI hallucination explained",
      "why is AI biased",
      "AI knowledge cutoff",
      "limits of language models",
    ],
  },
};

/** The search-facing copy for a lesson, falling back to its own words. */
export function lessonSeo(lesson: Lesson): LessonSeo {
  return (
    SEO[lesson.slug] ?? {
      title: lesson.title,
      description: lesson.standfirst,
      keywords: SITE_KEYWORDS,
    }
  );
}

/** Every slug this file covers, for the test that says none may be missing. */
export function seoSlugs(): string[] {
  return Object.keys(SEO);
}

/** What a lesson page teaches, for `LearningResource.teaches`. */
export function teaches(lesson: Lesson): string[] {
  const out = [lesson.nugget, lesson.feynman].filter(
    (line): line is string => typeof line === "string",
  );
  return out.length > 0 ? out : [lesson.standfirst];
}

/** Guard against a lesson being added without search copy. */
export const READY_SLUGS = LESSONS.filter((l) => l.status === "ready").map(
  (l) => l.slug,
);
