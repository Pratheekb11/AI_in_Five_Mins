import { WorthTheCrowd } from "@/components/games/WorthTheCrowd";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { ForestFigure } from "@/components/machines/ForestFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("ensembles")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "Every tree, vote and accuracy on this page, on the same seeded 80/20 split the rest of the site uses.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title: "Random Forests",
    publisher: "Leo Breiman, Machine Learning 45(1), 2001",
    url: "https://link.springer.com/article/10.1023/A:1010933404324",
    used: "The two sources of disagreement this page builds on: a different sample for each tree, and a random subset of features at each split.",
  },
  {
    title: "Bagging Predictors",
    publisher: "Leo Breiman, Machine Learning 24(2), 1996",
    url: "https://link.springer.com/article/10.1007/BF00058655",
    used: "Why voting helps most for models that are unstable, and barely at all for models that are not.",
  },
];

const STEPS: Step[] = [
  {
    say: "One tree, four questions deep, grown on its own sample of the training messages. It gets a bit under 97 per cent on messages it has never seen. Respectable, and not remarkable.",
  },
  {
    say: "Now sixty of them. Each got its own sample of the messages and, at every split, only four of the twelve questions chosen at random. They land all over: the best gets 97.9 per cent and the worst 95.4.",
  },
  {
    say: "Here is one message, and how the sixty voted on it. Thirty four called it spam and twenty six did not. A single tree could never tell you that. A vote can, and a close vote is a model admitting it is not sure.",
  },
  {
    say: "And here is the vote's accuracy as trees are added. It passes the average single tree within a handful of them and settles above every dot on the row above. Nothing was made better. Sixty different sets of mistakes cancelled.",
  },
  {
    say: "Which is the condition, and here it is failing. This forest has no randomness in it, so its sixty trees are the same tree sixty times. The line is flat. A vote among identical opinions returns that opinion.",
  },
  {
    say: "Try all four. The forest that gained most is made of the worst trees, the one-question stumps, and the forest that gained nothing is made of the best. What a vote buys is independence, and you have to build it in on purpose.",
    caption:
      "Breiman's two sources of independence: a different sample per tree, and a random subset of features at each split.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "choice",
    prompt:
      "Sixty stumps at 93.3% each vote to 95.9%. Sixty identical deep trees at 97.9% vote to 97.9%. Why?",
    options: [
      "Because stumps are simpler, and simpler models always combine more effectively than complex ones",
      "Because the stumps make different mistakes and the identical trees make the same ones",
      "Because sixty stumps together have more total capacity than sixty deep trees do",
    ],
    answer: 1,
    because:
      "A majority vote can only fix a message that some of the voters get right. If every model gets the same messages wrong, the vote gets them wrong too, however good each model is. The stumps disagree on 5.5% of messages and the identical trees on none, and that number predicts the gain better than any measure of quality does.",
  },
  {
    kind: "sort",
    prompt: "Which of these adds real independence to an ensemble?",
    buckets: [
      { id: "yes", label: "Adds independence", hint: "the models will differ" },
      { id: "no", label: "Adds none", hint: "same model, again" },
    ],
    items: [
      { id: "sample", text: "Give each model its own random sample of the data", bucket: "yes" },
      { id: "features", text: "Let each split choose from a random subset of features", bucket: "yes" },
      { id: "kinds", text: "Use a tree, a logistic model and a rule set together", bucket: "yes" },
      { id: "copies", text: "Train the same model sixty times on the same data", bucket: "no" },
      { id: "rename", text: "Give the copies different names", bucket: "no" },
      { id: "average", text: "Average sixty copies of one model's predictions", bucket: "no" },
    ],
    because:
      "Independence has to come from somewhere: different data, different questions available, or a genuinely different kind of model. Copying a deterministic model produces copies, and averaging copies returns the original. This sounds obvious written down, and teams still ship ensembles of near-identical models and wonder why the gain never arrives.",
  },
];

export default function EnsemblesLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Sixty of the <span className="text-pink-text">worst</span> models
            gained the most. Sixty of the best gained nothing.
          </>
        }
        sting="The stumps score 93.3% each and vote to 95.9%. The identical deep trees score 97.9% each and vote to 97.9%. What a crowd buys is not quality, it is disagreement, and one of these forests has none. Four forests, and you call what the vote is worth."
        cta="Meet the first forest"
      />

      <div className="py-4">
        <WorthTheCrowd />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<ForestFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Why does averaging mistakes help at all?"
          summary="Because independent mistakes land in different places, and a majority only needs most voters to be right on each item."
        >
          <p>
            Suppose each tree is wrong on a different tenth of the messages. On
            any given message, most trees are right, so the majority is right,
            even though every tree is flawed. The vote is wrong only where the
            errors happen to pile up on the same message.
          </p>
          <p>
            Which is why the arithmetic collapses the moment the errors stop
            being independent. If all sixty are wrong on the same tenth, the vote
            is wrong on that tenth too. Breiman&rsquo;s 1996 paper puts the
            condition plainly: bagging helps unstable models, and does little for
            stable ones.
          </p>
          <p>
            It is also why trees are the classic ingredient. The previous module
            ended on their instability, which reads as a weakness on its own and
            turns out to be exactly the property that makes them worth growing
            sixty of.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="What does an ensemble cost?"
          summary="Sixty times the work, and the explanation. You cannot read a forest out loud."
        >
          <p>
            The tree in the previous module fitted on an index card and could be
            recited to the person it affected. Sixty trees cannot, and no amount
            of tooling makes a vote across sixty paths into a reason. That trade
            is the real one, and it is usually decided by whether anybody has to
            justify the output.
          </p>
          <p>
            The other cost is plain compute: sixty trainings and sixty
            predictions per answer. That is nothing here and it is a budget line
            at scale.
          </p>
          <p>
            What you get back, besides accuracy, is the vote split itself. A
            34-to-26 vote is a genuine measure of the model&rsquo;s own
            uncertainty, arrived at differently from the probability in the
            logistic module, and often more honest.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Check whether your models disagree"
          watchFor="How often two of them give different answers to the same input. If it is close to never, the ensemble is decorative and you are paying for it."
        >
          <p>
            If anybody near you runs an ensemble, ask for the disagreement rate
            between its members on real inputs. Not their accuracies. How often
            they differ from each other.
          </p>
          <p>
            Then ask where the independence was supposed to come from.
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
