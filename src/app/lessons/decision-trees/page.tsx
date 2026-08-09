import { GrowTheTree } from "@/components/games/GrowTheTree";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { TreeFigure } from "@/components/machines/TreeFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("decision-trees")!;

export const metadata = lessonMetadata(lesson);

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "Every pile, count and gain on this page, on the same seeded 80/20 split the rest of the site uses.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title: "Induction of Decision Trees",
    publisher: "J. R. Quinlan, Machine Learning 1(1), 1986",
    url: "https://link.springer.com/article/10.1007/BF00116251",
    used: "The algorithm this page runs: choose the split with the highest information gain, recurse, and stop when a pile is pure or too small.",
  },
  {
    title: "The Elements of Statistical Learning, second edition",
    publisher: "Hastie, Tibshirani & Friedman (Springer, 2009)",
    url: "https://hastie.su.domains/ElemStatLearn/",
    used: "Chapter 9 on trees: their instability, why greedy growth is not optimal, and why pruning exists.",
  },
];

const STEPS: Step[] = [
  {
    say: "One pile of 4,459 training messages, about one in seven of them spam. A tree does exactly what the first module of this track did, and then does it again to whatever it produces.",
  },
  {
    say: "So ask the best question. Has it got a five digit number in it? That was the sharpest of the twelve, worth 0.378 bits, and look at what happens to the colour. The yes pile is 99.6 per cent spam, and the no pile is down to 3 per cent.",
  },
  {
    say: "Now ask again, separately, on each of those piles. The best question for the ordinary pile is not the same as the best question for the suspicious one, and that is the whole advantage of a tree: the second question depends on the answer to the first.",
  },
  {
    say: "A third level. The piles are getting small and pure, and each one is a rule you could read out loud: if it has a five digit number, and mentions money, and is longer than 120 characters, call it spam.",
  },
  {
    say: "Four levels down there are eleven piles, and this whole model would fit on an index card. Nothing in it is hidden. Every decision it makes can be traced back through three or four yes-or-no questions to the messages that produced them.",
  },
  {
    say: "And here is what depth is worth. Accuracy on held-out messages climbs to depth five and then flattens rather than collapsing. With only twelve questions to draw on there is a limit to how much it can memorise, which is a reminder that capacity comes from the features as much as from the model.",
    caption:
      "Quinlan's algorithm, unchanged since 1986: pick the split with the most information gain, then recurse.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "sort",
    prompt: "Which of these is a tree good for, and which not?",
    buckets: [
      { id: "good", label: "A good fit", hint: "plays to what a tree is" },
      {
        id: "bad",
        label: "A poor fit",
        hint: "something else would do better",
      },
      {
        id: "depends",
        label: "Depends on the features",
        hint: "not about the model",
      },
    ],
    items: [
      {
        id: "explain",
        text: "A decision somebody must justify to a regulator",
        bucket: "good",
      },
      {
        id: "mixed",
        text: "Data mixing categories, numbers and missing values",
        bucket: "good",
      },
      {
        id: "diagonal",
        text: "A boundary that runs diagonally across two features",
        bucket: "bad",
      },
      {
        id: "smooth",
        text: "Predicting a smoothly varying quantity",
        bucket: "bad",
      },
      {
        id: "accuracy",
        text: "Getting the highest possible accuracy",
        bucket: "depends",
      },
      {
        id: "speed",
        text: "Explaining one particular prediction quickly",
        bucket: "good",
      },
    ],
    because:
      "A tree cuts along one feature at a time, so it draws staircases. A diagonal boundary takes it dozens of splits to approximate, and a smooth quantity comes out as steps. What it gives you in exchange is a model made of readable rules that handles awkward mixed data without complaint, and a straight answer to why did it decide that.",
  },
  {
    kind: "choice",
    prompt:
      "The tree picked the best question at every node. Does that give the best possible tree?",
    options: [
      "Yes, since choosing the best split each time necessarily builds the best overall sequence of splits",
      "No. A worse first question can leave two piles that are much easier to split afterwards",
      "Yes, but only when every feature is a yes-or-no question, as they are here",
    ],
    answer: 1,
    because:
      "Growing greedily is a shortcut, and a good one: the alternative is searching an impossible number of trees. But a locally best split can lead somewhere worse. This is why the tree you get is not the smallest possible tree that fits, and why small changes to the data can rearrange it completely.",
  },
];

export default function DecisionTreesLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            One question, and the pile goes from{" "}
            <span className="text-pink-text">13% spam to 99.6%</span>.
          </>
        }
        sting="Has it got a five digit number in it? That single question splits 4,459 messages into 466 that are almost all spam and 3,993 that are almost all not. Then the tree asks again on each pile, and again, and the whole model ends up small enough to read out loud. Five nodes, and you choose the question."
        cta="Take the first split"
      />

      <div className="py-4">
        <GrowTheTree />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<TreeFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Why is this the model people reach for when it has to be explained?"
          summary="Because the model and its explanation are the same object. There is nothing else to translate."
        >
          <p>
            Every other model on this track answers &ldquo;why&rdquo; with a
            weight, a probability or a distance. A tree answers with the path a
            message took, in the words the features were written in, and that
            path is not a story told afterwards. It is the computation.
          </p>
          <p>
            Which is why trees turn up wherever a decision has to be defended:
            credit, benefits, triage. The trade is usually accuracy. The
            word-based model earlier in this track beats this tree, and it
            cannot tell anybody why it refused them.
          </p>
          <p>
            One honest caveat. Readability collapses with depth. A tree twenty
            levels deep is not an explanation, it is a program, and people who
            claim their model is interpretable because it is a tree rarely
            mention its depth.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Why are trees called unstable?"
          summary="Because the first split decides everything after it, and the first split can flip on a handful of examples."
        >
          <p>
            If two questions are nearly tied at the root, a few different
            training messages can swap them, and the entire tree underneath is
            then grown on a different pile. The result is not a slightly
            different model. It is a different model that happens to score about
            the same.
          </p>
          <p>
            Hastie and colleagues treat this as the defining weakness of trees,
            and it is the reason the next module exists. If a single tree
            wobbles that much, grow a great many of them on slightly different
            data and let them vote, and the wobble largely cancels.
          </p>
          <p>
            You can feel it in the game: several nodes have two candidates
            within a few hundredths of a bit. Those are the nodes where the tree
            you were shown is one of several equally reasonable trees.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Read a decision path out loud"
          watchFor="Whether the path is a reason or just a route. If the questions are things like feature_47 above 0.31, the tree is readable in principle and useless in practice, and that is a feature problem again."
        >
          <p>
            Find any rule-based or tree-based decision in your organisation, and
            trace one real case through it, out loud, in the words of the rules.
          </p>
          <p>
            Then ask whether the person affected would accept that as a reason.
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
