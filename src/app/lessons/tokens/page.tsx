import { LessonShell } from "@/components/lesson/LessonShell";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { TokenChopper } from "@/components/games/TokenChopper";
import { TokenCostChart } from "@/components/machines/TokenCostChart";
import { TokenStrip } from "@/components/token-strip/TokenStrip";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { TOKEN_EXAMPLES } from "@/lib/tokenExamples";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("tokens")!;
const video = videoFor("tokens")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const strawberry = TOKEN_EXAMPLES.curiosities.find(
  (c) => c.id === "strawberry",
)!;
const spaced = TOKEN_EXAMPLES.curiosities.find(
  (c) => c.id === "strawberry-spaced",
)!;

const SOURCES: Source[] = [
  {
    title: "tiktoken — BPE tokeniser for OpenAI models",
    publisher: "OpenAI",
    url: "https://github.com/openai/tiktoken",
    used: "The o200k_base encoding behind every split, token id and score on this page.",
    licence: "MIT",
  },
  {
    title: "gpt-tokenizer",
    publisher: "Bane Sesevic",
    url: "https://github.com/niieani/gpt-tokenizer",
    used: "The JavaScript port that runs the tokenizer in your browser.",
    licence: "MIT",
  },
  {
    title: "Neural Machine Translation of Rare Words with Subword Units",
    publisher: "Sennrich, Haddow & Birch (ACL 2016)",
    url: "https://aclanthology.org/P16-1162/",
    used: "The paper that introduced byte-pair encoding for language models.",
  },
  {
    title: "Language Model Tokenizers Introduce Unfairness Between Languages",
    publisher: "Petrov, La Malfa, Torr & Bibi (NeurIPS 2023)",
    url: "https://arxiv.org/abs/2305.15425",
    used: "Independent measurement of the language cost gap shown in the chart.",
  },
];

const STEPS: Step[] = [
  {
    say: "A language model never sees your words. Before anything else happens, your text is chopped into pieces called tokens. The model only ever sees the pieces.",
    show: (
      <TokenStrip
        items={strawberry.tokens.map((t) => ({ text: t.text }))}
        size="lg"
      />
    ),
    caption: "The word strawberry, as the model receives it.",
  },
  {
    say: "Look at where it cut. Not at syllables, and not at meaning. It kept the chunks it had memorised, and left the rest in fragments.",
    show: (
      <TokenStrip
        items={strawberry.tokens.map((t) => ({ text: t.text, ink: "pink" }))}
        size="lg"
      />
    ),
    caption:
      "This is why models miscount the letters in strawberry — the r's were never separate things it saw.",
  },
  {
    say: "Add a space in front and the whole word becomes a single token. The space belongs to the token after it, which surprises almost everybody.",
    show: (
      <TokenStrip
        items={spaced.tokens.map((t) => ({ text: t.text, ink: "teal" }))}
        size="lg"
      />
    ),
    caption: "One token, where the bare word took three.",
  },
  {
    say: "Tokens are the unit everything is counted in. What you pay, how much fits in a conversation, how fast a reply arrives. And they are not shared out evenly between languages.",
    show: <TokenCostChart rows={TOKEN_EXAMPLES.multilingual} />,
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "Is a token the same thing as a word?",
    options: [
      "Yes — one word, one token",
      "No — it is a chunk of characters, sometimes shorter than a word, sometimes longer",
      "No — it is always a single character",
    ],
    answer: 1,
    because:
      "Common words are usually one token. Rare ones break into several, and a leading space rides along with the token after it.",
  },
  {
    prompt: "Why do models miscount the letters in 'strawberry'?",
    options: [
      "They cannot count at all",
      "It arrives as st, raw and berry, so the letters were never separate things it saw",
      "The word is too rare in training data",
    ],
    answer: 1,
    because:
      "You cut this word yourself in the game. The model reasons over chunks, so counting letters means reconstructing something it was never handed.",
  },
  {
    prompt: "Same sentence in English or in Hindi — which costs more to send?",
    options: [
      "English",
      "Hindi, by roughly two and a half times",
      "They cost the same",
    ],
    answer: 1,
    because:
      "Measured above: 8 tokens against 20. Merge tables are built mostly from English, so other scripts get chopped much finer.",
  },
];

export default function TokensLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <div className="pb-4" id="game">
        <TokenChopper />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <div className="space-y-4">
          <VideoPanel video={video} />
        </div>
      </div>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </div>
    </LessonShell>
  );
}
