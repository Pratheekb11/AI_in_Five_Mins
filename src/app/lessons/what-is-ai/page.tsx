import { Beat } from "@/components/lesson/Beat";
import { LessonShell } from "@/components/lesson/LessonShell";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { RuleBench } from "@/components/machines/RuleBench";
import { SPAM_BENCH } from "@/lib/datasets";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("what-is-ai")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "All 5,574 real messages behind every figure on this page, and the held-out split both the rules and the model are scored on.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title:
      "Contributions to the Study of SMS Spam Filtering: New Collection and Results",
    publisher: "Almeida, Gómez Hidalgo & Yamakami (ACM DOCENG 2011)",
    url: "https://dl.acm.org/doi/10.1145/2034691.2034742",
    used: "The paper describing how the corpus was collected, and published baselines for it.",
  },
  {
    title: "Some Studies in Machine Learning Using the Game of Checkers",
    publisher: "Arthur Samuel, IBM Journal (1959)",
    url: "https://ieeexplore.ieee.org/document/5392560",
    used: "The origin of the framing this lesson uses: programs that improve from experience rather than from instructions.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "What separates 'AI' from ordinary software?",
    options: [
      "It is written in a different programming language",
      "Its behaviour comes from patterns found in examples, rather than from rules a person wrote",
      "It runs on more powerful computers",
    ],
    answer: 1,
    because:
      "Ordinary software does exactly what someone specified. A learned model was never told what to look for — it was shown labelled examples and worked out the pattern itself. That is the whole distinction.",
  },
  {
    prompt:
      "A spam filter reports 86% accuracy. Should you be impressed?",
    options: [
      "Yes — that catches most spam",
      "No — flagging nothing at all scores about that, because most messages are not spam",
      "There is no way to tell without knowing the programming language",
    ],
    answer: 1,
    because:
      `You saw this above: doing nothing scores ${(SPAM_BENCH.baseline.accuracy * 100).toFixed(1)}%. When one answer is far more common than the other, accuracy flatters useless models. Look at what was caught and what was wrongly flagged instead.`,
  },
  {
    prompt: "Why do hand-written rules struggle in the long run?",
    options: [
      "They are too slow to run",
      "Somebody has to think of every rule, and spam changes as soon as the rules are known",
      "Computers cannot process if-statements reliably",
    ],
    answer: 1,
    because:
      "Rules only cover cases their author imagined. A model retrained on new examples picks up new patterns without anybody writing them down — which matters most when the thing you are filtering is actively trying to get past you.",
  },
  {
    prompt: "What did the model actually get given?",
    options: [
      "A list of suspicious words written by researchers",
      `${SPAM_BENCH.learned.trainSize.toLocaleString()} messages, each marked spam or not spam, and nothing else`,
      "Access to the internet to look up known spam",
    ],
    answer: 1,
    because:
      "Just labelled examples. Every pattern it uses — including that shortcodes matter more than the word 'free' — it found on its own by counting which words showed up in which kind of message.",
  },
];

export default function WhatIsAiLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Beat
        kind="look"
        title="Two ways to make a decision"
        standfirst={
          <>
            <p>
              Almost all software works by following rules a person wrote. If
              the message contains &ldquo;free&rdquo;, flag it. That approach
              built most of the computing you use, and it has one requirement:
              somebody has to know the rule in advance.
            </p>
            <p>
              What people call AI is the other approach. Instead of being told
              the rule, the program is shown thousands of examples with the
              answer attached, and works out the pattern itself. Everything else
              &mdash; tokens, embeddings, transformers &mdash; is machinery in
              service of that one idea.
            </p>
            <p>
              So let&rsquo;s do both, on the same problem, and count.
            </p>
          </>
        }
      >
        <div className="plate bg-paper-sunk p-5 md:p-6">
          <p className="label text-ink-faint mb-3">The job</p>
          <p className="prose-measure text-ink-soft">
            Sort {SPAM_BENCH.corpus.total.toLocaleString()} real text messages
            into spam and not-spam. {SPAM_BENCH.corpus.spam} of them are spam.
            They are genuine messages collected for research &mdash; the
            clumsy punctuation and the shortcodes are exactly as they arrived.
          </p>
        </div>
      </Beat>

      <Beat
        kind="try"
        title="Write the filter yourself"
        standfirst={
          <p>
            Pick your rules. Every number updates against messages held back
            from the model as well, so whatever you build is judged the same way
            it was.
          </p>
        }
      >
        <RuleBench />

        <h3 className="display-md mt-12 mb-3">Messages worth reading</h3>
        <p className="prose-measure text-ink-soft mb-6">
          A filter is only as good as its hardest cases. These are real messages
          from the corpus &mdash; three obvious spams, three that slip past
          almost every rule, three ordinary messages that trip several, and three
          that stay clean.
        </p>
        <ul className="grid gap-3 md:grid-cols-2">
          {SPAM_BENCH.examples.map((example, i) => (
            <li
              key={i}
              className={`plate-flush p-4 ${
                example.spam ? "bg-pink-wash" : "bg-paper-raised"
              }`}
            >
              <p className="label mb-2">
                <span
                  className={example.spam ? "text-pink-text" : "text-teal-text"}
                >
                  {example.spam ? "Spam" : "Ordinary"}
                </span>
              </p>
              <p className="text-[0.9375rem] break-words">{example.body}</p>
            </li>
          ))}
        </ul>
      </Beat>

      <Beat kind="check" title="Four questions">
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </Beat>

      <Beat
        kind="use"
        title="What this changes for you"
        standfirst={
          <p>
            You now have the one distinction that makes every other AI story
            readable.
          </p>
        }
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            {
              heading: "Ask what it learned from",
              body: "A model is its training data. When someone describes what an AI can do, the useful question is what examples it saw — that determines what it is good at, and what it quietly inherits.",
            },
            {
              heading: "Distrust a lone accuracy figure",
              body: "Accuracy hides the errors that matter when one answer is more common than the other. Ask what it missed and what it wrongly flagged — those two numbers trade against each other, and which one hurts depends on the job.",
            },
            {
              heading: "Learning does not mean understanding",
              body: "The classifier has no idea what spam is. It counted which words appear in which kind of message. That is enough to be useful and nowhere near enough to be trusted unsupervised.",
            },
            {
              heading: "Rules still win sometimes",
              body: "Hand-written rules got within about a point here, and they are auditable, instant, and free to run. Reaching for a model is a choice with costs, not an automatic upgrade.",
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
