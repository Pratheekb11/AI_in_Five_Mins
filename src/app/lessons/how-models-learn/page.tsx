import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { GradientHill } from "@/components/machines/GradientHill";
import { REGRESSION } from "@/lib/datasets";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("how-models-learn")!;
const video = videoFor("how-models-learn")!;

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

const STEPS: Step[] = [
  {
    say: "A model is a formula with adjustable numbers in it. That is the whole of what the word means. The one you just used had a single dial; a large language model has hundreds of billions of them.",
    caption: "tokens = dial × characters. One number to set, and nobody told it the answer.",
  },
  {
    say: "Training is four steps on a loop. Measure how wrong you are. Work out which way is downhill. Take a small step. Do it again until stepping stops helping.",
  },
  {
    say: "Notice what it never had. It could not see the shape of the hill — only whether the ground under its feet slopes up or down. Every model you have heard of is trained by feeling for the slope in the dark.",
  },
  {
    say: `And notice what came out. About ${REGRESSION.best.charsPerToken} characters per token. Nobody wrote that number down; it fell out of the measurements. Feed it different text and it settles somewhere else.`,
  },
  {
    say: "Which is the sentence to keep from this page. A model's answers are downstream of the examples it was shown — always, with no exceptions, at every scale.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "What is a model, concretely?",
    options: [
      "A very large database of answers, searched whenever a question comes in",
      "A formula with adjustable numbers in it",
      "A program that searches the internet and summarises whatever it finds there",
    ],
    answer: 1,
    because:
      "The one on this page is tokens = slope × characters, with a single adjustable number. A large language model is the same idea with hundreds of billions of them. Nothing is stored and looked up; the numbers are the model.",
  },
  {
    prompt: "What does 'training' actually do?",
    options: [
      "It stores every training example it was shown, so that any of them can be recalled later",
      "It repeatedly nudges the numbers in whichever direction reduces the error",
      "It writes new rules for itself, based on what a researcher noticed while watching it work",
    ],
    answer: 1,
    because:
      "Exactly what you watched: measure how wrong you are, work out which way is downhill, take a small step, repeat. The examples are not kept — only their effect on the numbers.",
  },
  {
    prompt: "You set the step size to 'Reckless' and the error exploded. Why?",
    options: [
      "The data was corrupted, so every error it measured along the way was meaningless from the start",
      "Each step jumped past the bottom and landed further up the other side, so corrections got bigger instead of smaller",
      "The model ran out of fresh examples to learn from, and started going round the ones it already had again",
    ],
    answer: 1,
    because:
      "Step size is the one setting that has to be tuned by hand. Too small and training takes forever; too large and it diverges. This is why training big models is expensive and fiddly, not just slow.",
  },
  {
    prompt: `Training settled on about ${REGRESSION.best.charsPerToken} characters per token. What is that number?`,
    options: [
      "A constant that was programmed in before training, the same for any text you use",
      "A fact discovered from the sentences, which would come out differently for different text",
      "An arbitrary value with no real meaning, chosen because it made the numbers work out",
    ],
    answer: 1,
    because:
      "Nobody wrote it down. It came out of the measurements, and it is specific to English prose — as you saw with tokens, the same procedure on Hindi or Japanese text would settle somewhere quite different.",
  },
];

export default function HowModelsLearnLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Learning, in every AI system ever built, is{" "}
            <span className="text-teal-text">rolling downhill in the dark</span>
            .
          </>
        }
        sting={`One dial, ${REGRESSION.sampleSize} real sentences, and no view of the hill — only whether the ground under your feet slopes up or down. Find the bottom by hand first. It is harder than it looks, and then you get to hand it over.`}
        cta="Take the wheel"
      />

      <div className="py-4">
        <GradientHill />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
      </div>

      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="Where do the billions of dials come from?"
          summary="Same procedure, more numbers. The step is worked out for every dial at once."
        >
          <p>
            One dial makes a hill you could draw. A hundred billion dials make a
            surface nobody can picture &mdash; but the procedure does not care,
            because it never looks at the whole surface anyway. At each step it
            asks one question per dial: if I nudge this one, does the error go
            up or down? Then it nudges them all a little, in the answer&rsquo;s
            direction.
          </p>
          <p>
            Rumelhart, Hinton and Williams gave that its efficient form in 1986
            &mdash; working the slope backwards through a network so all the
            dials get their answer in one pass. Everything since has been the
            same idea with more arithmetic behind it.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="If nothing is stored, why does it seem to know things?"
          summary="Because the examples changed the numbers. The effect survives; the examples do not."
          deeper="what-an-llm-is"
        >
          <p>
            A trained model does not contain its training data. It contains
            numbers that data pushed into shape. That single fact explains the
            behaviour that annoys people most: there is no source inside it to
            check an answer against, so a plausible wrong answer and a correct
            one are produced by exactly the same machinery.
          </p>
          <p>
            It also explains the training cut-off. Absorbing anything new means
            running this whole procedure again over the whole corpus, which
            costs real money and time. That is why a model&rsquo;s knowledge
            stops on a date &mdash; not because anyone chose to freeze it.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="It means some numbers got adjusted. The model is a formula with dials in it; training shows it examples, measures how wrong it is, and turns each dial a little in whichever direction makes it less wrong. Do that a few million times and the dials end up in positions that fit the examples well. Nothing was memorised and nothing was understood — the examples are gone, and only their effect on the dials is left."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Find out what your assistant was shown"
          watchFor="Whether it can tell you its own cut-off, and whether it hedges about it. It has no way to check the date from the inside — anything it says about now is a guess dressed as a fact."
        >
          <p>
            Ask an assistant when its training data ends. Then ask it about
            something that happened after that date and watch what it does with
            the gap.
          </p>
          <p>
            Then ask it something where the answer depends on which text it was
            trained on &mdash; a regional spelling, a contested date, a term
            used differently in different fields.
          </p>
        </PracticeCard>
      </div>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </div>
    </LessonShell>
  );
}
