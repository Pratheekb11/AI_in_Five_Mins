import { Beat } from "@/components/lesson/Beat";
import { LessonShell } from "@/components/lesson/LessonShell";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { LiveTokenizer } from "@/components/machines/LiveTokenizer";
import { TokenCostChart } from "@/components/machines/TokenCostChart";
import { TokenCuriosities } from "@/components/machines/TokenCuriosities";
import { TokenGuessGame } from "@/components/machines/TokenGuessGame";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { TOKEN_EXAMPLES } from "@/lib/tokenExamples";

const lesson = getLesson("tokens")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "tiktoken — BPE tokeniser for OpenAI models",
    publisher: "OpenAI",
    url: "https://github.com/openai/tiktoken",
    used: "The o200k_base encoding, which defines every split and token id shown on this page.",
    licence: "MIT",
  },
  {
    title: "gpt-tokenizer",
    publisher: "Bane Sesevic",
    url: "https://github.com/niieani/gpt-tokenizer",
    used: "The JavaScript port of tiktoken that runs the live tokenizer in your browser.",
    licence: "MIT",
  },
  {
    title: "Neural Machine Translation of Rare Words with Subword Units",
    publisher: "Sennrich, Haddow & Birch (ACL 2016)",
    url: "https://aclanthology.org/P16-1162/",
    used: "The paper that introduced byte-pair encoding for language models — why splitting below the word is done at all.",
  },
  {
    title: "Language Model Tokenizers Introduce Unfairness Between Languages",
    publisher: "Petrov, La Malfa, Torr & Bibi (NeurIPS 2023)",
    url: "https://arxiv.org/abs/2305.15425",
    used: "Peer-reviewed measurement of the same effect the language chart shows: identical meaning costs far more tokens in some scripts.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "Is a token the same thing as a word?",
    options: [
      "Yes — one word, one token",
      "No — a token is a chunk of characters, sometimes shorter than a word and sometimes longer",
      "No — a token is always a single character",
    ],
    answer: 1,
    because:
      "Common words are usually one token. Rare or misspelled words break into several, and a leading space is part of the token that follows it. Nothing guarantees a one-to-one match with words.",
  },
  {
    prompt:
      "Models are famously bad at counting the letters in 'strawberry'. Why?",
    options: [
      "They cannot count at all",
      "The word arrives as st + raw + berry, so the individual letters were never separate things the model saw",
      "The word is too rare in training data",
    ],
    answer: 1,
    because:
      "You can see this above: the tokenizer splits strawberry into three chunks. The model reasons over those chunks, not over letters, so counting characters means reconstructing something it was never given.",
  },
  {
    prompt:
      "You are paying per token. Which costs more to send: the same sentence in English, or in Hindi?",
    options: [
      "English, because English words are longer",
      "Hindi, by roughly two to three times",
      "They cost the same — meaning is what is measured",
    ],
    answer: 1,
    because:
      "Measured above: 8 tokens in English against 20 in Hindi for the same sentence. Merge tables are built mostly from English text, so other scripts get chopped much finer.",
  },
  {
    prompt: "A context window of 128,000 is a limit on what, exactly?",
    options: [
      "Words",
      "Characters",
      "Tokens — which is why the same limit holds different amounts of text in different languages",
    ],
    answer: 2,
    because:
      "Context limits, pricing and rate limits are all counted in tokens. That is why a document in Japanese fills a context window far faster than the same document in English.",
  },
];

export default function TokensLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Beat
        kind="look"
        title="A token is a chunk, not a word"
        standfirst={
          <>
            <p>
              A language model never sees letters and never sees words. Before
              anything else happens, your text is cut into tokens &mdash; chunks
              of characters that the tokenizer learned to treat as single units
              because they turned up together often enough to be worth
              memorising.
            </p>
            <p>
              Common words survive whole. Rare ones shatter. And the cutting
              happens the same way every time, which means you can watch it.
            </p>
          </>
        }
      >
        <TokenCostChart rows={TOKEN_EXAMPLES.multilingual} />
      </Beat>

      <Beat
        kind="try"
        title="Cut up your own sentence"
        standfirst={
          <p>
            This is the real merge table, running in your browser. Type a
            question you would actually ask an AI, then try your name, an emoji,
            a long number, a word in another language.
          </p>
        }
      >
        <div className="plate p-5 md:p-6">
          <LiveTokenizer
            initialText="Why can't you count the r's in strawberry?"
            rows={3}
          />
        </div>

        <h3 className="display-md mt-12 mb-3">Six splits worth noticing</h3>
        <p className="prose-measure text-ink-soft mb-6">
          Each of these breaks an assumption people usually hold about tokens.
        </p>
        <TokenCuriosities items={TOKEN_EXAMPLES.curiosities} />
      </Beat>

      <Beat
        kind="check"
        title="Guess the count"
        standfirst={
          <p>
            Commit to a number before you see the answer. Being wrong here is
            the fastest way to stop thinking of tokens as words.
          </p>
        }
      >
        <TokenGuessGame items={TOKEN_EXAMPLES.guessable} />

        <h3 className="display-md mt-12 mb-5">Four questions</h3>
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </Beat>

      <Beat
        kind="use"
        title="What this changes for you"
        standfirst={
          <p>
            Tokens are not trivia. They are the unit everything else is priced
            and limited in.
          </p>
        }
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            {
              heading: "Don't ask a model to count letters",
              body: "Spelling, letter counts, reversing a word, counting syllables — all of it asks the model to see inside chunks it was never given. Use a calculator, a script, or ask it to write code that does the counting.",
            },
            {
              heading: "Budget in tokens, not words",
              body: "API pricing, rate limits and context windows are all counted in tokens. A rough English rule is about four characters per token, but check rather than assume — code and numbers run denser, and other scripts run much finer.",
            },
            {
              heading: "Working in another language costs more",
              body: "The same document in Hindi, Kannada or Japanese uses two to eight times the tokens of its English version. That is real money and a real context limit, not a rounding error.",
            },
            {
              heading: "Typos cost you twice",
              body: "A misspelled word fragments into pieces the model has rarely seen together, so it costs more tokens and gives the model less to work with. Clean prompts are cheaper and clearer.",
            },
          ].map((item) => (
            <li key={item.heading} className="plate p-5">
              <h4 className="font-display mb-2 text-lg font-bold">
                {item.heading}
              </h4>
              <p className="text-ink-soft text-[0.9375rem]">{item.body}</p>
            </li>
          ))}
        </ul>
      </Beat>
    </LessonShell>
  );
}
