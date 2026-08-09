import { ReadTheScore } from "@/components/games/ReadTheScore";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { LogisticFigure } from "@/components/machines/LogisticFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("logistic-regression")!;

export const metadata = lessonMetadata(lesson);

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "Every dot and every message on this page, split 80/20 with the same seed the rest of the site uses.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title: "The Elements of Statistical Learning, second edition",
    publisher: "Hastie, Tibshirani & Friedman (Springer, 2009)",
    url: "https://hastie.su.domains/ElemStatLearn/",
    used: "Chapter 4 on logistic regression: the linear boundary, the logistic function that turns distance into probability, and why it is fitted by likelihood rather than by squared error.",
  },
  {
    title: "Rules of Machine Learning: Best Practices for ML Engineering",
    publisher: "Martin Zinkevich, Google",
    url: "https://developers.google.com/machine-learning/guides/rules-of-ml",
    used: "The advice this page ends on: start with a simple model you can inspect, and be sure the plumbing works before reaching for anything cleverer.",
  },
];

const STEPS: Step[] = [
  {
    say: "Every held-out message, placed by two numbers you can read off it yourself: how long it is, and how many digits it contains. Spam is mostly up and to the right. Nothing has been trained yet.",
  },
  {
    say: "A model with two features is a straight line through that picture. Here it is before training, which is to say in the wrong place, because it was started at nothing and told to find its own way.",
  },
  {
    say: "Now let it learn. It is the same downhill step from the second chapter of the rabbit hole: measure how wrong you are, work out which way is down, take a small step. The line swings, and the accuracy underneath climbs with it.",
  },
  {
    say: "It settles at 96.8 per cent on messages it never saw, from two numbers. Which is worse than the word-based model earlier in this track, and far better than nothing, and the only model in the whole site that fits on a page.",
  },
  {
    say: "Then the second half of the idea. The line alone gives a yes or a no. Logistic regression measures how far you are from it and pushes that through this curve, so a message on the line gets fifty per cent and everything else runs quickly towards nought or one.",
  },
  {
    say: "Scrub back through the run if you like. Nothing about that boundary was designed. It is where four hundred small corrections left a line, and its position is a summary of five thousand real messages.",
    caption:
      "Two features so the whole model can be drawn. A bag of words does better and cannot be put on a page.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "match",
    prompt: "Match each part of the model to what it does.",
    pairs: [
      {
        left: "The weights",
        right:
          "Set which way the boundary tilts, and how much each feature counts",
      },
      {
        left: "The bias",
        right: "Slides the whole boundary across without turning it",
      },
      {
        left: "The logistic curve",
        right: "Turns distance from the boundary into a probability",
      },
      {
        left: "The threshold",
        right:
          "Turns that probability back into a decision, and is your choice",
      },
    ],
    because:
      "A model like this has two separable parts, and people run them together. The weights and bias place a line, which is what training decides. The curve converts position into confidence. The threshold, from two chapters ago, converts confidence into action, and it is not the model's business at all.",
  },
  {
    kind: "choice",
    prompt:
      "The digit weight came out at 3.47 and the length weight at 0.30. What does that tell you?",
    options: [
      "That digits matter about eleven times as much as length, in the standardised units both were measured in",
      "That a message with three digits is eleven times more likely to be spam than a long message is",
      "That length is irrelevant here and could be removed with no effect on the model at all",
    ],
    answer: 0,
    because:
      "Weights are comparable only because both features were standardised first, which is exactly why that step matters. Raw, one is measured in characters and the other in digits, and the numbers would not be comparable at all. And a weight is not a likelihood ratio: it says how much the boundary tilts, not how much more likely anything is.",
  },
];

export default function LogisticRegressionLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Two numbers per message, one line, and{" "}
            <span className="text-teal-text">96.8%</span> of them sorted right.
          </>
        }
        sting="How long it is, and how many digits it has. That is everything this model knows, which means the whole of it fits on a page and you can watch it train. Six real messages, and you say how sure it will be about each one."
        cta="Read the first one"
      />

      <div className="py-4">
        <ReadTheScore />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<LogisticFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Why put the answer through a curve at all?"
          summary="Because a probability has to sit between nought and one, and a straight line does not."
        >
          <p>
            The line gives a number that runs off to infinity in both
            directions, which is fine for saying which side you are on and
            useless as a probability. The logistic curve squashes that whole
            range into nought to one, steeply near the boundary and almost flat
            far from it.
          </p>
          <p>
            That shape is doing something honest. A message far into spam
            territory does not become twice as spam if you double its distance;
            it is already as certain as the model can be. The flattening is the
            model refusing to overstate.
          </p>
          <p>
            It also gives training something to work with. Hastie and colleagues
            set out why these models are fitted by likelihood rather than
            squared error: with the curve in place, being confidently wrong
            costs enormously more than being unsure, which is the incentive you
            want.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Is a straight boundary not a serious limitation?"
          summary="Yes, and it is a good default anyway. Most of the value in a model is usually in the features, not the shape of its boundary."
        >
          <p>
            A straight line cannot capture a rule like &ldquo;spam is either
            very short or very long&rdquo;. Feed it that pattern and it will
            fail, and no amount of training fixes it.
          </p>
          <p>
            The usual answer is not a fancier model but a better feature. Add a
            column for how far the length is from typical and the same straight
            line handles it, which is the first module of this track arriving
            again from a different direction.
          </p>
          <p>
            Zinkevich&rsquo;s advice from inside Google is worth repeating here:
            start with something simple, get the plumbing right, and prefer a
            model whose mistakes you can look at. This one you can literally
            look at.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Plot two features and look"
          watchFor="Whether a straight line could separate the two colours at all. If it obviously could not, that is a feature problem, and reaching for a bigger model first will hide it rather than fix it."
        >
          <p>
            Take any two-column prediction problem near you and plot it: one
            feature across, one up, and colour by the answer. Five minutes in a
            spreadsheet is enough.
          </p>
          <p>
            Then ask whether the picture supports the model somebody wants to
            build on it.
          </p>
        </PracticeCard>
      </DeeperRow>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Check slug={lesson.slug} beats={CHECK} />
      </div>
    </LessonShell>
  );
}
