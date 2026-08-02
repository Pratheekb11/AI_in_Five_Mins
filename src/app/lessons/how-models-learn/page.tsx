import { Beat } from "@/components/lesson/Beat";
import { LessonShell } from "@/components/lesson/LessonShell";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { GradientHill } from "@/components/machines/GradientHill";
import { REGRESSION } from "@/lib/datasets";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("how-models-learn")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Alice's Adventures in Wonderland",
    publisher: "Lewis Carroll, via Project Gutenberg",
    url: "https://www.gutenberg.org/ebooks/11",
    used: `The ${REGRESSION.sampleSize} sentences measured on this page. Gutenberg header and licence text excluded before sampling.`,
    licence: "Public domain",
  },
  {
    title: "A Stochastic Approximation Method",
    publisher: "Robbins & Monro, Annals of Mathematical Statistics (1951)",
    url: "https://projecteuclid.org/journals/annals-of-mathematical-statistics/volume-22/issue-3/A-Stochastic-Approximation-Method/10.1214/aoms/1177729586.full",
    used: "The origin of stepping toward an answer using noisy estimates — the ancestor of the procedure this page runs.",
  },
  {
    title: "Learning representations by back-propagating errors",
    publisher: "Rumelhart, Hinton & Williams, Nature (1986)",
    url: "https://www.nature.com/articles/323533a0",
    used: "How the same downhill step is applied to models with millions of dials instead of one.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "What is a model, concretely?",
    options: [
      "A very large database of answers",
      "A formula with adjustable numbers in it",
      "A program that searches the internet",
    ],
    answer: 1,
    because:
      "The one on this page is tokens = slope × characters, with a single adjustable number. A large language model is the same idea with hundreds of billions of them. Nothing is stored and looked up; the numbers are the model.",
  },
  {
    prompt: "What does 'training' actually do?",
    options: [
      "It stores the training examples so they can be recalled later",
      "It repeatedly nudges the numbers in whichever direction reduces the error",
      "It writes new rules based on what a researcher observed",
    ],
    answer: 1,
    because:
      "Exactly what you watched: measure how wrong you are, work out which way is downhill, take a small step, repeat. The examples are not kept — only their effect on the numbers.",
  },
  {
    prompt: "You set the step size to 'Reckless' and the error exploded. Why?",
    options: [
      "The data was corrupted",
      "Each step jumped past the bottom and landed further up the other side, so corrections got bigger instead of smaller",
      "The model ran out of examples",
    ],
    answer: 1,
    because:
      "Step size is the one setting that has to be tuned by hand. Too small and training takes forever; too large and it diverges. This is why training big models is expensive and fiddly, not just slow.",
  },
  {
    prompt:
      `Training settled on about ${REGRESSION.best.charsPerToken} characters per token. What is that number?`,
    options: [
      "A constant that was programmed in",
      "A fact discovered from the sentences, which would come out differently for different text",
      "An arbitrary value with no meaning",
    ],
    answer: 1,
    because:
      "Nobody wrote it down. It came out of the measurements, and it is specific to English prose — as you saw with tokens, the same procedure on Hindi or Japanese text would settle somewhere quite different.",
  },
];

export default function HowModelsLearnLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Beat
        kind="look"
        title="A model is a formula with dials on it"
        standfirst={
          <>
            <p>
              Lesson 1 said a model finds patterns in examples instead of being
              told rules. This is what that looks like from the inside, and it is
              less mysterious than it sounds.
            </p>
            <p>
              Start with a formula that has an adjustable number in it. Measure
              how wrong it is on real data. Nudge the number in whichever
              direction makes it less wrong. Repeat until nudging stops helping.
              That is training &mdash; all of it.
            </p>
            <p>
              The model below has exactly one dial, so you can watch the whole
              thing at once. GPT&#8209;class models run the identical procedure
              on hundreds of billions of dials, which is a difference of scale
              and cost, not of idea.
            </p>
          </>
        }
      >
        <div className="plate bg-paper-sunk p-5 md:p-6">
          <p className="label text-ink-faint mb-3">The formula</p>
          <p className="font-data mb-4 text-lg">
            tokens = <span className="text-pink-text">dial</span> &times;
            characters
          </p>
          <p className="prose-measure text-ink-soft text-sm">
            One dial to set. The data is {REGRESSION.sampleSize} sentences from{" "}
            {REGRESSION.source.title}, each measured for how many characters it
            has and how many tokens it actually costs. Nobody has told the model
            what the answer is.
          </p>
        </div>
      </Beat>

      <Beat
        kind="try"
        title="Turn the dial, then hand it over"
        standfirst={
          <p>
            Find the best setting by hand first &mdash; it is harder than it
            looks. Then press <strong>Let it learn</strong> and watch it do the
            same search without ever seeing the shape of the hill.
          </p>
        }
      >
        <GradientHill />
      </Beat>

      <Beat kind="check" title="Four questions">
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </Beat>

      <Beat
        kind="use"
        title="What this changes for you"
        standfirst={<p>Training is a procedure, and procedures have costs.</p>}
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            {
              heading: "Nothing is looked up",
              body: "A trained model does not contain its training examples. It contains numbers those examples pushed into shape. That is why a model can produce something plausible and wrong with total confidence — there is no source to check against.",
            },
            {
              heading: "Training is expensive for a boring reason",
              body: "Every step needs the error measured across the data, and there are billions of dials. That is the whole bill: arithmetic, repeated. It also explains why models have a training cut-off — retraining is not free.",
            },
            {
              heading: "The settings matter as much as the data",
              body: "You just made training fail by changing one number. Real training has dozens of such settings. When a lab says a model was hard to train, this is usually what they mean.",
            },
            {
              heading: "The answer depends on the examples",
              body: `Your dial settled on ${REGRESSION.best.charsPerToken} characters per token because that is true of this book. Feed it different text and it settles somewhere else. A model's answers are downstream of what it was shown — always.`,
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
