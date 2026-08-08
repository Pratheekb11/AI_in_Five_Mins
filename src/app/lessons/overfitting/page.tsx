import { PickTheModel } from "@/components/games/PickTheModel";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { OverfitFigure } from "@/components/machines/OverfitFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("overfitting")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Alice's Adventures in Wonderland",
    publisher: "Lewis Carroll, Project Gutenberg ebook 11",
    url: "https://www.gutenberg.org/ebooks/11",
    used: "The 140 sentences every dot on this page comes from. Thirty are fitted; the rest are held out.",
    licence: "Public domain",
  },
  {
    title: "The Elements of Statistical Learning, second edition",
    publisher: "Hastie, Tibshirani & Friedman (Springer, 2009)",
    url: "https://hastie.su.domains/ElemStatLearn/",
    used: "Chapter 7 on the bias and variance trade: why error on new data falls and then rises as a model gains freedom, and why the turning point moves with the amount of data.",
  },
  {
    title: "Reconciling modern machine learning practice and the bias-variance trade-off",
    publisher: "Belkin, Hsu, Ma & Mandal (arXiv:1812.11118, 2018)",
    url: "https://arxiv.org/abs/1812.11118",
    used: "The caveat this page ends on: with very large models the curve can turn back down again, which is why the U is a rule of thumb rather than a law.",
  },
];

const STEPS: Step[] = [
  {
    say: "Thirty real sentences, each one a dot: how many characters it has, and how many tokens it came to. There is a relationship in here, and it looks close to a straight line.",
  },
  {
    say: "So fit a straight line. It misses most of the dots by a little, which feels like a failure and is not. Its error on sentences it has never seen is 2.34, and nothing on this page will beat that by much.",
  },
  {
    say: "Now allow it to bend. It reaches for the dots, and its error on them falls. That is guaranteed: more freedom can always fit the examples better. The question is whether the bends mean anything.",
  },
  {
    say: "Keep going and it threads its way through nearly all of them. Error on the sentences it fitted is the lowest of the whole page. Then look at what it does at the right hand edge, where it has least to go on: it leaves the top of the chart entirely, predicting 343 tokens for a 250 character sentence.",
  },
  {
    say: "Here are the sentences it never saw. One of them, 230 characters long, it misses by 110 tokens. Its error out here is 11.24, five times worse than the straight line it had just beaten on the training data.",
  },
  {
    say: "That is the shape of it. Error on what you fitted falls forever. Error on everything else falls, bottoms out and then climbs. Where the bottom sits depends on how much data you had, which is why the game changed its answer when the sample changed.",
    caption:
      "Blue only ever falls. Pink is the one that matters, and it turns upward after degree 1 on this sample of thirty.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "choice",
    prompt:
      "Your model scores better on training data every time you make it bigger. What does that tell you?",
    options: [
      "That the bigger model has genuinely found more of the structure that is really there in the data",
      "Nothing yet. More freedom always fits the examples better, whether the extra structure is real or not",
      "That the smaller model was badly built, since a well-built one would not have been beaten so easily",
    ],
    answer: 1,
    because:
      "It is guaranteed by the arithmetic and so carries no information. A degree eleven curve fitted thirty sentences better than a straight line did, and was five times worse on the sentences that mattered. The only test that means anything is on data the model has never seen.",
  },
  {
    kind: "sort",
    prompt: "Which way does each of these push?",
    buckets: [
      { id: "more", label: "Lets you afford more model", hint: "the bend can be justified" },
      { id: "less", label: "Means you can afford less", hint: "keep it simple" },
      { id: "neither", label: "Neither, on its own", hint: "no information about capacity" },
    ],
    items: [
      { id: "data", text: "Ten times as many examples", bucket: "more" },
      { id: "clean", text: "Much less noise in the measurements", bucket: "more" },
      { id: "tiny", text: "Only eight examples in total", bucket: "less" },
      { id: "noisy", text: "Labels that are often wrong", bucket: "less" },
      { id: "train", text: "A lower error on the training data", bucket: "neither" },
      { id: "fast", text: "A faster computer", bucket: "neither" },
    ],
    because:
      "Capacity is something you can afford, and what pays for it is evidence. More examples and cleaner measurements buy you the right to claim a real bend. A lower training error buys nothing at all, since it is what extra capacity produces by definition, and hardware buys nothing either: a bigger model trained faster on eight examples is still fantasy, computed quickly.",
  },
];

export default function OverfittingLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            The curve that fitted the data best was{" "}
            <span className="text-pink-text">five times worse</span> on
            everything else.
          </>
        }
        sting="It passes through nearly every one of the thirty sentences it was given, and its error on the hundred and ten it was not is 11.24 against a straight line's 2.34. Nothing about the training data warns you. Four rounds, real fits, and you choose the one to ship."
        cta="Choose a curve"
      />

      <div className="py-4">
        <PickTheModel />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<OverfitFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Why does more freedom always fit the data better?"
          summary="Because a bigger model can do everything a smaller one can, plus more. It is arithmetic, not skill."
        >
          <p>
            A degree three curve can be a straight line, by setting its extra
            coefficients to zero. So it can never do worse on the training data
            than the straight line, and it will usually do slightly better by
            bending towards whatever accidents are in that particular sample.
          </p>
          <p>
            Which means the training error is not measuring the model. It is
            measuring how much freedom you gave it. That is why the blue curve
            in the figure only falls, and why a report showing you nothing but
            that curve tells you nothing.
          </p>
          <p>
            Hastie and colleagues frame the trade underneath it: a model too
            simple is systematically wrong in the same way every time, and a
            model too free swings around with whichever examples it happened to
            get. You are choosing which error to have.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Is a simpler model always safer, then?"
          summary="No. The straight line here would be too simple on data with a real bend in it, and the U can even turn back down."
        >
          <p>
            Underfitting is a real failure too, and the game showed it: with a
            hundred and ten sentences, the cubic was the better choice. The
            bottom of the U moves right as you get more data, because with more
            evidence a bend can be justified rather than imagined.
          </p>
          <p>
            The honest rule is not simplicity. It is that capacity is something
            you have to be able to afford, and what pays for it is examples.
          </p>
          <p>
            One caveat worth carrying, since it is why modern models seem to
            break the rule. Belkin and colleagues showed that pushing capacity
            far past the point of fitting the training data perfectly can make
            error on new data fall again, a second descent. The U is a reliable
            picture of the region most people work in, not a law of nature.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Halve the training data and look again"
          watchFor="How much the model's conclusions change. Anything that survives being retrained on half the data was probably in the data. Anything that reverses was in the sample."
        >
          <p>
            Take any model or analysis somebody near you relies on. Ask for it
            to be rerun on half the examples, chosen at random, and compare the
            two results.
          </p>
          <p>
            If nobody can rerun it, that is the more useful finding.
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
