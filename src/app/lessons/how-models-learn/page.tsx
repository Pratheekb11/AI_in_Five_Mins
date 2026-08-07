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
    used: "The origin of stepping toward an answer using noisy estimates. It is the ancestor of the procedure this page runs.",
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
    say: "Notice what it never had. It could not see the shape of the hill. It only knew whether the ground under its feet sloped up or down. Every model you have heard of is trained by feeling for the slope in the dark.",
  },
  {
    say: `And notice what came out. About ${REGRESSION.best.charsPerToken} characters per token. Nobody wrote that number down; it fell out of the measurements. Feed it different text and it settles somewhere else.`,
  },
  {
    say: "Which is the sentence to keep from this page. A model's answers are downstream of the examples it was shown. Always, with no exceptions, at every scale.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: `Training settled on about ${REGRESSION.best.charsPerToken} characters per token. What is that number?`,
    options: [
      "A constant that was programmed in before training, the same for any text you use",
      "A fact discovered from the sentences, which would come out differently for different text",
      "An arbitrary value with no real meaning, chosen because it made the numbers work out",
    ],
    answer: 1,
    because:
      "Nobody wrote it down. It came out of the measurements, and it is specific to English prose. As you saw with tokens, the same procedure on Hindi or Japanese text would settle somewhere quite different.",
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
        sting={`One dial, ${REGRESSION.sampleSize} real sentences, and no view of the hill. All you get is whether the ground under your feet slopes up or down. Find the bottom by hand first. It is harder than it looks, and then you get to hand it over.`}
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
            surface nobody can picture. The procedure does not care, because
            it never looks at the whole surface anyway. At each step it
            asks one question per dial: if I nudge this one, does the error go
            up or down? Then it nudges them all a little, in the answer&rsquo;s
            direction.
          </p>
          <p>
            Rumelhart, Hinton and Williams gave that its efficient form in 1986
            by working the slope backwards through a network, so that all the
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
            stops on a date. It is not because anyone chose to freeze it.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="It means some numbers got adjusted. The model is a formula with dials in it; training shows it examples, measures how wrong it is, and turns each dial a little in whichever direction makes it less wrong. Do that a few million times and the dials end up in positions that fit the examples well. Nothing was memorised and nothing was understood. The examples are gone, and only their effect on the dials is left."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Find out what your assistant was shown"
          watchFor="Whether it can tell you its own cut-off, and whether it hedges about it. It has no way to check the date from the inside. Anything it says about now is a guess dressed up as a fact."
        >
          <p>
            Ask an assistant when its training data ends. Then ask it about
            something that happened after that date and watch what it does with
            the gap.
          </p>
          <p>
            Then ask it something where the answer depends on which text it was
            trained on. A regional spelling, a contested date, or a term used
            differently in different fields.
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
