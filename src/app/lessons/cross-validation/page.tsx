import { OneFoldOrTen } from "@/components/games/OneFoldOrTen";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { FoldsFigure } from "@/components/machines/FoldsFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("cross-validation")!;

export const metadata = lessonMetadata(lesson);

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "The 5,574 messages, cut into ten blocks. Every accuracy on this page is a separate training run scored on the block it did not see.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title:
      "A Study of Cross-Validation and Bootstrap for Accuracy Estimation and Model Selection",
    publisher: "Ron Kohavi (IJCAI 1995)",
    url: "https://ai.stanford.edu/~ronnyk/accEst.pdf",
    used: "The paper that settled ten folds as the usual answer, and the reasoning about the trade between bias and variance in the estimate itself.",
  },
  {
    title: "The Elements of Statistical Learning, second edition",
    publisher: "Hastie, Tibshirani & Friedman (Springer, 2009)",
    url: "https://hastie.su.domains/ElemStatLearn/",
    used: "Chapter 7 on cross-validation, and the warning about selecting a model with the same data you then quote a score from.",
  },
];

const STEPS: Step[] = [
  {
    say: "Hold out one block of messages, train on the other nine, and score. That is the number everybody reports, and this is what it looks like: one dot.",
  },
  {
    say: "Now hold out a different block instead. Same model, same corpus, same procedure. The number has moved. Neither of these two is more correct than the other, and either could have been the one in the report.",
  },
  {
    say: "So let every block take its turn. Ten trainings, ten scores. None of them is the accuracy of the model. Together they are something more useful: an idea of how much this number wobbles.",
  },
  {
    say: "The average is 98.87 per cent and the slices sit about half a point either side. Which means any comparison between two models closer together than that cannot be settled by a single split, and in this chapter's game you will be shown some that are.",
  },
  {
    say: "Now look at a model that was shown only eighty examples. Its wobble is four times bigger. Too little training data does not only make a model worse. It makes every measurement of it shakier at the same time.",
  },
  {
    say: "Which gives you one question to ask of any accuracy anybody quotes. How much would it move if the data had been cut differently? If nobody knows, the number has no error bar and should not be used to choose between things.",
    caption:
      "Ten folds is the usual answer, and Kohavi's is the paper that made it usual.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "choice",
    prompt:
      "Model A scores 97.3% and model B scores 97.1%, each on its own single split. What follows?",
    options: [
      "Model A is better, though only slightly, and the difference is too small to be worth acting on",
      "Nothing yet. That gap is smaller than the wobble between splits, so either could be ahead",
      "Model B is likely better, because a lower score on a single split usually means less overfitting",
    ],
    answer: 1,
    because:
      "On this corpus the slice-to-slice spread is around half a point even for the strongest model, and two tenths of a point sits well inside it. You saw pairs where the fold in front of you pointed at the loser. To separate models that close you need every slice, or more data, or both.",
  },
  {
    kind: "sort",
    prompt: "Which of these make a measured accuracy shakier?",
    buckets: [
      { id: "shaky", label: "Makes it shakier", hint: "the number moves more" },
      { id: "steady", label: "Makes it steadier", hint: "the number settles" },
      { id: "neither", label: "Neither", hint: "no effect on the wobble" },
    ],
    items: [
      { id: "small-test", text: "A smaller held-out set", bucket: "shaky" },
      { id: "small-train", text: "Much less training data", bucket: "shaky" },
      { id: "rare", text: "A very rare class", bucket: "shaky" },
      {
        id: "folds",
        text: "Averaging over ten folds instead of one split",
        bucket: "steady",
      },
      {
        id: "more",
        text: "Ten times as many examples in total",
        bucket: "steady",
      },
      {
        id: "rename",
        text: "Renaming the model in the report",
        bucket: "neither",
      },
    ],
    because:
      "Everything that reduces how much evidence a single score rests on makes it move more: a small test set, a starved model, or a class so rare that a handful of cases decides the result. Averaging over folds does not make the model better, it makes your knowledge of it steadier, which is a different and quieter kind of progress.",
  },
];

export default function CrossValidationLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Same model, same messages, and the score moves by{" "}
            <span className="text-pink-text">a point and a half</span>.
          </>
        }
        sting="Nothing changed except which slice of the data was held out. On close comparisons that wobble is bigger than the gap you are trying to measure, so the single number in the report picks the wrong winner. You get one slice. Call it anyway."
        cta="See the first slice"
      />

      <div className="py-4">
        <OneFoldOrTen />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<FoldsFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Why ten folds, and not two, or a hundred?"
          summary="Because it is the cheapest count that keeps both kinds of error small, which is roughly what Kohavi found."
        >
          <p>
            Two folds means every model trains on only half the data, so the
            scores come out pessimistic. A hundred folds means a hundred
            trainings for very little extra steadiness, and each held-out block
            is so small that individual scores are wild even though their
            average is fine.
          </p>
          <p>
            Kohavi tested this directly and ten came out as the practical answer
            for datasets of ordinary size. It is a convention with a reason
            behind it rather than a law, and for very small datasets people go
            further and hold out one example at a time.
          </p>
          <p>
            The cost is real: ten folds means training ten times. That is
            nothing here and it is a serious decision when a training run takes
            a week, which is why large models are usually judged on a single
            held-out set and quoted with more caution than they deserve.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Can I use cross-validation to choose the model and then report its score?"
          summary="Not the same score. Choosing with a number spends it, and what you have left is an optimistic estimate."
        >
          <p>
            If you try twenty models and keep the one with the best
            cross-validated accuracy, that best score is partly a measure of
            which model got lucky across those folds. Report it and you are
            quoting a maximum of twenty draws as though it were a typical one.
          </p>
          <p>
            The standard fix is a third slice that is never used for choosing:
            train, tune against a validation set or by cross-validation, and
            only at the very end score once on a test set that has been
            untouched. Hastie and colleagues are blunt about how often this is
            got wrong in practice.
          </p>
          <p>
            The same trap in a smaller form is on this page: the folds here are
            reused across seven models, which is fine for showing the spread and
            would not be fine for declaring a winner and quoting its number.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Ask for the error bar"
          watchFor="Whether the gap between the option somebody is recommending and the one they rejected is bigger than the wobble. Very often nobody has checked, and the recommendation rests on noise."
        >
          <p>
            Next time somebody shows you a model comparison, ask two questions.
            How many times was each of these measured, and how much did the
            number move between runs?
          </p>
          <p>
            If the answer is once, ask what it would take to run it five times.
            Usually it is an afternoon.
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
