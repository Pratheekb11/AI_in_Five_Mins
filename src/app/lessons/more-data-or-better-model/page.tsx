import { BuyTheUpgrade } from "@/components/games/BuyTheUpgrade";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { CurveFigure } from "@/components/machines/CurveFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("more-data-or-better-model")!;

export const metadata = lessonMetadata(lesson);

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "Every point on every curve here, on the same seeded split the rest of the site uses.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title:
      "Scaling to Very Very Large Corpora for Natural Language Disambiguation",
    publisher: "Banko & Brill (ACL 2001)",
    url: "https://aclanthology.org/P01-1005/",
    used: "The paper this argument usually gets quoted from: four learning algorithms whose ranking changes as the training data grows by orders of magnitude.",
  },
  {
    title: "Rules of Machine Learning: Best Practices for ML Engineering",
    publisher: "Martin Zinkevich, Google",
    url: "https://developers.google.com/machine-learning/guides/rules-of-ml",
    used: "The practical ordering: features and data first, model sophistication later, and a heuristic baseline before either.",
  },
];

const STEPS: Step[] = [
  {
    say: "Start with the line that ignores the data completely. One hand-written rule, flag anything with five digits in a row, and it scores 96.8 per cent no matter how many training messages you have. It is a flat line, and everything else has to earn its way up to it.",
  },
  {
    say: "Here is a small decision tree learning. With twenty examples it is thirteen points worse than the rule somebody wrote in ten seconds. It needs about a hundred before it catches up, and this is a model with only twelve questions in it.",
  },
  {
    say: "Now the same twelve features, learned differently. It is ahead of the rule from the very start and stays ahead everywhere. Same data, same features, and a better use of both.",
  },
  {
    say: "And now the model with the most to learn: every word in the vocabulary. At twenty examples it is seven points behind a single hand-written rule, because there is far too much for it to work out from far too little.",
  },
  {
    say: "Then it crosses everything. By two thousand examples it is ahead of the lot, and on the full set it is the best model on this page. The model that needs the most data is the wrong choice until you have the data, and then it is the right one.",
  },
  {
    say: "So the argument about data against models has an answer with a location in it. Ten times the data is worth thirteen points at the left of this picture and a sixth of a point at the right. Neither side of that argument is wrong. They are standing in different places.",
    caption:
      "Banko and Brill made the same point in 2001, over three orders of magnitude of training data.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "choice",
    prompt:
      "A team has 80 labelled examples and their model is disappointing. What should they do first?",
    options: [
      "Try a more sophisticated model, since the simple one has clearly reached the limit of what it can do",
      "Get more labelled examples, because at this size that is worth far more than any model choice",
      "Tune the model they have more carefully, as the settings are usually where the last few points hide",
    ],
    answer: 1,
    because:
      "At the left of the curve, every learned model is mostly guessing and no amount of sophistication rescues it. On this corpus, going from twenty examples to two hundred was worth thirteen points and picking a better model at twenty was worth about the same. Both beat tuning, which at that size is fitting noise.",
  },
  {
    kind: "sort",
    prompt:
      "You are told an accuracy. Which of these do you need to know before it means anything?",
    buckets: [
      {
        id: "need",
        label: "Need to know",
        hint: "changes what the number means",
      },
      {
        id: "nice",
        label: "Useful, not essential",
        hint: "context, not meaning",
      },
    ],
    items: [
      { id: "which", text: "Which data it was measured on", bucket: "need" },
      {
        id: "baseline",
        text: "What doing nothing would score",
        bucket: "need",
      },
      {
        id: "howmuch",
        text: "How many examples it was trained on",
        bucket: "need",
      },
      {
        id: "spread",
        text: "How much it moves between splits",
        bucket: "need",
      },
      { id: "name", text: "Which algorithm it is", bucket: "nice" },
      { id: "hardware", text: "How long it took to train", bucket: "nice" },
    ],
    because:
      "That is the whole track in one list. Held-out or not, against what baseline, on how much data, and with how much wobble. The algorithm's name is the thing everybody leads with and the least informative item here, which is why this track spent nine modules on the other four.",
  },
];

export default function MoreDataOrBetterModelLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            The best model on this page starts out{" "}
            <span className="text-pink-text">worse than one rule</span> anybody
            could write.
          </>
        }
        sting="At twenty examples, learning from every word in the vocabulary scores 89.4% and a hand-written rule scores 96.8%. At four and a half thousand examples the same model is the best thing here. Same corpus, same measurements. Four budgets, and you choose what to spend them on."
        cta="Take the first budget"
      />

      <div className="py-4">
        <BuyTheUpgrade />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<CurveFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Why do the curves flatten?"
          summary="Because each new example teaches less than the one before it, until they are mostly repeating what the model already knows."
        >
          <p>
            The first hundred messages tell a model roughly what spam looks
            like. The next thousand refine the edges. Somewhere past that most
            of what arrives is a variation on something already seen, and the
            curve bends towards whatever ceiling the features and the model
            allow.
          </p>
          <p>
            Which is why the honest question is never whether more data helps.
            It is what the next tenfold is worth, and the curve you have already
            measured is the only thing that can tell you.
          </p>
          <p>
            Note the ceilings differ. The rule is capped at 96.8 per cent
            forever, and the word model is still climbing gently at the right
            edge. The flattening is a property of the pair, not of the data
            alone.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Is this not just the old more-data-beats-better-algorithms slogan?"
          summary="Half of it. The slogan is true on the left of the curve and quietly false on the right."
        >
          <p>
            Banko and Brill&rsquo;s result in 2001 is the one usually cited:
            over three orders of magnitude of training data, the ranking between
            algorithms changed, and the worst algorithm with the most data beat
            the best algorithm with the least. That is what the crossing on this
            page is.
          </p>
          <p>
            What gets dropped in the retelling is the other half. Once you are
            on the flat part, another tenfold buys almost nothing and the model
            choice is worth several times as much. Both halves are visible here
            in one picture, which is the reason to draw it rather than argue
            about it.
          </p>
          <p>
            Zinkevich&rsquo;s ordering is the practical version: a heuristic
            baseline first, then features and data, then sophistication. The
            flat dashed line on this figure is what a heuristic baseline looks
            like, and it beat two real models for the first hundred examples.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Draw your own curve before you buy anything"
          watchFor="Whether the last doubling of data moved the number more or less than the last change of model. That comparison, on your own data, settles an argument that otherwise runs on opinions."
        >
          <p>
            Take any model somebody near you relies on and retrain it on a
            tenth, a quarter, a half and all of the data. Four runs, one
            afternoon, one chart.
          </p>
          <p>
            Then decide what to spend the next month on, with the chart in front
            of you.
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
