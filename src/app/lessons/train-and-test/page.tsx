import { Holdout } from "@/components/games/Holdout";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { HoldoutFigure } from "@/components/machines/HoldoutFigure";
import type { CheckBeat } from "@/lib/check";
import { start as dealSplit, type SplitData } from "@/lib/game/split";
import { getLesson } from "@/lib/lessons";
import { readGameData } from "@/lib/server/gameData";
import type { Source } from "@/lib/sources";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("train-and-test")!;

export const metadata = lessonMetadata(lesson);

const splitData = readGameData<SplitData>("split.json");
const initialScene = dealSplit(
  splitData,
  Array.from({ length: 40 }, () => Math.random()),
);

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "The 5,574 real messages every model on this page is trained and scored on, split 80/20 with the same seed the rest of the site uses.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title: "Rules of Machine Learning: Best Practices for ML Engineering",
    publisher: "Martin Zinkevich, Google",
    url: "https://developers.google.com/machine-learning/guides/rules-of-ml",
    used: "A practitioner's account of measuring models on data they have not seen, and of how easily a team fools itself when it does not.",
  },
  {
    title: "The Elements of Statistical Learning, second edition",
    publisher: "Hastie, Tibshirani & Friedman (Springer, 2009)",
    url: "https://hastie.su.domains/ElemStatLearn/",
    used: "Chapter 7 on model assessment: why training error is an optimistic estimate of what happens next, and how much more optimistic it gets as a model gains capacity to memorise.",
  },
];

const STEPS: Step[] = [
  {
    say: "Here is every message you have, in one heap. Hand all of it to a model and you have lost the ability to find out what it knows, because every question you could ask it, it has already been given the answer to.",
  },
  {
    say: "So put a wall through it. Four in every five go left, and the model may study those as long as it likes. The rest are locked away and nobody looks at them, not once, until the end.",
  },
  {
    say: "Now a model that cheats. It keeps every training message and its answer in a list. In the room it studied, it is perfect. A hundred per cent, no mistakes. Look at the other room.",
  },
  {
    say: "And a model that actually learned something. It is fractionally worse in the study room than the cheat was, and it is nine points better where it counts. The two rooms now nearly agree, which is the shape you want.",
  },
  {
    say: "One more, and this one is the opposite failure. Both rooms agree perfectly, and both are bad. It was shown fifty messages, which is not enough to learn from. A small gap does not mean a good model. It only means an honest one.",
  },
  {
    say: "So a training score is not a result. It is what somebody scored on their own homework, and the only number worth anything is the one from the locked room. Any accuracy quoted at you without saying which data it came from is not a number at all.",
    caption:
      "Ten models, same rooms, same split. The two that scored a perfect hundred are the two that memorised.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "match",
    prompt: "Match each pair of scores to what it tells you.",
    pairs: [
      {
        left: "100% studying, 89% locked room",
        right: "It memorised, and learned nothing that travels",
      },
      {
        left: "99% studying, 99% locked room",
        right: "It learned something that holds up",
      },
      {
        left: "89% studying, 89% locked room",
        right: "Honest, and not good enough. Show it more",
      },
    ],
    because:
      "The gap and the level are two different things and both matter. A big gap means the model learned the data rather than the pattern. No gap says nothing on its own: a model that flags nothing at all has no gap either, and is useless. You want the locked-room score high and the gap small, in that order.",
  },
  {
    kind: "choice",
    prompt:
      "A colleague reports 100% accuracy on a new model. What is the first thing to ask?",
    options: [
      "Which algorithm did you use, since some are much more prone to producing results like that one",
      "Which data was that measured on, and had the model seen it before",
      "How long did it take to train, because a fast result is usually a shallow one",
    ],
    answer: 1,
    because:
      "A hundred per cent on data the model was trained on is not an achievement, it is the definition of memorising, and you saw a lookup table do exactly that here. The algorithm barely matters to that question. What matters is whether the number came from data the model had never seen.",
  },
];

export default function TrainAndTestLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            The two models that scored a perfect hundred are the two that{" "}
            <span className="text-pink-text">learned nothing</span>.
          </>
        }
        sting="One keeps a list of every message it was shown. The other copies whichever message looks most like the new one. Both are flawless on their own training data, and one of them collapses by eleven points the moment it meets a message it has not seen. You are shown only the training scores. Call it."
        cta="Open the envelope"
      />

      <div className="py-4">
        <Holdout initialData={splitData} initialScene={initialScene} />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<HoldoutFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Why is the training score always flattering?"
          summary="Because the model was allowed to adjust itself until it fitted that particular data, including its accidents."
        >
          <p>
            Any dataset contains the pattern you want plus a great deal of
            accident: a word that happens to appear in three spam messages and
            nowhere else, a length that happens to correlate. A model with
            enough capacity will fit both, because nothing in the training tells
            them apart.
          </p>
          <p>
            Hastie and colleagues put this precisely: training error is an
            optimistic estimate of error on new data, and the gap grows with how
            much freedom the model had. The lookup table on this page is the
            extreme case, with enough freedom to fit every accident and no
            ability to do anything else.
          </p>
          <p>
            Which is why the locked room has to be locked before you start. A
            test set you have peeked at, tuned against and re-run twenty times
            is a training set wearing a different hat.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Why eighty and twenty, and does it matter?"
          summary="Because the test set has to be big enough to trust and small enough that you still have data to learn from."
        >
          <p>
            The split here is 80/20, which puts 1,115 messages in the locked
            room. That is enough that an accuracy measured on it is not mostly
            noise, and it still leaves 4,459 to learn from.
          </p>
          <p>
            Make the test set too small and the score swings wildly depending on
            which messages happened to land in it. Make it too big and the model
            is starved. There is no correct answer, only a trade, and the next
            module measures how much the answer moves when you change where the
            wall goes.
          </p>
          <p>
            One thing that is not a trade: the split has to be random. Sorting
            by date, or by anything correlated with the label, and putting the
            tail in the test set gives you a number about a different problem
            than the one you have.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Ask where the number came from"
          watchFor="Whether anybody can tell you how many examples the reported score was measured on. If the answer is vague, or the test set was used repeatedly to pick between versions, the number is closer to a training score than anyone involved thinks."
        >
          <p>
            Find a model somebody in your organisation actually relies on, or a
            vendor claim about one. Ask two questions: what data was the
            headline accuracy measured on, and had the model been trained on any
            of it.
          </p>
          <p>Then ask when that test data was last replaced.</p>
        </PracticeCard>
      </DeeperRow>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Check slug={lesson.slug} beats={CHECK} />
      </div>
    </LessonShell>
  );
}
